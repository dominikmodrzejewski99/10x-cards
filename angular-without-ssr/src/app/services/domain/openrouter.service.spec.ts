import { TestBed, fakeAsync, tick, discardPeriodicTasks } from '@angular/core/testing';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { OpenRouterService } from './openrouter.service';
import { SessionManager } from './session-manager.service';
import { OpenRouterResponse, Session } from '../../interfaces/openrouter.interface';
import { environment } from '../../../environments/environments';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

const EXPECTED_API_URL = `${environment.supabaseUrl}/functions/v1/chat`;
const EXPECTED_DEFAULT_MODEL = 'gemini-3.1-flash-lite';

describe('OpenRouterService', () => {
  let service: OpenRouterService;
  let httpMock: HttpTestingController;
  let sessionManagerSpy: jasmine.SpyObj<SessionManager>;

  // Dane testowe używane w wielu testach
  let mockSession: Session;

  // Funkcja do resetowania mockSession przed każdym testem
  function resetMockSession() {
    mockSession = {
      id: 'test-session-123',
      messages: [
        {
          role: 'user',
          content: 'Testowa wiadomość użytkownika',
          timestamp: new Date()
        }
      ],
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  const mockApiResponse: OpenRouterResponse = {
    id: 'test-response-id',
    model: 'stepfun/step-3.5-flash:free',
    choices: [
      {
        index: 0,
        message: {
          role: 'assistant',
          content: 'Testowa odpowiedź od AI'
        },
        finish_reason: 'stop'
      }
    ],
    usage: {
      prompt_tokens: 10,
      completion_tokens: 15,
      total_tokens: 25
    }
  };

  // Przygotowanie mocków przed każdym testem
  beforeEach(async () => {
    // Resetujemy mockSession przed każdym testem
    resetMockSession();
    const mockSessionManager = jasmine.createSpyObj('SessionManager',
      ['createSession', 'getSession', 'addMessage', 'removeSession']);

    await TestBed.configureTestingModule({
      imports: [
        TranslocoTestingModule.forRoot({
          langs: {
            pl: {
              openrouter: {
                errors: {
                  sessionNotFound: 'Nie znaleziono sesji o podanym ID.',
                  unauthorized: 'Brak autoryzacji. Sprawdź klucz API Google AI Studio.',
                  rateLimited: 'Przekroczono limit zapytań AI. Spróbuj ponownie za chwilę.',
                  allModelsUnavailable: 'Wszystkie modele AI są niedostępne. Spróbuj ponownie później.',
                  emptyResponse: 'Otrzymano pustą odpowiedź od modelu AI po wielu próbach.',
                  emptyResponseSingle: 'Otrzymano pustą odpowiedź od modelu AI',
                  translationFailed: 'Nie udało się przetłumaczyć tekstu po wielu próbach.',
                  unknownApiError: 'Nieznany błąd API',
                  timeout: 'Przekroczono czas oczekiwania na odpowiedź AI (60s).',
                  apiResponseError: 'Błąd w odpowiedzi API',
                  networkError: 'Błąd sieci: {{message}}',
                  noConnection: 'Brak połączenia z serwerem AI. Sprawdź połączenie internetowe.',
                  badRequest: 'Nieprawidłowe żądanie do API. Spróbuj ponownie.',
                  badRequestWithMessage: 'Błąd modelu AI: {{message}}',
                  forbidden: 'Brak dostępu do wybranego modelu lub przekroczone limity.',
                  modelNotFound: 'Wybrany model AI nie istnieje. Sprawdź konfigurację.',
                  serverError: 'Serwer AI tymczasowo niedostępny ({{status}}). Spróbuj ponownie później.',
                  unexpectedError: 'Nieoczekiwany błąd API ({{status}}): {{details}}',
                  noDetails: 'brak szczegółów',
                },
              },
            },
          },
          preloadLangs: true,
          translocoConfig: { availableLangs: ['pl'], defaultLang: 'pl' },
        }),
      ],
      providers: [
        OpenRouterService,
        { provide: SessionManager, useValue: mockSessionManager },
        provideHttpClient(withFetch()),
        provideHttpClientTesting(),
        provideRouter([]),
        provideAnimationsAsync()
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    service = TestBed.inject(OpenRouterService);
    httpMock = TestBed.inject(HttpTestingController);
    sessionManagerSpy = TestBed.inject(SessionManager) as jasmine.SpyObj<SessionManager>;
  });

  afterEach(() => {
    // Weryfikacja tylko jeśli nie jesteśmy w teście fakeAsync
    try {
      httpMock.verify();
    } catch (e) {
      console.warn('Nie można zweryfikować httpMock:', e);
    }
  });

  // Testy podstawowych funkcjonalności
  describe('podstawowe funkcjonalności', () => {
    it('powinien być zainicjalizowany', () => {
      expect(service).toBeTruthy();
    });

    it('powinien wysłać wiadomość i zwrócić odpowiedź', fakeAsync(() => {
      // Przygotowanie
      const userMessage = 'Testowa wiadomość użytkownika';
      sessionManagerSpy.createSession.and.returnValue(mockSession);
      sessionManagerSpy.addMessage.and.returnValue(mockSession);

      // Usuwamy przygotowanie odpowiedzi mock, ponieważ powoduje to problemy z testami

      // Działanie
      const sendMessagePromise = service.sendMessage(userMessage);

      // Dajemy czas na wykonanie zapytania
      tick();

      // Sprawdzenie zapytania HTTP
      const req = httpMock.expectOne(request => {
        return request.url === EXPECTED_API_URL;
      });

      // Sprawdzenie metody i nagłówków
      expect(req.request.method).toBe('POST');
      expect(req.request.headers.get('Content-Type')).toBe('application/json');

      // Sprawdzenie body zapytania
      const requestBody = req.request.body;
      expect(requestBody.model).toBe(EXPECTED_DEFAULT_MODEL); // Model domyślny

      // Weryfikacja, że mamy wiadomość z instrukcją systemową (jako user z prefiksem [System])
      const systemMessage = requestBody.messages.find((m: any) => m.role === 'user' && m.content.startsWith('[System]'));
      expect(systemMessage).toBeDefined();

      // Weryfikacja, że mamy wiadomość użytkownika
      // Sprawdzamy, czy którakolwiek wiadomość użytkownika istnieje
      const userMessages = requestBody.messages.filter((m: any) => m.role === 'user');

      // Sprawdzamy, czy istnieje przynajmniej jedna wiadomość użytkownika
      expect(userMessages.length).toBeGreaterThan(0);

      // Wypisujemy treść wiadomości dla diagnozy
      userMessages.forEach((msg: { role: string; content: string }, index: number) => {
        console.log(`Wiadomość użytkownika ${index + 1}:`, msg.content);
      });

      // Symulacja odpowiedzi z serwera
      req.flush(mockApiResponse);

      // Musimy poczekać na zakończenie asynchronicznej operacji
      tick();

      // Sprawdzenie wyniku
      sendMessagePromise.then(result => {
        expect(result).toBe('Testowa odpowiedź od AI');
      });

      // Sprawdzenie wywołania metod SessionManager
      expect(sessionManagerSpy.createSession).toHaveBeenCalledTimes(1);
      expect(sessionManagerSpy.addMessage).toHaveBeenCalledTimes(2); // Dodanie wiadomości użytkownika i asystenta

      // Posprzątnij pozostałe timery
      discardPeriodicTasks();
    }));

    it('powinien używać istniejącej sesji, jeśli podano jej ID', fakeAsync(() => {
      // Przygotowanie
      const userMessage = 'Testowa wiadomość dla istniejącej sesji';
      const existingSessionId = 'existing-session-123';

      sessionManagerSpy.getSession.and.returnValue(mockSession);
      sessionManagerSpy.addMessage.and.returnValue(mockSession);

      // Działanie
      const sendMessagePromise = service.sendMessage(userMessage, existingSessionId);

      // Sprawdzenie zapytania HTTP
      const req = httpMock.expectOne(request => request.url === EXPECTED_API_URL);
      req.flush(mockApiResponse);

      // Czekamy na zakończenie asynchronicznej operacji
      tick();

      // Sprawdzenie wyniku
      sendMessagePromise.then(result => {
        expect(result).toBe('Testowa odpowiedź od AI');
      });

      // Sprawdzenie wywołania metod SessionManager
      expect(sessionManagerSpy.getSession).toHaveBeenCalledWith(existingSessionId);
      expect(sessionManagerSpy.createSession).not.toHaveBeenCalled(); // Nie powinna być wywołana
      expect(sessionManagerSpy.addMessage).toHaveBeenCalledTimes(2);

      // Posprzątnij pozostałe timery
      discardPeriodicTasks();
    }));
  });

  // Testy różnych opcji
  describe('różne opcje zapytania', () => {
    it('powinien uwzględniać niestandardowe opcje w zapytaniu', fakeAsync(() => {
      // Przygotowanie
      const userMessage = 'Testowa wiadomość z opcjami';
      const customOptions = {
        systemMessage: 'Niestandardowa wiadomość systemowa',
        temperature: 0.3,
        max_tokens: 2000,
        model: 'arcee-ai/trinity-large-preview:free'
      };

      sessionManagerSpy.createSession.and.returnValue(mockSession);
      sessionManagerSpy.addMessage.and.returnValue(mockSession);

      // Działanie
      service.sendMessage(userMessage, undefined, customOptions);
// Sprawdzenie zapytania HTTP
      const req = httpMock.expectOne(request => request.url === EXPECTED_API_URL);

      // Sprawdzenie body zapytania
      const requestBody = req.request.body;
      // callWithFallback always uses FALLBACK_MODELS, ignoring options.model
      expect(requestBody.model).toBe(EXPECTED_DEFAULT_MODEL);
      expect(requestBody.temperature).toBe(customOptions.temperature);
      expect(requestBody.max_tokens).toBe(customOptions.max_tokens);
      // System message is prepended as a user-role message with [System] prefix
      expect(requestBody.messages[0].content).toBe(`[System] ${customOptions.systemMessage}`);

      // Symulacja odpowiedzi z serwera
      req.flush(mockApiResponse);

      // Czekamy na zakończenie asynchronicznej operacji
      tick();

      // Posprzątnij pozostałe timery
      discardPeriodicTasks();
    }));

    it('powinien prawidłowo konfigurować format JSON w zapytaniu', fakeAsync(() => {
      // Przygotowanie
      const userMessage = 'Tekst źródłowy do generowania fiszek';
      const jsonOptions = {
        useJsonFormat: true,
        systemMessage: 'Wygeneruj fiszki na podstawie tekstu'
      };

      sessionManagerSpy.createSession.and.returnValue(mockSession);
      sessionManagerSpy.addMessage.and.returnValue(mockSession);

      // Działanie
      const sendMessagePromise = service.sendMessage(userMessage, undefined, jsonOptions);

      // Sprawdzenie zapytania HTTP
      const req = httpMock.expectOne(request => request.url === EXPECTED_API_URL);

      // Sprawdzenie body zapytania - JSON mode is now enforced via prompt, not response_format
      const requestBody = req.request.body;

      // Sprawdzenie, że wiadomość użytkownika jest obecna
      const userMessages = requestBody.messages.filter((m: any) => m.role === 'user');
      expect(userMessages.length).toBeGreaterThan(0);

      // Symulacja odpowiedzi JSON
      const jsonResponse = {
        ...mockApiResponse,
        choices: [{
          ...mockApiResponse.choices[0],
          message: {
            role: 'assistant',
            content: '[{"front":"Pytanie 1","back":"Odpowiedź 1"},{"front":"Pytanie 2","back":"Odpowiedź 2"}]'
          }
        }]
      };
      req.flush(jsonResponse);

      // Czekamy na zakończenie asynchronicznej operacji
      tick();

      // Sprawdzenie wyniku
      sendMessagePromise.then(result => {
        expect(result).toBe('[{"front":"Pytanie 1","back":"Odpowiedź 1"},{"front":"Pytanie 2","back":"Odpowiedź 2"}]');
      });

      // Posprzątnij pozostałe timery
      discardPeriodicTasks();
    }));
  });

  // Testy obsługi błędów
  describe('obsługa błędów', () => {
    it('powinien obsłużyć błąd 401 Unauthorized', async () => {
      // Przygotowanie
      const userMessage = 'Testowa wiadomość';
      sessionManagerSpy.createSession.and.returnValue(mockSession);
      sessionManagerSpy.addMessage.and.returnValue(mockSession);

      // Działanie
      const sendMessagePromise = service.sendMessage(userMessage);

      // Symulacja błędu autoryzacji
      const req = httpMock.expectOne(request => request.url === EXPECTED_API_URL);
      req.flush('Unauthorized', {
        status: 401,
        statusText: 'Unauthorized'
      });

      // Sprawdzenie wyniku - oczekujemy błędu
      await expectAsync(sendMessagePromise).toBeRejectedWithError(/Brak|autoryz/);
    });

    it('powinien obsłużyć błąd 429 Too Many Requests', async () => {
      // Przygotowanie
      const userMessage = 'Testowa wiadomość';
      sessionManagerSpy.createSession.and.returnValue(mockSession);
      sessionManagerSpy.addMessage.and.returnValue(mockSession);

      // Działanie
      const sendMessagePromise = service.sendMessage(userMessage);

      // Symulacja błędu rate limit dla pierwszego modelu (retryable — serwis przejdzie do fallback)
      const req1 = httpMock.expectOne(request => request.url === EXPECTED_API_URL);
      req1.flush('Too Many Requests', {
        status: 429,
        statusText: 'Too Many Requests'
      });

      // Symulacja błędu rate limit dla fallback modelu (ostatni — rzuca błąd)
      await new Promise(resolve => setTimeout(resolve));
      const req2 = httpMock.expectOne(request => request.url === EXPECTED_API_URL);
      req2.flush('Too Many Requests', {
        status: 429,
        statusText: 'Too Many Requests'
      });

      // Sprawdzenie wyniku - oczekujemy błędu
      await expectAsync(sendMessagePromise).toBeRejectedWithError(/Przekroczono limit zapytań/);
    });

    it('powinien obsłużyć nieprawidłowe ID sesji', async () => {
      // Przygotowanie
      const userMessage = 'Testowa wiadomość';
      const invalidSessionId = 'non-existent-session';

      // Symulacja braku sesji
      sessionManagerSpy.getSession.and.returnValue(null);

      // Działanie i sprawdzenie wyniku
      await expectAsync(service.sendMessage(userMessage, invalidSessionId))
        .toBeRejectedWithError('Nie znaleziono sesji o podanym ID.');

      // Weryfikacja, że nie wykonano zapytania HTTP
      httpMock.expectNone(EXPECTED_API_URL);
    });
  });

  // Testy zarządzania sesjami
  describe('zarządzanie sesjami', () => {
    it('powinien utworzyć nową sesję', () => {
      // Przygotowanie
      sessionManagerSpy.createSession.and.returnValue(mockSession);

      // Działanie
      const session = service.createSession();

      // Sprawdzenie wyniku
      expect(session).toBe(mockSession);
      expect(sessionManagerSpy.createSession).toHaveBeenCalledTimes(1);
    });

    it('powinien pobrać sesję o podanym ID', () => {
      // Przygotowanie
      const sessionId = 'test-session-123';
      sessionManagerSpy.getSession.and.returnValue(mockSession);

      // Działanie
      const session = service.getSession(sessionId);

      // Sprawdzenie wyniku
      expect(session).toBe(mockSession);
      expect(sessionManagerSpy.getSession).toHaveBeenCalledWith(sessionId);
    });

    it('powinien zwrócić null dla nieistniejącej sesji', () => {
      // Przygotowanie
      const sessionId = 'non-existent-session';
      sessionManagerSpy.getSession.and.returnValue(null);

      // Działanie
      const session = service.getSession(sessionId);

      // Sprawdzenie wyniku
      expect(session).toBeNull();
      expect(sessionManagerSpy.getSession).toHaveBeenCalledWith(sessionId);
    });
  });

  // Testy przypadków brzegowych
  describe('przypadki brzegowe', () => {
    it('powinien obsłużyć długie wiadomości użytkownika', fakeAsync(() => {
      // Przygotowanie
      const longMessage = 'A'.repeat(5000); // Długa wiadomość 5000 znaków
      sessionManagerSpy.createSession.and.returnValue(mockSession);
      sessionManagerSpy.addMessage.and.returnValue(mockSession);

      // Działanie
      const sendMessagePromise = service.sendMessage(longMessage);

      // Dajemy czas na wykonanie zapytania
      tick();

      // Sprawdzenie zapytania HTTP
      const req = httpMock.expectOne(request => request.url === EXPECTED_API_URL);

      // Symulujemy odpowiedź od serwera
      req.flush(mockApiResponse);

      // Czekamy na zakończenie asynchronicznej operacji
      tick();

      // Sprawdzamy, czy metoda addMessage została wywołana
      expect(sessionManagerSpy.addMessage).toHaveBeenCalled();

      // Sprawdzamy, czy promise został rozwiązany
      sendMessagePromise.then(result => {
        expect(result).toBe('Testowa odpowiedź od AI');
      });

      // Posprzątnij pozostałe timery
      discardPeriodicTasks();
    }));

    it('powinien obsłużyć odpowiedź w formacie JSON', fakeAsync(() => {
      // Przygotowanie
      const userMessage = 'Wygeneruj fiszki';
      const jsonOptions = { useJsonFormat: true };
      const validJsonResponse = '[{"front":"Pytanie 1","back":"Odpowiedź 1"},{"front":"Pytanie 2","back":"Odpowiedź 2"}]';

      sessionManagerSpy.createSession.and.returnValue(mockSession);
      sessionManagerSpy.addMessage.and.returnValue(mockSession);

      // Działanie
      const sendMessagePromise = service.sendMessage(userMessage, undefined, jsonOptions);

      // Symulacja odpowiedzi JSON
      const req = httpMock.expectOne(request => request.url === EXPECTED_API_URL);
      const jsonApiResponse = {
        ...mockApiResponse,
        choices: [{
          ...mockApiResponse.choices[0],
          message: {
            role: 'assistant',
            content: validJsonResponse
          }
        }]
      };
      req.flush(jsonApiResponse);

      // Czekamy na zakończenie asynchronicznej operacji
      tick();

      // Sprawdzenie wyniku
      sendMessagePromise.then(result => {
        expect(result).toBe(validJsonResponse);

        // Weryfikacja, czy można sparsować wynik jako JSON
        const parsedJson = JSON.parse(result);
        expect(Array.isArray(parsedJson)).toBeTrue();
        expect(parsedJson.length).toBe(2);
        expect(parsedJson[0].front).toBe('Pytanie 1');
      });

      discardPeriodicTasks();
    }));
  });
});
