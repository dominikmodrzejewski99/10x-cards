import { Injectable } from '@angular/core';
import { Observable, from, map } from 'rxjs';
import { GenerateFlashcardsCommand, GenerationDTO, FlashcardProposalDTO } from '../../types';
import { OpenRouterService } from './openrouter.service';

const DEFAULT_AI_MODEL = 'stepfun/step-3.5-flash:free';
const MAX_FLASHCARDS = 15;

@Injectable({
  providedIn: 'root'
})
export class GenerationApiService {
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
      max_tokens: 4000,
      model: command.model || DEFAULT_AI_MODEL,
      useJsonFormat: true
    })).pipe(
      map((response: string) => {
        let flashcards: FlashcardProposalDTO[] = [];
        try {
          let cleanedResponse = response;
          cleanedResponse = cleanedResponse.replace(/```json\n?/g, '');
          cleanedResponse = cleanedResponse.replace(/```/g, '');
          cleanedResponse = cleanedResponse.trim();

          if (!cleanedResponse.endsWith(']') && !cleanedResponse.endsWith('}')) {
            const lastCloseBrace = cleanedResponse.lastIndexOf('}');
            if (lastCloseBrace > 0) {
              cleanedResponse = cleanedResponse.substring(0, lastCloseBrace + 1);
            }
          }

          let parsedResponse: unknown;
          try {
            parsedResponse = JSON.parse(cleanedResponse);
          } catch {
            if (!cleanedResponse.startsWith('[')) {
              cleanedResponse = '[' + cleanedResponse;
            }
            if (!cleanedResponse.endsWith(']')) {
              cleanedResponse = cleanedResponse.replace(/,\s*$/, '') + ']';
            }
            parsedResponse = JSON.parse(cleanedResponse);
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
          console.error('Błąd parsowania odpowiedzi JSON:', error);
        }

        const endTime = new Date();
        const generationDuration = (endTime.getTime() - startTime.getTime()) / 1000;

        const generation: GenerationDTO = {
          id: Date.now(),
          generated_count: flashcards.length,
          generation_duration: generationDuration,
          model: command.model || DEFAULT_AI_MODEL,
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
