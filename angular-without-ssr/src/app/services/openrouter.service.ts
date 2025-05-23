import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { SessionManager } from './session-manager.service';
import {
  Session,
  Message,
  OpenRouterRequestPayload,
  OpenRouterResponse
} from '../interfaces/openrouter.interface';
import { Observable, catchError, firstValueFrom, retry, throwError } from 'rxjs';
import { environment } from '../../environments/environments';

@Injectable({
  providedIn: 'root'
})
export class OpenRouterService {
  private apiUrl: string;
  private sessionManager: SessionManager;
  private defaultModel = 'deepseek/deepseek-prover-v2:free';

  constructor(
    private http: HttpClient,
    sessionManager: SessionManager
  ) {
    this.apiUrl = 'https://openrouter.ai/api/v1/chat/completions';
    this.sessionManager = sessionManager;

  }

  /**
   * Wysyła wiadomość użytkownika do modelu AI i zwraca odpowiedź
   * @param userMessage Wiadomość od użytkownika
   * @param sessionId Opcjonalny identyfikator sesji
   * @param options Opcjonalne parametry dla zapytania
   * @returns Promise z odpowiedzią od modelu AI
   */
  public async sendMessage(
    userMessage: string,
    sessionId?: string,
    options?: {
      systemMessage?: string;
      temperature?: number;
      max_tokens?: number;
      model?: string;
      useJsonFormat?: boolean;
    }
  ): Promise<string> {
    try {
      // Pobieramy istniejącą sesję lub tworzymy nową
      let session: Session;
      if (sessionId) {
        const existingSession = this.sessionManager.getSession(sessionId);
        if (!existingSession) {
          throw new Error('Nie znaleziono sesji o podanym ID');
        }
        session = existingSession;
      } else {
        session = this.sessionManager.createSession();
      }

      // Dodajemy wiadomość użytkownika do sesji
      const userMessageObj: Message = {
        role: 'user',
        content: userMessage,
        timestamp: new Date()
      };
      this.sessionManager.addMessage(session.id, userMessageObj);

      // Przygotowujemy listę wiadomości do wysłania do API
      const messages = session.messages.map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      // Jeśli nie ma wiadomości systemowej na początku, dodajemy ją
      if (messages.length === 0 || messages[0].role !== 'system') {
        messages.unshift({
          role: 'system',
          content: options?.systemMessage || 'Witaj w usłudze OpenRouter!'
        });
      }

      // Wywołujemy API
      const payload: OpenRouterRequestPayload = {
        model: options?.model || this.defaultModel,
        messages: messages,
        temperature: options?.temperature || 0.7,
        max_tokens: options?.max_tokens || 1000
      };

      // Dodajemy format JSON jeśli potrzebny
      if (options?.useJsonFormat) {
        console.log('Ustawianie formatu JSON dla zapytania');
        payload.response_format = {
          type: 'json_object'
        };

        // Dodajemy dodatkowe instrukcje do wiadomości użytkownika, aby wymusić format JSON
        payload.messages.push({
          role: 'user',
          content: 'ABSOLUTNIE KLUCZOWE: Odpowiedź MUSI być tablicą JSON z obiektami zawierającymi pola "front" i "back". NIE zwracaj pojedynczego obiektu JSON. Sprawdź, czy Twoja odpowiedź zaczyna się od "[" i kończy na "]". Upewnij się, że generujesz DOKŁADNIE 15 fiszek. Nie dodawaj żadnego tekstu przed ani po tablicy JSON.'
        });
      }

      const response = await firstValueFrom(this.callApi(payload));

      // Dodatkowe logi dla lepszego debugowania
      if (response && response.choices && response.choices.length > 0) {
        try {
          const contentJson = JSON.parse(response.choices[0].message.content);
        } catch (error) {
          console.error('Błąd parsowania contentu jako JSON:', error);
        }
      }

      // Dodajemy odpowiedź modelu do sesji
      if (response && response.choices && response.choices.length > 0) {
        const assistantMessage: Message = {
          role: 'assistant',
          content: response.choices[0].message.content,
          timestamp: new Date()
        };
        this.sessionManager.addMessage(session.id, assistantMessage);

        return assistantMessage.content;
      } else {
        console.error('Otrzymano pustą odpowiedź od modelu AI:', response);
        throw new Error('Otrzymano pustą odpowiedź od modelu AI');
      }
    } catch (error) {
      this.handleError(error as Error);
      throw error;
    }
  }

  /**
   * Tworzy nową sesję czatu
   * @returns Nowa sesja
   */
  public createSession(): Session {
    return this.sessionManager.createSession();
  }

  /**
   * Pobiera informacje o sesji na podstawie identyfikatora
   * @param sessionId Opcjonalny identyfikator sesji. Jeśli nie podano, zwraca aktywną sesję.
   * @returns Informacje o sesji lub null, jeśli nie znaleziono
   */
  public getSession(sessionId?: string): Session | null {
    return this.sessionManager.getSession(sessionId);
  }

  /**
   * Wykonuje zapytanie do API OpenRouter
   * @param payload Dane do wysłania
   * @returns Observable z odpowiedzią API
   */
  private callApi(payload: OpenRouterRequestPayload): Observable<OpenRouterResponse> {

    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${environment.openRouterKey}`,
      'HTTP-Referer': window.location.origin,
      'X-Title': '10xCards'
    });

    return this.http.post<OpenRouterResponse>(this.apiUrl, payload, { headers })
      .pipe(
        retry(2), // Ponów próbę 2 razy w przypadku błędów sieciowych
        catchError(this.handleHttpError)
      );
  }

  /**
   * Obsługuje błędy HTTP występujące podczas komunikacji z API
   * @param error Błąd HTTP
   * @returns Observable z błędem
   */
  private handleHttpError = (error: HttpErrorResponse) => {
    let errorMessage = 'Wystąpił nieznany błąd podczas komunikacji z API';

    if (error.error instanceof ErrorEvent) {
      // Błąd klienta
      errorMessage = `Błąd: ${error.error.message}`;
    } else {
      // Błąd serwera
      switch (error.status) {
        case 401:
          // Bezpieczne logowanie - pokazujemy tylko pierwsze 10 znaków klucza
          const maskedKey = environment.openRouterKey ? `${environment.openRouterKey.substring(0, 10)}...` : 'brak klucza';
          console.error('Szczegóły błędu autoryzacji:', error.error);
          console.error('Klucz API (zamaskowany):', maskedKey);

          // Sprawdź, czy klucz API jest ustawiony
          if (!environment.openRouterKey) {
            errorMessage = 'Brak klucza API OpenRouter. Sprawdź zmienne środowiskowe w Cloudflare Pages.';
          }
          // Sprawdź, czy klucz API ma poprawny format
          else if (!environment.openRouterKey.startsWith('sk-or-')) {
            errorMessage = 'Niepoprawny format klucza API OpenRouter. Klucz powinien zaczynać się od "sk-or-".';
          }
          else {
            errorMessage = 'Brak autoryzacji. Sprawdź swój klucz API OpenRouter. Upewnij się, że klucz jest aktywny i ma odpowiednie uprawnienia.';
          }
          break;
        case 403:
          errorMessage = 'Brak dostępu do wybranego modelu lub przekroczone limity.';
          break;
        case 404:
          errorMessage = 'Nie znaleziono zasobu. Sprawdź URL API.';
          break;
        case 429:
          errorMessage = 'Przekroczono limit zapytań. Spróbuj ponownie później.';
          break;
        case 500:
        case 502:
        case 503:
        case 504:
          errorMessage = `Błąd serwera (${error.status}). Spróbuj ponownie później.`;
          break;
        default:
          errorMessage = `Błąd API: ${error.status} - ${error.statusText}`;
      }
    }

    console.error(errorMessage, error);
    return throwError(() => new Error(errorMessage));
  }

  /**
   * Obsługuje błędy występujące podczas przetwarzania wiadomości
   * @param error Błąd
   */
  private handleError(error: Error): void {
    console.error('Błąd podczas przetwarzania wiadomości:', error);
    // Tutaj można dodać kod do logowania błędów, wysyłania powiadomień itp.
  }
}
