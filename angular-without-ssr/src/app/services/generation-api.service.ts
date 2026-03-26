import { Injectable, inject } from '@angular/core';
import { Observable, from, map } from 'rxjs';
import { GenerateFlashcardsCommand, GenerationDTO, FlashcardProposalDTO } from '../../types';
import { OpenRouterService } from './openrouter.service';
import { LoggerService } from './logger.service';

const MAX_FLASHCARDS = 15;
const MAX_TOKENS = 4000;

@Injectable({
  providedIn: 'root'
})
export class GenerationApiService {
  private logger: LoggerService = inject(LoggerService);

  constructor(private openRouterService: OpenRouterService) {}

  generateFlashcards(command: GenerateFlashcardsCommand): Observable<{
    generation: GenerationDTO,
    flashcards: FlashcardProposalDTO[]
  }> {
    return this.generateFlashcardsWithOpenRouter(command);
  }

  private generateFlashcardsWithOpenRouter(command: GenerateFlashcardsCommand): Observable<{
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
            // Truncated JSON — try to salvage by closing open structures
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
      })
    );
  }

  private repairTruncatedJson(text: string): unknown {
    // Find the last complete object in the array by locating last complete "back":"..."}
    const lastCompleteObj = text.lastIndexOf('}');
    if (lastCompleteObj < 0) return null;

    let truncated = text.substring(0, lastCompleteObj + 1);

    // Count open brackets/braces to close them
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

    // Close any unclosed structures
    for (let i = 0; i < openBrackets; i++) truncated += ']';
    for (let i = 0; i < openBraces; i++) truncated += '}';

    try {
      return JSON.parse(truncated);
    } catch {
      // Last resort: try to extract individual flashcard objects via regex
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
