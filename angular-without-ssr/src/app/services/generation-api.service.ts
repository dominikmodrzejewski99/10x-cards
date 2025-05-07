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

    // Przygotowanie promptu dla modelu
    const prompt = `
    Twoim zadaniem jest wygenerowanie fiszek edukacyjnych na podstawie poniższego tekstu.
    Każda fiszka musi mieć dwa pola: "front" (pytanie lub pojęcie) i "back" (odpowiedź lub definicja).

    ABSOLUTNIE KLUCZOWE WYMAGANIA:
    1. Wygeneruj DOKŁADNIE 15 fiszek - ani mniej, ani więcej.
    2. Odpowiedź MUSI być w formacie tablicy JSON - musi zaczynać się od "[" i kończyć na "]".
    3. Każdy element tablicy musi być obiektem z polami "front" i "back".
    4. NIE dodawaj żadnych komentarzy, tekstu, cudzysłowów czy znaków markdown przed lub po tablicy JSON.
    5. Fiszki powinny obejmować różne aspekty tekstu i być zróżnicowane.
    6. Upewnij się, że generujesz różnorodne fiszki, które obejmują najważniejsze informacje z tekstu.

    Tekst źródłowy:
    ${command.text}

    PRZYKŁAD POPRAWNEJ ODPOWIEDZI (zwróć uwagę na format - odpowiedź zaczyna się od "[" i kończy na "]"):
    [
      {"front": "Pytanie 1", "back": "Odpowiedź 1"},
      {"front": "Pytanie 2", "back": "Odpowiedź 2"},
      {"front": "Pytanie 3", "back": "Odpowiedź 3"},
      {"front": "Pytanie 4", "back": "Odpowiedź 4"},
      {"front": "Pytanie 5", "back": "Odpowiedź 5"}
    ]

    PRZED ZAKOŃCZENIEM SPRAWDŹ:
    - Czy wygenerowałeś DOKŁADNIE 15 fiszek?
    - Czy Twoja odpowiedź zaczyna się od "[" i kończy na "]"?
    - Czy każda fiszka ma pola "front" i "back"?
    - Czy nie dodałeś żadnego tekstu przed lub po tablicy JSON?
    `;

    // Wywołanie OpenRouter z odpowiednimi opcjami
    return from(this.openRouterService.sendMessage(prompt, undefined, {
      systemMessage: 'Jesteś asystentem, który tworzy fiszki edukacyjne. Twoje odpowiedzi ZAWSZE muszą być w formacie JSON. Odpowiadaj wyłącznie TABLICĄ JSON obiektów z polami "front" i "back", bez żadnego dodatkowego tekstu. ZAWSZE generuj DOKŁADNIE 15 fiszek. Nigdy nie zwracaj pojedynczego obiektu, zawsze zwróć tablicę obiektów z DOKŁADNIE 15 elementami. Sprawdź dokładnie, czy wygenerowałeś 15 fiszek przed zwróceniem odpowiedzi. Twoja odpowiedź MUSI zaczynać się od "[" i kończyć na "]". Nie dodawaj żadnego tekstu przed ani po tablicy JSON.',
      temperature: 0.5,
      max_tokens: 4000,
      model: command.model || 'deepseek/deepseek-prover-v2:free',
      useJsonFormat: true
    })).pipe(
      map((response: string) => {
        // Parse the response string to JSON
        let parsedResponse: any;
        console.log('Odpowiedź z OpenRouter:', response);

        let flashcards: FlashcardProposalDTO[] = [];
        try {
          // Clean up the response string and parse it to JSON
          try {
            // Remove markdown code block markers and any other non-JSON text
            let cleanedResponse = response;

            // Remove markdown code block markers (```json and ```)
            cleanedResponse = cleanedResponse.replace(/```json\n/g, '');
            cleanedResponse = cleanedResponse.replace(/```/g, '');

            // Trim whitespace
            cleanedResponse = cleanedResponse.trim();

            console.log('Cleaned response for parsing:', cleanedResponse);

            parsedResponse = JSON.parse(cleanedResponse);
          } catch (parseError) {
            console.error('Błąd parsowania JSON:', parseError);
            throw new Error('Nieprawidłowy format odpowiedzi JSON');
          }

          // Sprawdzamy, czy odpowiedź jest tablicą fiszek
          if (Array.isArray(parsedResponse)) {
            console.log('Zawartość zawiera tablicę fiszek o długości:', parsedResponse.length);
            flashcards = parsedResponse.map((item: any) => ({
              front: item.front,
              back: item.back,
              source: 'ai-full'
            }));
          } else {
            console.error('Odpowiedź nie zawiera oczekiwanej tablicy fiszek.');
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
          model: command.model || 'gemini-2.0',
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
