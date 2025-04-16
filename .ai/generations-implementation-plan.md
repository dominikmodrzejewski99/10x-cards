# API Endpoint Implementation Plan: POST /generations

## 1. Przegląd punktu końcowego
Endpoint służy do inicjowania procesu generowania fiszek przy użyciu AI na podstawie tekstu wejściowego przesłanego przez użytkownika. Endpoint weryfikuje token JWT, sprawdza długość tekstu (musi być od 1000 do 10000 znaków), komunikuje się z usługą AI oraz zapisuje metadane generacji w bazie danych. Na końcu zwraca wygenerowane fiszki oraz metadane (np. generated_count, generation_duration).

## 2. Szczegóły żądania
- Metoda HTTP: POST
- Struktura URL: /generations
- Parametry:
  - Wymagane:
    - Ciało żądania:
      - `source_text`: string (tekst o długości od 1000 do 10000 znaków)
  - Opcjonalne:
    - `model`: string (nazwa modelu AI do użycia, jeśli nie podano, używany jest model domyślny)
- Przykładowe ciało żądania:
  ```json
  {
    "source_text": "Przykładowy tekst o długości od 1000 do 10000 znaków...",
    "model": "chosen-model-name"
  }
  ```

## 3. Wykorzystywane typy
- @types:
  - `GenerateFlashcardsCommand` (zdefiniowany w pliku `angular/src/types.ts`)
  - Dodatkowe DTO dla metadanych generacji mogą być uzupełnione według potrzeb

## 4. Szczegóły odpowiedzi
- Status 200: Generowanie zakończone sukcesem, zwracana jest lista wygenerowanych propozycji fiszek oraz metadane generacji (np. `generated_count`, `generation_duration`).
- Status 400: Błąd walidacji danych wejściowych (np. niepoprawna długość tekstu).
- Status 401: Błąd autoryzacji - brak lub nieprawidłowy token.
- Status 500: Błąd po stronie serwera (np. problem z usługą AI lub bazą danych).

## 5. Przepływ danych
1. Klient wysyła żądanie POST na endpoint `/generations` z odpowiednim tokenem JWT i danymi wejściowymi.
2. Kontroler weryfikuje autoryzację oraz waliduje dane wejściowe (sprawdzenie długości `text` oraz opcjonalnego pola `model`).
3. Dane są przekazywane do warstwy serwisowej (np. `generation.service`), która:
   - Inicjuje wywołanie zewnętrznej usługi AI (np. Openrouter.ai)
   - Monitoruje czas generacji
   - Otrzymuje propozycje fiszek i metadane generacji
4. Informacje o generacji są zapisywane w tabeli `generation` (@db-resources), a w przypadku błędów odpowiednie logi trafiają do tabeli `generation_error_logs`.
5. Kontroler zwraca odpowiedź JSON z kodem 200 lub odpowiednim kodem błędu.

## 6. Względy bezpieczeństwa
- Autoryzacja: Użytkownicy mają dostęp jedynie do swoich danych, co jest wymuszane przez mechanizmy RLS w bazie danych.
- Walidacja wejścia: Weryfikacja, czy tekst mieści się w przedziale 1000-10000 znaków oraz czy opcjonalne pole `model` jest poprawne.
- Komunikacja: Zapewnienie bezpiecznej komunikacji (HTTPS) między klientem, backendem oraz usługą AI.

## 7. Obsługa błędów
- Błąd walidacji (400): Zwracany, gdy `source_text` nie spełnia wymagań długościowych lub inne dane wejściowe są nieprawidłowe.
- Błąd autoryzacji (401): Zwracany w przypadku nieobecnego lub nieprawidłowego tokena.
- Błąd po stronie serwera (500): Występuje np. przy problemach z usługą AI lub zapisywaniu danych; błędy te powinny być rejestrowane w tabeli `generation_error_logs`.

## 8. Rozważania dotyczące wydajności
- Ograniczenie długości tekstu wejściowego do zakresu 1000-10000 znaków, aby zapobiec nadmiernemu obciążeniu.
- Indeksacja kolumny `user_id` w tabeli `generation` dla szybkich zapytań.
- Możliwość wprowadzenia paginacji wyników, jeżeli liczba generacji wzrośnie.

## 9. Etapy wdrożenia
1. Utworzenie lub aktualizacja endpointu POST `/generations` w warstwie kontrolera.
2. Implementacja weryfikacji tokenu JWT oraz walidacji danych wejściowych (sprawdzenie długości `source_text` i poprawności opcjonalnego `model`).
3. Stworzenie warstwy serwisowej (`generation.service`), która:
   - Komunikuje się z usługą AI (np. Openrouter.ai)
   - Monitoruje czas generacji i zbiera metadane
   - Zapisuje dane generacji w bazie danych (tabela `generation`)
4. Implementacja mechanizmu rejestrowania błędów (zapisywanie informacji o błędach w tabeli `generation_error_logs`).
5. Testowanie integracyjne endpointu (testy jednostkowe i integracyjne).
6. Przegląd i optymalizacja kodu oraz weryfikacja wydajności (np. indeksacja bazy danych).
7. Aktualizacja dokumentacji API wraz z przykładami żądań i odpowiedzi.

## 10. Diagram Drzewa Komponentów
```
FlashcardListComponent (/flashcards)
├── Button (Dodaj nową)
├── FlashcardTableComponent
│   ├── p-table
│   │   └── (Iteracja po flashcards: front, back, [przyciski Edit, Delete])
│   └── p-paginator
├── p-dialog [Modal Dodaj/Edytuj] (kontrolowany przez FlashcardListComponent)
│   └── FlashcardFormComponent
│       ├── InputText (Front)
│       ├── InputText (Back)
│       ├── Button (Zapisz)
│       └── Button (Anuluj)
└── p-confirmDialog (globalny lub kontrolowany przez FlashcardListComponent)
└── p-toast (globalny dla powiadomień)
```

## 11. Wymagane DTO i Typy ViewModel
- `FlashcardDTO` (z `@angular/src/types.ts`): Do przechowywania i wyświetlania danych fiszek.
- `CreateFlashcardCommand` (z `@angular/src/types.ts`): Typ payloadu dla `POST /flashcards`.
  * `front: string`
  * `back: string`
  * `source: 'manual'` (ustawione na stałe w tym widoku)
  * `generation_id?: number | null` (nieużywane w tym widoku, ustawione na `null` lub pominięte)
- `UpdateFlashcardCommand` (z `@angular/src/types.ts`): Typ payloadu dla `PUT /flashcards/{id}`.
  * `front?: string`
  * `back?: string`
  * `source?: 'manual'` (opcjonalne, ale prawdopodobnie nie zmieniamy w edycji)
- **Nowy ViewModel:** `FlashcardFormState` (używany w `FlashcardFormComponent` i `FlashcardListComponent`):
  * `id?: number`: ID fiszki (tylko w trybie edycji).
  * `front: string`: Wartość pola "Przód".
  * `back: string`: Wartość pola "Tył".
  * *Cel:* Reprezentuje dane wprowadzane/edytowane w formularzu.
- **Nowy Typ:** `FlashcardListState` (stan zarządzany w `FlashcardListComponent`):
  * `flashcards: FlashcardDTO[]`: Lista fiszek.
  * `totalRecords: number`: Całkowita liczba fiszek dla paginacji.
  * `loading: boolean`: Stan ładowania danych/operacji.
  * `error: string | null`: Komunikat błędu.
  * `rows: number`: Liczba rekordów na stronę (limit).
  * `first: number`: Indeks pierwszego rekordu na bieżącej stronie (offset).
  * `isFormModalVisible: boolean`: Widoczność modala formularza.
  * `flashcardBeingEdited: FlashcardDTO | null`: Dane fiszki do edycji (lub `null` dla dodawania).

## 12. Zmienne Stanu i Hooki (w Angularze: Serwisy i Sygnały)
- W `FlashcardListComponent`:
  * `state: Signal<FlashcardListState>`: Główny sygnał przechowujący cały stan widoku (lista, ładowanie, błędy, paginacja, modal). Użycie `signal()` i `update()`/`mutate()`.
  * Wstrzyknięte serwisy: `FlashcardApiService`, `ConfirmationService`, `MessageService`.
- W `FlashcardFormComponent`:
  * `flashcardForm: FormGroup`: Reaktywny formularz Angulara do zarządzania polami `front`, `back` i ich walidacją.
- Nie ma potrzeby tworzenia dedykowanych custom hooków (kompozycji); wbudowane mechanizmy Angulara (serwisy, sygnały, Reactive Forms) są wystarczające.

## 13. Wymagane Wywołania API i Akcje Frontendowe
- Komponent `FlashcardListComponent` ładuje się lub zmienia się strona paginacji (`onPageChange`) -> wywołanie `flashcardApiService.getFlashcards({ limit: state().rows, offset: state().first })` -> aktualizacja `state` (flashcards, totalRecords, loading).
- Kliknięcie "Dodaj nową" -> aktualizacja `state` (isFormModalVisible=true, flashcardBeingEdited=null).
- Kliknięcie "Edytuj" -> aktualizacja `state` (isFormModalVisible=true, flashcardBeingEdited=wybrana_fiszka).
- Zapis formularza (dodawanie) (`save` z `FlashcardFormComponent`) -> wywołanie `flashcardApiService.createFlashcard({ front, back, source: 'manual' })` -> po sukcesie: aktualizacja `state` (isFormModalVisible=false), odświeżenie listy (`getFlashcards`), pokazanie `p-toast` (sukces). Po błędzie: pokazanie `p-toast` (błąd), aktualizacja `state` (error, loading=false).
- Zapis formularza (edycja) (`save` z `FlashcardFormComponent`) -> wywołanie `flashcardApiService.updateFlashcard(id, { front, back })` -> po sukcesie: aktualizacja `state` (isFormModalVisible=false), odświeżenie listy (`getFlashcards`), pokazanie `p-toast` (sukces). Po błędzie: pokazanie `p-toast` (błąd), aktualizacja `state` (error, loading=false).
- Kliknięcie "Usuń" -> wywołanie `confirmationService.confirm({...})`.
- Potwierdzenie usunięcia -> wywołanie `flashcardApiService.deleteFlashcard(id)` -> po sukcesie: odświeżenie listy (`getFlashcards`), pokazanie `p-toast` (sukces). Po błędzie: pokazanie `p-toast` (błąd).

## 14. Mapowanie User Stories na Implementację
- "Widzieć listę": `FlashcardListComponent` + `FlashcardTableComponent` + `flashcardApiService.getFlashcards`.
- "Dodać fiszkę": Przycisk "Dodaj nową", `p-dialog` + `FlashcardFormComponent` (tryb dodawania) + `flashcardApiService.createFlashcard`.
- "Edytować fiszkę": Przycisk "Edytuj", `p-dialog` + `FlashcardFormComponent` (tryb edycji) + `flashcardApiService.updateFlashcard`.
- "Usunąć fiszkę": Przycisk "Usuń", `p-confirmDialog` + `flashcardApiService.deleteFlashcard`.

## 15. Interakcje Użytkownika i Oczekiwane Wyniki
- Wejście na `/flashcards`: Wyświetla tabelę z fiszkami (lub stan pusty), paginator.
- Kliknięcie "Dodaj nową": Otwiera modal z pustym formularzem.
- Kliknięcie "Edytuj": Otwiera modal z formularzem wypełnionym danymi fiszki.
- Wypełnienie/edycja formularza i kliknięcie "Zapisz":
  * Jeśli walidacja OK: Wywołanie API, zamknięcie modala, odświeżenie listy, powiadomienie o sukcesie.
  * Jeśli walidacja BŁĄD: Wyświetlenie błędów w formularzu, modal pozostaje otwarty.
- Kliknięcie "Anuluj" w modalu: Zamknięcie modala bez zmian.
- Kliknięcie "Usuń": Wyświetlenie modala potwierdzającego.
- Potwierdzenie usunięcia: Wywołanie API, odświeżenie listy, powiadomienie o sukcesie.
- Anulowanie usunięcia: Zamknięcie modala potwierdzającego.
- Zmiana strony w paginatorze: Pobranie nowej strony danych, aktualizacja tabeli.

## 16. Warunki API i Walidacja Komponentów
- Formularz (`FlashcardFormComponent`):
  * Pole `front`: Wymagane (`Validators.required`). Maksymalna długość 200 znaków (`Validators.maxLength(200)`).
  * Pole `back`: Wymagane (`Validators.required`). Maksymalna długość 500 znaków (`Validators.maxLength(500)`).
  * Walidacja realizowana za pomocą Angular Reactive Forms.
  * Przycisk "Zapisz" jest deaktywowany (`[disabled]="flashcardForm.invalid"`), jeśli formularz jest nieprawidłowy.
  * Komunikaty o błędach wyświetlane przy polach (np. używając `*ngIf="flashcardForm.get('front')?.invalid && flashcardForm.get('front')?.touched"`).

## 17. Scenariusze Błędów i Obsługa
- Błąd sieci/serwera (5xx) podczas pobierania listy (`GET`): Wyświetlić komunikat błędu za pomocą `MessageService` (`p-toast`). `FlashcardTableComponent` może wyświetlić dedykowany stan błędu zamiast tabeli. Stan `loading` ustawiony na `false`.
- Błąd walidacji API (400) przy zapisie (`POST`/`PUT`): Teoretycznie walidacja frontendowa powinna temu zapobiec, ale jeśli wystąpi, wyświetlić błąd z API w `p-toast`. Modal może pozostać otwarty. Stan `loading` na `false`.
- Inne błędy serwera (5xx) przy zapisie (`POST`/`PUT`): Wyświetlić generyczny błąd w `p-toast`. Modal może zostać zamknięty. Stan `loading` na `false`.
- Fiszka nie znaleziona (404) przy edycji/usuwaniu (`PUT`/`DELETE`): Wyświetlić błąd w `p-toast`. Odświeżyć listę, aby usunąć nieistniejącą fiszkę z widoku. Stan `loading` na `false`.
- Brak autoryzacji (401): Obsługiwane globalnie przez interceptor HTTP (przekierowanie na login).
- Użycie `MessageService` (PrimeNG) do wyświetlania powiadomień toast.
- Użycie `ConfirmationService` (PrimeNG) do obsługi modala potwierdzenia usunięcia.

## 18. Potencjalne Wyzwania i Rozwiązania
- **Zarządzanie stanem modala:** Użycie sygnałów w komponencie kontenera (`FlashcardListComponent`) do kontrolowania widoczności (`isFormModalVisible`) i przekazywania danych do edycji (`flashcardBeingEdited`). `FlashcardFormComponent` odbiera te dane jako `@Input()`.
- **Logika paginacji:** Prawidłowe mapowanie zdarzenia `LazyLoadEvent` z `p-paginator` (które zawiera `first` i `rows`) na parametry `offset` i `limit` dla API. Aktualizacja stanu `totalRecords` po każdym pobraniu danych.
- **Odświeżanie listy po CRUD:** Po każdej udanej operacji `POST`, `PUT`, `DELETE` należy ponownie wywołać metodę pobierającą listę fiszek (`getFlashcards`), aby zapewnić spójność danych. Należy uwzględnić aktualny stan paginacji przy odświeżaniu.
- **Optymalizacja żądań:** Unikać niepotrzebnych żądań API. Odświeżać listę tylko wtedy, gdy jest to konieczne.
- **Dostępność:** Stosować się do wytycznych WCAG. Używać semantycznego HTML. Zapewnić odpowiednie atrybuty ARIA dla komponentów PrimeNG (często robią to automatycznie, ale warto sprawdzić). Testować nawigację klawiaturą.
- **Stylowanie PrimeNG + Tailwind:** Może wymagać nadpisywania stylów PrimeNG lub użycia `::ng-deep` (z ostrożnością) lub konfiguracji Tailwind do pracy z klasami PrimeNG. 