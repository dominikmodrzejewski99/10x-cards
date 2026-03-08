import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, from, map, catchError } from 'rxjs';
import { GenerateFlashcardsCommand, GenerationDTO, FlashcardProposalDTO, OpenRouterResponse } from '../../types';
import { OpenRouterService } from './openrouter.service';

@Injectable({
  providedIn: 'root'
})
export class GenerationApiService {
  private apiUrl = '/functions/v1'; // Stała ścieżka API zgodna z planem implementacji

  constructor(
    private http: HttpClient,
    private openRouterService: OpenRouterService
  ) { }

  /**
   * Generuje propozycje fiszek na podstawie dostarczonego tekstu
   * @param command Obiekt zawierający tekst źródłowy i opcjonalnie model AI do użycia
   * @returns Observable zawierający wygenerowane metadane generacji i propozycje fiszek
   */
  generateFlashcards(command: GenerateFlashcardsCommand): Observable<{
    generation: GenerationDTO,
    flashcards: FlashcardProposalDTO[]
  }> {
    // Używamy wyłącznie OpenRouter API do generowania fiszek
    return this.generateFlashcardsWithOpenRouter(command);
  }

  /**
   * Generuje propozycje fiszek przy użyciu OpenRouter
   * @param command Obiekt zawierający tekst źródłowy i opcjonalnie model AI do użycia
   * @returns Observable zawierający wygenerowane metadane generacji i propozycje fiszek
   */
  private generateFlashcardsWithOpenRouter(command: GenerateFlashcardsCommand): Observable<{
    generation: GenerationDTO,
    flashcards: FlashcardProposalDTO[]
  }> {
    const startTime = new Date();

    const prompt = `
Wygeneruj fiszki edukacyjne na podstawie poniższego tekstu.

WYMAGANIA:
1. Wygeneruj DOKŁADNIE 15 fiszek.
2. Odpowiedź MUSI być obiektem JSON z kluczem "flashcards" zawierającym tablicę fiszek.
3. Każda fiszka to obiekt z polami "front" (pytanie) i "back" (odpowiedź).
4. Fiszki powinny być zróżnicowane i obejmować najważniejsze informacje z tekstu.

Tekst źródłowy:
${command.text}

PRZYKŁAD POPRAWNEJ ODPOWIEDZI:
{"flashcards": [{"front": "Pytanie 1", "back": "Odpowiedź 1"}, {"front": "Pytanie 2", "back": "Odpowiedź 2"}]}
`;

    return from(this.openRouterService.sendMessage(prompt, undefined, {
      systemMessage: 'Jesteś asystentem tworzącym fiszki edukacyjne. Zawsze odpowiadaj WYŁĄCZNIE obiektem JSON w formacie: {"flashcards": [{"front": "pytanie", "back": "odpowiedź"}, ...]}. Wygeneruj dokładnie 15 fiszek. Nie dodawaj żadnego tekstu poza JSON.',
      temperature: 0.5,
      max_tokens: 4000,
      model: command.model || 'stepfun/step-3.5-flash:free',
      useJsonFormat: true
    })).pipe(
      map((response: string) => {
        // Parse the response string to JSON
        let parsedResponse: any;

        let flashcards: FlashcardProposalDTO[] = [];
        try {
          // Clean up the response string and parse it to JSON
          try {
            let cleanedResponse = response;

            cleanedResponse = cleanedResponse.replace(/```json\n?/g, '');
            cleanedResponse = cleanedResponse.replace(/```/g, '');
            cleanedResponse = cleanedResponse.trim();

            // Truncate at last complete object if response was cut off
            if (!cleanedResponse.endsWith(']') && !cleanedResponse.endsWith('}')) {
              const lastCloseBrace = cleanedResponse.lastIndexOf('}');
              if (lastCloseBrace > 0) {
                cleanedResponse = cleanedResponse.substring(0, lastCloseBrace + 1);
              }
            }

            // Try parsing as-is first
            try {
              parsedResponse = JSON.parse(cleanedResponse);
            } catch {
              // If it fails, try wrapping in array brackets
              if (!cleanedResponse.startsWith('[')) {
                cleanedResponse = '[' + cleanedResponse;
              }
              if (!cleanedResponse.endsWith(']')) {
                // Remove trailing comma before adding bracket
                cleanedResponse = cleanedResponse.replace(/,\s*$/, '') + ']';
              }
              parsedResponse = JSON.parse(cleanedResponse);
            }
          } catch (parseError) {
            console.error('Błąd parsowania JSON:', parseError);
            throw new Error('Nieprawidłowy format odpowiedzi JSON');
          }

          // Sprawdzamy, czy odpowiedź jest tablicą fiszek
          let flashcardArray: any[] | null = null;

          if (Array.isArray(parsedResponse)) {
            flashcardArray = parsedResponse;
          } else if (typeof parsedResponse === 'object' && parsedResponse !== null) {
            // Model mógł zwrócić obiekt z kluczem zawierającym tablicę
            const possibleArrayKey = Object.keys(parsedResponse).find(
              key => Array.isArray(parsedResponse[key])
            );
            if (possibleArrayKey) {
              flashcardArray = parsedResponse[possibleArrayKey];
            }
          }

          if (flashcardArray && flashcardArray.length > 0) {
            const seen = new Set<string>();
            flashcards = flashcardArray
              .filter((item: any) => {
                if (!item.front || !item.back) return false;
                const key = item.front.trim();
                if (seen.has(key)) return false;
                seen.add(key);
                return true;
              })
              .slice(0, 15)
              .map((item: any) => ({
                front: item.front,
                back: item.back,
                source: 'ai-full' as const
              }));
          } else {
            console.error('Odpowiedź nie zawiera oczekiwanej tablicy fiszek. Otrzymano:', parsedResponse);
          }
        } catch (error) {
          console.error('Błąd parsowania odpowiedzi JSON:', error);
          console.error('Treść odpowiedzi powodująca błąd:', response);
        }

        // Obliczenie czasu generacji
        const endTime = new Date();
        const generationDuration = (endTime.getTime() - startTime.getTime()) / 1000; // w sekundach

        // Utworzenie obiektu GenerationDTO
        const generation: GenerationDTO = {
          id: Date.now(), // Tymczasowe ID
          generated_count: flashcards.length,
          generation_duration: generationDuration,
          model: command.model || 'stepfun/step-3.5-flash:free',
          source_text_hash: this.hashString(command.text),
          source_text_length: command.text.length,
          accepted_edited_count: null,
          accepted_unedited_count: null,
          created_at: startTime.toISOString(),
          updated_at: endTime.toISOString(),
          user_id: 'local-user' // Tymczasowy user_id
        };

        return {
          generation,
          flashcards
        };
      })
    );
  }

  /**
   * Prosta funkcja hashująca dla tekstu
   * @param text Tekst do zahashowania
   * @returns Hash tekstu
   */
  private hashString(text: string): string {
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Konwersja do 32-bitowej liczby całkowitej
    }
    return hash.toString(16); // Konwersja do hex
  }
}
