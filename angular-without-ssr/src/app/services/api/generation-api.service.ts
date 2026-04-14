import { Injectable, inject } from '@angular/core';
import { Observable, from, map, switchMap } from 'rxjs';
import { GenerateFlashcardsCommand, GenerationDTO, FlashcardProposalDTO } from '../../../types';
import { OpenRouterService } from '../domain/openrouter.service';
import { LoggerService } from '../infrastructure/logger.service';
import { SupabaseClientFactory } from '../infrastructure/supabase-client.factory';

const MAX_FLASHCARDS = 15;
const MAX_TOKENS = 4000;
const DAILY_GENERATION_LIMIT = 5;

@Injectable({
  providedIn: 'root'
})
export class GenerationApiService {
  private logger: LoggerService = inject(LoggerService);
  private supabaseFactory: SupabaseClientFactory = inject(SupabaseClientFactory);

  constructor(private openRouterService: OpenRouterService) {}

  public getDailyGenerationCount(): Observable<number> {
    return from(this.getDailyCount());
  }

  public getDailyLimit(): number {
    return DAILY_GENERATION_LIMIT;
  }

  generateFlashcards(command: GenerateFlashcardsCommand): Observable<{
    generation: GenerationDTO,
    flashcards: FlashcardProposalDTO[]
  }> {
    return this.generateFlashcardsWithAI(command);
  }

  private generateFlashcardsWithAI(command: GenerateFlashcardsCommand): Observable<{
    generation: GenerationDTO,
    flashcards: FlashcardProposalDTO[]
  }> {
    const startTime = new Date();

    const prompt = `
Wygeneruj fiszki edukacyjne na podstawie poniższego tekstu.

WYMAGANIA:
1. Wygeneruj DOKŁADNIE ${MAX_FLASHCARDS} fiszek.
2. Odpowiedź MUSI być obiektem JSON z kluczem "flashcards" zawierającym tablicę fiszek.
3. Każda fiszka to obiekt z polami "front" (pytanie) i "back" (odpowiedź).
4. Fiszki powinny być zróżnicowane i obejmować najważniejsze informacje z tekstu.

Tekst źródłowy:
${command.text}

PRZYKŁAD POPRAWNEJ ODPOWIEDZI:
{"flashcards": [{"front": "Pytanie 1", "back": "Odpowiedź 1"}, {"front": "Pytanie 2", "back": "Odpowiedź 2"}]}
`;

    return from(this.openRouterService.sendMessage(prompt, undefined, {
      systemMessage: `Jesteś asystentem tworzącym fiszki edukacyjne. Zawsze odpowiadaj WYŁĄCZNIE obiektem JSON w formacie: {"flashcards": [{"front": "pytanie", "back": "odpowiedź"}, ...]}. Wygeneruj dokładnie ${MAX_FLASHCARDS} fiszek. Nie dodawaj żadnego tekstu poza JSON.`,
      temperature: 0.5,
      max_tokens: MAX_TOKENS,
      useJsonFormat: true
    })).pipe(
      map((response: string) => {
        let flashcards: FlashcardProposalDTO[] = [];
        try {
          let cleanedResponse = response;
          cleanedResponse = cleanedResponse.replace(/```json\n?/g, '');
          cleanedResponse = cleanedResponse.replace(/```/g, '');
          cleanedResponse = cleanedResponse.trim();

          let parsedResponse: unknown;
          try {
            parsedResponse = JSON.parse(cleanedResponse);
          } catch {
            parsedResponse = this.repairTruncatedJson(cleanedResponse);
          }

          let flashcardArray: Array<{ front?: string; back?: string }> | null = null;

          if (Array.isArray(parsedResponse)) {
            flashcardArray = parsedResponse;
          } else if (typeof parsedResponse === 'object' && parsedResponse !== null) {
            const obj = parsedResponse as Record<string, unknown>;
            const possibleArrayKey = Object.keys(obj).find(
              key => Array.isArray(obj[key])
            );
            if (possibleArrayKey) {
              flashcardArray = obj[possibleArrayKey] as Array<{ front?: string; back?: string }>;
            }
          }

          if (flashcardArray && flashcardArray.length > 0) {
            const seen = new Set<string>();
            flashcards = flashcardArray
              .filter((item) => {
                if (!item.front || !item.back) return false;
                const key = item.front.trim();
                if (seen.has(key)) return false;
                seen.add(key);
                return true;
              })
              .slice(0, MAX_FLASHCARDS)
              .map((item) => ({
                front: item.front!,
                back: item.back!,
                source: 'ai-full' as const
              }));
          }
        } catch (error) {
          this.logger.error('GenerationApiService.generateFlashcards', error);
        }

        if (flashcards.length === 0) {
          throw new Error('Nie udało się wygenerować fiszek. Model AI zwrócił niepoprawną odpowiedź. Spróbuj ponownie lub zmień tekst źródłowy.');
        }

        const endTime = new Date();
        const generationDuration = (endTime.getTime() - startTime.getTime()) / 1000;

        const generation: GenerationDTO = {
          id: Date.now(),
          generated_count: flashcards.length,
          generation_duration: generationDuration,
          model: this.openRouterService.defaultModel,
          source_text_hash: this.hashString(command.text),
          source_text_length: command.text.length,
          accepted_edited_count: null,
          accepted_unedited_count: null,
          created_at: startTime.toISOString(),
          updated_at: endTime.toISOString(),
          user_id: 'local-user'
        };

        return { generation, flashcards };
      }),
      switchMap((result) => from(this.saveGenerationRecord(result.generation)).pipe(
        map((savedGeneration: GenerationDTO) => ({
          generation: savedGeneration,
          flashcards: result.flashcards
        }))
      ))
    );
  }

  private async saveGenerationRecord(generation: GenerationDTO): Promise<GenerationDTO> {
    try {
      const supabase = this.supabaseFactory.getClient();
      const { data: sessionData } = await supabase.auth.getSession();
      const userId: string | undefined = sessionData?.session?.user?.id;

      if (!userId) {
        this.logger.warn('GenerationApiService.saveGeneration', 'No user session — skipping DB save');
        return generation;
      }

      const { data, error } = await supabase.rpc('insert_generation_with_limit', {
        p_user_id: userId,
        p_model: generation.model,
        p_generated_count: generation.generated_count,
        p_source_text_hash: generation.source_text_hash,
        p_generation_duration: Math.round(generation.generation_duration),
        p_source_text_length: generation.source_text_length,
        p_daily_limit: DAILY_GENERATION_LIMIT
      });

      if (error) {
        if (error.message?.includes('Daily generation limit reached')) {
          throw new Error(`Osiągnięto dzienny limit generacji (${DAILY_GENERATION_LIMIT}). Spróbuj ponownie jutro.`);
        }
        this.logger.error('GenerationApiService.saveGeneration', error);
        return generation;
      }

      const row = Array.isArray(data) ? data[0] : data;
      return { ...generation, id: row?.id ?? generation.id, user_id: userId };
    } catch (error) {
      if (error instanceof Error && error.message.includes('dzienny limit')) {
        throw error;
      }
      this.logger.error('GenerationApiService.saveGeneration', error);
      return generation;
    }
  }

  private async getDailyCount(): Promise<number> {
    try {
      const supabase = this.supabaseFactory.getClient();
      const { data: sessionData } = await supabase.auth.getSession();
      const userId: string | undefined = sessionData?.session?.user?.id;

      if (!userId) return 0;

      const { data, error } = await supabase.rpc('get_daily_generation_count', {
        p_user_id: userId
      });

      if (error) {
        this.logger.error('GenerationApiService.getDailyCount', error);
        return 0;
      }

      return (data as number) ?? 0;
    } catch (error) {
      this.logger.error('GenerationApiService.getDailyCount', error);
      return 0;
    }
  }

  private repairTruncatedJson(text: string): unknown {
    const lastCompleteObj = text.lastIndexOf('}');
    if (lastCompleteObj < 0) return null;

    let truncated = text.substring(0, lastCompleteObj + 1);

    let openBrackets = 0;
    let openBraces = 0;
    let inString = false;
    let escape = false;

    for (const ch of truncated) {
      if (escape) { escape = false; continue; }
      if (ch === '\\') { escape = true; continue; }
      if (ch === '"') { inString = !inString; continue; }
      if (inString) continue;
      if (ch === '[') openBrackets++;
      if (ch === ']') openBrackets--;
      if (ch === '{') openBraces++;
      if (ch === '}') openBraces--;
    }

    for (let i = 0; i < openBrackets; i++) truncated += ']';
    for (let i = 0; i < openBraces; i++) truncated += '}';

    try {
      return JSON.parse(truncated);
    } catch {
      const items: Array<{ front: string; back: string }> = [];
      const regex = /"front"\s*:\s*"((?:[^"\\]|\\.)*)"\s*,\s*"back"\s*:\s*"((?:[^"\\]|\\.)*)"/g;
      let match;
      while ((match = regex.exec(text)) !== null) {
        items.push({ front: match[1], back: match[2] });
      }
      return items.length > 0 ? { flashcards: items } : null;
    }
  }

  private hashString(text: string): string {
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16);
  }
}
