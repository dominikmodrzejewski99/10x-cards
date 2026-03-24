import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { SessionManager } from './session-manager.service';
import { LoggerService } from './logger.service';
import {
  Session,
  Message,
  OpenRouterRequestPayload,
  OpenRouterResponse
} from '../interfaces/openrouter.interface';
import { Observable, catchError, firstValueFrom, retry, throwError, timer } from 'rxjs';
import { environment } from '../../environments/environments';

@Injectable({
  providedIn: 'root'
})
export class OpenRouterService {
  private logger: LoggerService = inject(LoggerService);
  private apiUrl: string;
  private sessionManager: SessionManager;
  private defaultModel = 'stepfun/step-3.5-flash:free';

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

      if (options?.useJsonFormat) {
        payload.response_format = {
          type: 'json_object'
        };
      }

      let response = await firstValueFrom(this.callApi(payload));

      // Retry once on empty content
      let content = response?.choices?.[0]?.message?.content;
      if (!content) {
        response = await firstValueFrom(this.callApi(payload));
        content = response?.choices?.[0]?.message?.content;
      }

      // Dodajemy odpowiedź modelu do sesji
      if (content) {
        const assistantMessage: Message = {
          role: 'assistant',
          content,
          timestamp: new Date()
        };
        this.sessionManager.addMessage(session.id, assistantMessage);

        return content;
      } else {
        this.logger.error('OpenRouterService.sendMessage', response);
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
   * Tłumaczy tekst z jednego języka na drugi za pomocą modelu AI.
   * Używa bezpośredniego wywołania API bez zarządzania sesją.
   * @param text Tekst do przetłumaczenia
   * @param fromLang Kod języka źródłowego (en, pl, de, es, fr)
   * @param toLang Kod języka docelowego (en, pl, de, es, fr)
   * @returns Promise z przetłumaczonym tekstem
   */
  public async translateText(text: string, fromLang: string, toLang: string): Promise<string> {
    const langNames: Record<string, string> = {
      en: 'English', pl: 'Polish', de: 'German', es: 'Spanish', fr: 'French'
    };
    const fromName: string = langNames[fromLang] || fromLang;
    const toName: string = langNames[toLang] || toLang;

    const payload: OpenRouterRequestPayload = {
      model: this.defaultModel,
      messages: [
        {
          role: 'user',
          content: `Translate "${text}" from ${fromName} to ${toName}. Return ONLY the translation. If there are multiple common meanings, separate them with semicolons. No explanations.`
        }
      ],
      temperature: 0.3,
      max_tokens: 200
    };

    const maxRetries: number = 3;
    for (let attempt: number = 0; attempt < maxRetries; attempt++) {
      try {
        const response: OpenRouterResponse = await firstValueFrom(this.callApi(payload));
        const content: string | undefined = response?.choices?.[0]?.message?.content;
        if (content && content.trim()) {
          return content.trim();
        }
      } catch {
        if (attempt === maxRetries - 1) {
          throw new Error('Nie udało się przetłumaczyć tekstu');
        }
      }
    }

    throw new Error('Otrzymano pustą odpowiedź od modelu AI po wielu próbach');
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
      'X-Title': 'Memlo'
    });

    return this.http.post<OpenRouterResponse>(this.apiUrl, payload, { headers })
      .pipe(
        retry({ count: 1, delay: (error) => {
          const status = error?.status;
          if (status === 401 || status === 403 || status === 404) {
            return throwError(() => error);
          }
          return timer(status === 429 ? 5000 : 1000);
        }}),
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
          if (!environment.openRouterKey) {
            errorMessage = 'Brak klucza API OpenRouter. Sprawdź zmienne środowiskowe.';
          } else {
            errorMessage = 'Brak autoryzacji. Sprawdź swój klucz API OpenRouter.';
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

    this.logger.error('OpenRouterService.callApi', error);
    return throwError(() => new Error(errorMessage));
  }

  /**
   * Obsługuje błędy występujące podczas przetwarzania wiadomości
   * @param error Błąd
   */
  private handleError(error: Error): void {
    this.logger.error('OpenRouterService.handleError', error);
  }
}
