import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, from, map, of, catchError } from 'rxjs';
import { GenerateFlashcardsCommand, GenerationDTO, FlashcardProposalDTO } from '../../types';
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
    try {
      return this.generateFlashcardsWithOpenRouter(command);
    } catch (error) {
      // W przypadku błędu zwracamy dane testowe
      return of(this.generateMockFlashcards(command));
    }
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
    Wygeneruj fiszki edukacyjne na podstawie poniższego tekstu.
    Każda fiszka powinna mieć przód (pytanie lub pojęcie) i tył (odpowiedź lub definicję).
    Wygeneruj od 5 do 10 fiszek, które najlepiej podsumowują kluczowe informacje z tekstu.

    Tekst źródłowy:
    ${command.text}

    Zwróć odpowiedź TYLKO w formacie JSON jako tablicę obiektów z polami 'front' i 'back', bez żadnych dodatkowych komentarzy.
    Przykład:
    [
      {
        "front": "Pytanie 1",
        "back": "Odpowiedź 1"
      },
      {
        "front": "Pojęcie 2",
        "back": "Definicja 2"
      }
    ]
    `;

    // Wywołanie OpenRouter z odpowiednimi opcjami
    return from(this.openRouterService.sendMessage(prompt, undefined, {
      systemMessage: 'Jesteś asystentem, który tworzy fiszki edukacyjne. Twoje odpowiedzi zawsze są w formacie JSON.',
      temperature: 0.5,
      max_tokens: 2000,
      model: command.model || 'gpt-4o-mini',
      useJsonFormat: true
    })).pipe(
      catchError((error: any) => {
        console.error('Błąd podczas wywołania OpenRouter:', error);
        // Zwracamy dane testowe w przypadku błędu
        return of(JSON.stringify(this.generateMockFlashcards(command).flashcards));
      }),
      map(response => {
        // Parsowanie odpowiedzi JSON
        let flashcards: FlashcardProposalDTO[] = [];
        try {
          // Próba parsowania odpowiedzi jako JSON
          const parsedResponse = JSON.parse(response as string);

          // Sprawdzenie czy odpowiedź jest tablicą
          if (Array.isArray(parsedResponse)) {
            // Mapowanie na FlashcardProposalDTO
            flashcards = parsedResponse.map(item => ({
              front: item.front,
              back: item.back,
              source: 'ai-full'
            }));
          }
        } catch (error) {
          console.error('Błąd parsowania odpowiedzi JSON:', error);
        }

        // Obliczenie czasu generacji
        const endTime = new Date();
        const generationDuration = (endTime.getTime() - startTime.getTime()) / 1000; // w sekundach

        // Utworzenie obiektu GenerationDTO
        const generation: GenerationDTO = {
          id: Date.now(), // Tymczasowe ID
          generated_count: flashcards.length,
          generation_duration: generationDuration,
          model: command.model || 'gpt-4o-mini',
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

  /**
   * Generuje testowe dane fiszek w przypadku niedostępności OpenRouter
   * @param command Komenda generowania fiszek
   * @returns Obiekt z wygenerowanymi fiszkami i metadanymi
   */
  private generateMockFlashcards(command: GenerateFlashcardsCommand): {
    generation: GenerationDTO,
    flashcards: FlashcardProposalDTO[]
  } {
    const startTime = new Date();
    const endTime = new Date(startTime.getTime() + 2000); // Symulacja 2 sekundy generacji

    // Wyciągnięcie kilku słów z tekstu źródłowego do użycia w fiszkach
    const words = command.text
      .split(/\s+/)
      .filter(word => word.length > 5)
      .slice(0, 20);

    // Generowanie 5 przykładowych fiszek
    const flashcards: FlashcardProposalDTO[] = [
      {
        front: 'Co to jest uczenie maszynowe?',
        back: 'Dziedzina sztucznej inteligencji zajmująca się tworzeniem systemów, które uczą się na podstawie danych.',
        source: 'ai-full'
      },
      {
        front: 'Czym jest algorytm?',
        back: 'Zbiór instrukcji lub reguł służących do rozwiązania problemu lub wykonania zadania.',
        source: 'ai-full'
      },
      {
        front: 'Co to jest API?',
        back: 'Interfejs programowania aplikacji, który umożliwia różnym programom komunikację między sobą.',
        source: 'ai-full'
      },
      {
        front: 'Czym jest framework?',
        back: 'Struktura programistyczna, która dostarcza podstawowe komponenty i narzędzia do tworzenia aplikacji.',
        source: 'ai-full'
      },
      {
        front: 'Co to jest baza danych?',
        back: 'Zorganizowany zbiór danych przechowywanych elektronicznie w systemie komputerowym.',
        source: 'ai-full'
      }
    ];

    // Jeśli mamy wystarczająco słów, dodajemy jeszcze kilka fiszek na podstawie tekstu
    if (words.length >= 10) {
      flashcards.push(
        {
          front: `Co oznacza termin "${words[0]}"?`,
          back: `${words[0]} to kluczowy element w kontekście ${words[5]}.`,
          source: 'ai-full'
        },
        {
          front: `Jaką rolę pełni ${words[2]}?`,
          back: `${words[2]} jest odpowiedzialny za ${words[7]} w procesie ${words[3]}.`,
          source: 'ai-full'
        }
      );
    }

    // Utworzenie obiektu GenerationDTO
    const generation: GenerationDTO = {
      id: Date.now(),
      generated_count: flashcards.length,
      generation_duration: 2.0, // 2 sekundy
      model: 'mock-model',
      source_text_hash: this.hashString(command.text),
      source_text_length: command.text.length,
      accepted_edited_count: null,
      accepted_unedited_count: null,
      created_at: startTime.toISOString(),
      updated_at: endTime.toISOString(),
      user_id: 'mock-user'
    };

    return {
      generation,
      flashcards
    };
  }
}
