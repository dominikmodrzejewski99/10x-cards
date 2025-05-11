# API Endpoint Implementation Plan: POST /flashcards

## 1. Przegląd punktu końcowego
Ten endpoint umożliwia tworzenie nowych fiszek przez uwierzytelnionych użytkowników. Wspiera tworzenie pojedynczej fiszki lub wielu fiszek w jednym żądaniu (batch creation). Każda fiszka musi zawierać tekst na przodzie (`front`), tekst na tyle (`back`) oraz źródło pochodzenia (`source`).

## 2. Szczegóły żądania
-   **Metoda HTTP:** `POST`
-   **Struktura URL:** `/flashcards`
-   **Parametry:** Brak parametrów URL ani Query.
-   **Request Body:**
    -   Może być pojedynczym obiektem JSON reprezentującym jedną fiszkę:
        ```json
        {
          "front": "Tekst pytania",
          "back": "Tekst odpowiedzi",
          "source": "manual" 
        }
        ```
    -   Lub tablicą obiektów JSON reprezentujących wiele fiszek:
        ```json
        [
          {
            "front": "Pytanie 1",
            "back": "Odpowiedź 1",
            "source": "ai-full"
          },
          {
            "front": "Pytanie 2",
            "back": "Odpowiedź 2",
            "source": "ai-edited"
          }
        ]
        ```
    -   Pole `source` musi przyjmować jedną z wartości: `'ai-full'`, `'ai-edited'`, `'manual'`.
    -   Limit długości: `front` <= 200 znaków, `back` <= 500 znaków (zgodnie z @.ai/db-plan.md).

## 3. Wykorzystywane typy
-   Referencje do typów znajdują się w pliku `@angular/src/types.ts`.
-   Do walidacji i przetwarzania danych wejściowych wykorzystane zostaną struktury odpowiadające `FlashcardProposalDTO`.
-   Do interakcji z logiką biznesową i bazą danych używane będą typy `CreateFlashcardCommand` oraz `FlashcardDTO`.

## 4. Szczegóły odpowiedzi
-   **Sukces (201 Created):** Zwraca obiekt JSON lub tablicę obiektów JSON reprezentujących nowo utworzone fiszki (zgodnie z typem `FlashcardDTO`). Odpowiedź powinna zawierać przydzielone `id`, `created_at`, `updated_at` oraz `user_id`.
    ```json
    // Przykład dla pojedynczej fiszki
    {
      "id": 123,
      "front": "Tekst pytania",
      "back": "Tekst odpowiedzi",
      "source": "manual",
      "created_at": "2023-10-27T10:00:00Z",
      "updated_at": "2023-10-27T10:00:00Z",
      "user_id": "user-uuid-123",
      "generation_id": null
    }
    ```
-   **Błąd walidacji (400 Bad Request):** Zwraca obiekt JSON z informacją o błędach walidacji.
    ```json
    {
      "error": "Validation failed",
      "details": [
        { "path": ["front"], "message": "String must contain at most 200 character(s)" },
        { "path": ["[1]", "source"], "message": "Invalid enum value. Expected 'ai-full' | 'ai-edited' | 'manual'" } 
      ]
    }
    ```
-   **Błąd autentykacji (401 Unauthorized):** Zwraca standardową odpowiedź błędu autentykacji (zależną od implementacji middleware autentykacji Supabase).
-   **Błąd serwera (500 Internal Server Error):** Zwraca ogólny komunikat błędu serwera.
    ```json
    {
      "error": "Internal Server Error"
    }
    ```

## 5. Przepływ danych
1.  Żądanie POST trafia do kontrolera endpointu `/flashcards`.
2.  Middleware autentykacji Supabase weryfikuje użytkownika i udostępnia jego `user_id` w kontekście żądania. Jeśli autentykacja zawiedzie, zwracany jest błąd 401.
3.  Kontroler pobiera ciało żądania.
4.  Walidator (oparty na Zod, zgodnie z @backend.mdc) sprawdza strukturę i zawartość ciała żądania (pojedynczy obiekt lub tablica, obecność wymaganych pól, typy danych, dozwolone wartości `source`, limity długości `front` i `back`). W przypadku błędów walidacji zwracany jest błąd 400.
5.  Kontroler wywołuje metodę serwisu `FlashcardService.createFlashcards`, przekazując zwalidowane dane fiszek oraz `user_id` z kontekstu autentykacji.
6.  `FlashcardService` mapuje dane wejściowe na obiekty zgodne ze schematem tabeli `flashcards` (@.ai/db-plan.md), dodając `user_id` do każdego obiektu.
7.  Serwis wykorzystuje klienta Supabase (`SupabaseClient` z @/src/db/supabase.client.ts, zgodnie z @backend.mdc) do wstawienia danych do tabeli `flashcards` w bazie danych PostgreSQL (@tech-stack.md). Operacja wstawiania powinna obsłużyć zarówno pojedyncze, jak i masowe wstawianie (batch insert).
8.  Jeśli operacja w bazie danych powiedzie się, serwis zwraca utworzone fiszki (z danymi zwróconymi przez bazę, np. `id`, `created_at`).
9.  Kontroler otrzymuje wynik z serwisu i zwraca odpowiedź 201 Created z danymi utworzonych fiszek.
10. W przypadku błędu podczas operacji na bazie danych (np. błąd połączenia, naruszenie ograniczeń), serwis zgłasza błąd. Kontroler łapie ten błąd i zwraca odpowiedź 500 Internal Server Error, logując szczegóły błędu po stronie serwera.

## 6. Względy bezpieczeństwa
-   **Uwierzytelnianie:** Endpoint musi być chroniony i dostępny tylko dla zalogowanych użytkowników. Należy wykorzystać mechanizmy autentykacji Supabase (@backend.mdc).
-   **Autoryzacja:** Upewnić się, że `user_id` jest pobierany wyłącznie z zaufanego kontekstu sesji/tokenu użytkownika po pomyślnej autentykacji, a nie z danych wejściowych żądania.
-   **Walidacja danych wejściowych:** Rygorystyczna walidacja za pomocą Zod (@backend.mdc) jest kluczowa, aby zapobiec zapisywaniu nieprawidłowych danych i potencjalnym atakom (np. przez nadmiernie długie ciągi znaków). Należy sprawdzić typy, formaty, długości oraz dozwolone wartości (`source`).
-   **Zapobieganie SQL Injection:** Użycie Supabase SDK (`SupabaseClient` z @/src/db/supabase.client.ts) i przekazywanie danych jako parametry zapytań (co SDK robi domyślnie) chroni przed atakami SQL Injection.
-   **Zgodność z wytycznymi Supabase:** Należy przestrzegać wytycznych Supabase dotyczących bezpieczeństwa (@backend.mdc).

## 7. Obsługa błędów
-   Implementacja globalnego mechanizmu obsługi błędów (error handler middleware) do przechwytywania wyjątków i mapowania ich na odpowiednie kody statusu HTTP.
-   Błędy walidacji Zod powinny być mapowane na odpowiedź 400 Bad Request ze szczegółowymi informacjami o błędach.
-   Błędy autentykacji (np. z middleware Supabase) powinny skutkować odpowiedzią 401 Unauthorized.
-   Błędy pochodzące z serwisu (np. błędy bazy danych zgłoszone przez Supabase Client) powinny być logowane po stronie serwera i mapowane na odpowiedź 500 Internal Server Error.
-   Należy unikać ujawniania szczegółów implementacyjnych lub wrażliwych informacji w komunikatach błędów zwracanych do klienta (szczególnie dla błędów 500).

## 8. Rozważania dotyczące wydajności
-   **Batch Insertion:** W przypadku tworzenia wielu fiszek naraz, należy wykorzystać mechanizm masowego wstawiania (batch insert) oferowany przez Supabase/PostgreSQL, aby zminimalizować liczbę zapytań do bazy danych i poprawić wydajność.
-   **Walidacja:** Walidacja po stronie serwera jest konieczna, ale jej złożoność powinna być monitorowana, aby nie stała się wąskim gardłem przy dużej liczbie fiszek w żądaniu.
-   **Połączenia z bazą danych:** Upewnić się, że zarządzanie połączeniami z bazą danych jest efektywne (Supabase SDK zazwyczaj zarządza tym automatycznie).

## 9. Etapy wdrożenia
1.  **Definicja trasy (Route):** Zdefiniować trasę `POST /flashcards` w systemie routingu aplikacji backendowej.
2.  **Middleware Autentykacji:** Zastosować middleware autentykacji Supabase do zdefiniowanej trasy, aby upewnić się, że tylko zalogowani użytkownicy mogą uzyskać dostęp.
3.  **Schemat Walidacji Zod:** Utworzyć schemat walidacji Zod (@backend.mdc) dla ciała żądania, uwzględniając strukturę pojedynczego obiektu i tablicy obiektów, wymagane pola, typy, limity długości oraz dozwolone wartości dla `source`.
4.  **Implementacja Kontrolera:**
    -   Pobrać `user_id` z kontekstu żądania (po autentykacji).
    -   Pobrać i zwalidować ciało żądania przy użyciu schematu Zod.
    -   Obsłużyć błędy walidacji (zwrócić 400).
    -   Wywołać odpowiednią metodę serwisu `FlashcardService`.
    -   Obsłużyć sukces (zwrócić 201 z utworzonymi danymi) i błędy serwera (zwrócić 500).
5.  **Implementacja Serwisu (`FlashcardService`):**
    -   Utworzyć serwis `FlashcardService`, jeśli nie istnieje.
    -   Zaimplementować metodę `createFlashcards(data: FlashcardProposalDTO | FlashcardProposalDTO[], userId: string): Promise<FlashcardDTO | FlashcardDTO[]>`.
    -   Wewnątrz metody:
        -   Zamapować dane wejściowe na format oczekiwany przez bazę danych (dodając `user_id`).
        -   Wykorzystać `SupabaseClient` (@/src/db/supabase.client.ts) do wykonania operacji wstawienia (`insert`) do tabeli `flashcards`. Użyć opcji batch insert dla tablicy danych.
        -   Obsłużyć potencjalne błędy z Supabase Client i zgłosić je dalej (np. opakowane w niestandardowy typ błędu).
        -   Zwrócić utworzone dane fiszek pobrane z bazy danych.
6.  **Testy:**
    -   **Testy jednostkowe:** Napisać testy jednostkowe dla logiki walidacji (schemat Zod) i logiki serwisu `FlashcardService` (mockując klienta Supabase).
    -   **Testy integracyjne:** Napisać testy integracyjne dla endpointu `POST /flashcards`, obejmujące różne scenariusze: tworzenie pojedynczej fiszki, tworzenie wielu fiszek, przypadki błędów (walidacja, autentykacja).
7.  **Logowanie:** Upewnić się, że błędy serwera (5xx) są odpowiednio logowane wraz z kontekstem (np. stack trace, szczegóły błędu z bazy danych) dla celów diagnostycznych.
8.  **Dokumentacja:** Zaktualizować dokumentację API (np. Swagger/OpenAPI), jeśli jest używana, aby odzwierciedlić implementację endpointu. 