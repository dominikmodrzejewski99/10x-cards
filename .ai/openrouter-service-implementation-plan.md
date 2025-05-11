# Przewodnik implementacji usługi OpenRouter

## 1. Opis usługi
Usługa OpenRouter umożliwia integrację z interfejsem API OpenRouter w celu uzupełnienia czatów opartych na LLM. Celem usługi jest zapewnienie płynnej komunikacji między użytkownikami a modelami AI, umożliwiając generowanie odpowiedzi w czasie rzeczywistym.

## 2. Opis konstruktora
Konstruktor usługi OpenRouter inicjalizuje wszystkie niezbędne komponenty, w tym konfigurację API, zarządzanie sesjami użytkowników oraz obsługę błędów.

```typescript
class OpenRouterService {
    private apiKey: string;
    private apiUrl: string;
    private sessionManager: SessionManager;

    constructor(apiKey: string, apiUrl: string) {
        this.apiKey = apiKey;
        this.apiUrl = apiUrl;
        this.sessionManager = new SessionManager();
    }
}
```

## 3. Publiczne metody i pola
- `sendMessage(userMessage: string): Promise<string>` - Wysyła wiadomość użytkownika do modelu i zwraca odpowiedź.
- `getSession(sessionId: string): Session` - Zwraca informacje o sesji na podstawie identyfikatora sesji.

## 4. Prywatne metody i pola
- `private async callApi(payload: object): Promise<any>` - Wykonuje zapytanie do API OpenRouter.
- `private handleError(error: Error): void` - Obsługuje błędy występujące podczas komunikacji z API.

## 5. Obsługa błędów
Potencjalne scenariusze błędów:
1. Błąd autoryzacji (np. nieprawidłowy klucz API).
2. Błąd połączenia z API (np. brak dostępu do internetu).
3. Błąd odpowiedzi (np. nieprawidłowy format odpowiedzi).

### Rozwiązania:
1. Zwróć komunikat o błędzie autoryzacji i zalecenie sprawdzenia klucza API.
2. Zaimplementuj ponowne próby połączenia w przypadku błędów sieciowych.
3. Waliduj odpowiedź API przed jej przetworzeniem.

## 6. Kwestie bezpieczeństwa
- Używaj HTTPS do komunikacji z API.
- Przechowuj klucz API w bezpieczny sposób, np. w zmiennych środowiskowych.
- Implementuj mechanizmy ograniczające liczbę zapytań do API, aby zapobiec nadużyciom.

## 7. Plan wdrożenia krok po kroku
1. **Zainstaluj wymagane zależności**:
   ```bash
   npm install axios
   ```

2. **Skonfiguruj klucz API i URL**:
   - Ustaw zmienne środowiskowe dla `API_KEY` i `API_URL`.

3. **Zaimplementuj klasę OpenRouterService**:
   - Użyj podanego kodu konstruktora i metod.

4. **Zintegruj komunikat systemowy**:
   - Przykład:
     ```json
     {
       "system_message": "Witaj w usłudze OpenRouter!"
     }
     ```

5. **Zintegruj komunikat użytkownika**:
   - Przykład:
     ```json
     {
       "user_message": "Jakie są najnowsze wiadomości?"
     }
     ```

6. **Zdefiniuj response_format**:
   - Przykład:
     ```json
     {
       "type": "json_schema",
       "json_schema": {
         "name": "response_schema",
         "strict": true,
         "schema": {
           "type": "object",
           "properties": {
             "response": { "type": "string" }
           }
         }
       }
     }
     ```

7. **Zintegruj nazwę modelu i parametry modelu**:
   - Przykład:
     ```json
     {
       "model_name": "gpt-3.5-turbo",
       "parameters": {
         "temperature": 0.7,
         "max_tokens": 150
       }
     }
     ```

8. **Dokumentuj proces**:
   - Upewnij się, że wszystkie kroki są dobrze udokumentowane w README.md.
