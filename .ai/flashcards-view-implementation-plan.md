# Plan implementacji widoku: Lista Fiszki

## 1. Przegląd
Widok "Lista Fiszki" jest głównym interfejsem dla zalogowanego użytkownika do zarządzania swoimi fiszkami. Umożliwia przeglądanie istniejących fiszek w formie paginowanej tabeli, ręczne dodawanie nowych fiszek, edycję oraz usuwanie istniejących. Widok wykorzystuje komponenty z biblioteki PrimeNG do budowy interfejsu i komunikuje się z backendem w celu wykonywania operacji CRUD.

## 2. Routing widoku
Widok powinien być dostępny pod ścieżką `/flashcards`.

## 3. Struktura komponentów
```
FlashcardListComponent (/flashcards) [Route Component]
├── p-toast (PrimeNG MessageService)
├── p-confirmDialog (PrimeNG ConfirmationService)
├── div.flex.justify-between.items-center.mb-4
│   └── p-button (label="Dodaj nową fiszkę", icon="pi pi-plus")
├── FlashcardTableComponent
│   ├── p-table [value]="state().flashcards" [loading]="state().loading" ... >
│   │   ├── (Kolumny: Front, Back, Akcje)
│   │   └── (Przyciski w kolumnie Akcje: p-button icon="pi pi-pencil", p-button icon="pi pi-trash")
│   └── p-paginator [rows]="state().rows" [totalRecords]="state().totalRecords" [first]="state().first" (onPageChange)="onPageChange($event)"
└── p-dialog [header]="state().flashcardBeingEdited ? 'Edytuj fiszkę' : 'Dodaj nową fiszkę'" [(visible)]="state().isFormModalVisible" [modal]="true" >
    └── app-flashcard-form [isVisible]="state().isFormModalVisible" [flashcardToEdit]="state().flashcardBeingEdited" (save)="onSave($event)" (close)="onCloseFormModal()" >
```

## 4. Szczegóły komponentów

### `FlashcardListComponent`
-   **Opis komponentu:** Główny komponent kontenerowy dla widoku `/flashcards`. Odpowiedzialny za zarządzanie stanem widoku (lista fiszek, paginacja, stan ładowania, błędy, widoczność modali), pobieranie danych z API, obsługę logiki biznesowej operacji CRUD oraz koordynację komponentów podrzędnych.
-   **Główne elementy:** Przycisk "Dodaj nową fiszkę" (`p-button`), komponent tabeli (`FlashcardTableComponent`), modal formularza (`p-dialog` zawierający `FlashcardFormComponent`), globalne serwisy PrimeNG (`MessageService` dla `p-toast`, `ConfirmationService` dla `p-confirmDialog`).
-   **Obsługiwane interakcje/zdarzenia:**
    -   Inicjalizacja komponentu (`ngOnInit`): Ładowanie pierwszej strony fiszek.
    -   Kliknięcie przycisku "Dodaj nową": Otwarcie modala formularza w trybie dodawania.
    -   Zdarzenie `edit` z `FlashcardTableComponent`: Otwarcie modala formularza w trybie edycji z danymi klikniętej fiszki.
    -   Zdarzenie `delete` z `FlashcardTableComponent`: Wyświetlenie modala potwierdzenia usunięcia.
    -   Zdarzenie `pageChange` z `FlashcardTableComponent`: Pobranie nowej strony danych.
    -   Zdarzenie `save` z `FlashcardFormComponent`: Wywołanie odpowiedniej metody API (create lub update).
    -   Zdarzenie `close` z `FlashcardFormComponent`: Zamknięcie modala formularza.
    -   Potwierdzenie usunięcia w `p-confirmDialog`: Wywołanie metody API delete.
-   **Obsługiwana walidacja:** Brak bezpośredniej walidacji, deleguje do `FlashcardFormComponent`.
-   **Typy:** `FlashcardListState`, `FlashcardDTO`, `LazyLoadEvent`, `ConfirmationService`, `MessageService`.
-   **Propsy:** Brak (jest komponentem routowalnym).

### `FlashcardTableComponent`
-   **Opis komponentu:** Komponent prezentacyjny odpowiedzialny za wyświetlanie listy fiszek w tabeli (`p-table`) wraz z paginacją (`p-paginator`) i przyciskami akcji (Edytuj, Usuń). Wyświetla również stan ładowania oraz potencjalny stan pusty (gdy brak fiszek).
-   **Główne elementy:** Tabela `p-table` z definicją kolumn (Front, Back, Akcje), paginator `p-paginator`, przyciski `p-button` w kolumnie akcji.
-   **Obsługiwane interakcje/zdarzenia (Emitowane):**
    -   `edit: FlashcardDTO`: Emitowane po kliknięciu przycisku "Edytuj".
    -   `delete: FlashcardDTO`: Emitowane po kliknięciu przycisku "Usuń".
    -   `pageChange: LazyLoadEvent`: Emitowane przez paginator przy zmianie strony lub liczby wierszy.
-   **Obsługiwana walidacja:** Brak.
-   **Typy:** `FlashcardDTO`, `LazyLoadEvent`.
-   **Propsy:** `flashcards: FlashcardDTO[]`, `loading: boolean`, `totalRecords: number`, `rows: number`, `first: number`.

### `FlashcardFormComponent`
-   **Opis komponentu:** Komponent prezentacyjny, wyświetlany wewnątrz modala (`p-dialog`), zawierający formularz (Angular Reactive Forms) do dodawania lub edycji fiszki. Odpowiedzialny za walidację pól formularza.
-   **Główne elementy:** Formularz (`<form [formGroup]="flashcardForm">`), pola tekstowe `p-inputtext` dla "Przód" i "Tył" (`textarea` dla Tył może być lepsze), przyciski `p-button` "Zapisz" i "Anuluj". Elementy do wyświetlania błędów walidacji.
-   **Obsługiwane interakcje/zdarzenia (Emitowane):**
    -   `save: FlashcardFormData`: Emitowane po kliknięciu przycisku "Zapisz", gdy formularz jest poprawny. Przekazuje dane z formularza (wraz z `id` w trybie edycji).
    -   `close: void`: Emitowane po kliknięciu przycisku "Anuluj" lub zamknięciu modala.
-   **Obsługiwana walidacja:**
    -   Pole `front`: Wymagane (`Validators.required`). Max 200 znaków (`Validators.maxLength(200)`).
    -   Pole `back`: Wymagane (`Validators.required`). Max 500 znaków (`Validators.maxLength(500)`).
    -   Wyświetlanie komunikatów o błędach przy polach.
    -   Dezaktywacja przycisku "Zapisz", gdy formularz jest niepoprawny lub trwa operacja zapisu.
-   **Typy:** `FormGroup`, `FlashcardDTO | null` (dla inputu), `FlashcardFormData` (dla outputu).
-   **Propsy:** `flashcardToEdit: FlashcardDTO | null`, `isVisible: boolean`.

## 5. Typy
-   **`FlashcardDTO` (z `src/types.ts`):**
    ```typescript
    export interface FlashcardDTO {
      id: number;
      front: string;
      back: string;
      source: Source; // 'ai-full' | 'ai-edited' | 'manual'
      created_at: string;
      updated_at: string;
      user_id: string;
      generation_id: number | null;
    }
    ```
-   **`CreateFlashcardCommand` (z `src/types.ts`):** Payload dla `POST /flashcards`.
    ```typescript
    export type CreateFlashcardCommand = Omit<FlashcardDTO, 'id' | 'created_at' | 'updated_at' | 'user_id' | 'generation_id'> & {
      generation_id?: number | null;
    };
    // W tym widoku używamy tylko: { front: string, back: string, source: 'manual' }
    ```
-   **`UpdateFlashcardCommand` (z `src/types.ts`):** Payload dla `PUT /flashcards/{id}`.
    ```typescript
    export type UpdateFlashcardCommand = Partial<Omit<CreateFlashcardCommand, 'generation_id'>> & {
      generation_id?: number | null;
    };
    // W tym widoku używamy tylko: { front?: string, back?: string }
    ```
-   **`FlashcardListState` (ViewModel):** Interfejs dla sygnału stanu w `FlashcardListComponent`.
    ```typescript
    interface FlashcardListState {
      flashcards: FlashcardDTO[];      // Lista fiszek na bieżącej stronie
      totalRecords: number;         // Całkowita liczba fiszek
      loading: boolean;             // Stan ładowania danych/operacji
      error: string | null;         // Komunikat ostatniego błędu
      rows: number;                 // Liczba wierszy na stronę (limit)
      first: number;                // Indeks pierwszego rekordu (offset)
      isFormModalVisible: boolean;  // Widoczność modala formularza
      flashcardBeingEdited: FlashcardDTO | null; // Dane do edycji lub null dla dodawania
    }
    ```
-   **`FlashcardFormData` (ViewModel):** Dane emitowane przez formularz.
    ```typescript
    interface FlashcardFormData {
      id?: number;                  // ID fiszki (tylko przy edycji)
      front: string;
      back: string;
    }
    ```
-   **`LazyLoadEvent` (PrimeNG):** Obiekt zdarzenia z `p-paginator`.
    ```typescript
    interface LazyLoadEvent {
      first?: number; // Indeks pierwszego rekordu strony
      rows?: number;  // Liczba wierszy na stronie
      // ... inne pola sortowania/filtrowania (nieużywane w tym planie)
    }
    ```

## 6. Zarządzanie stanem
Stan widoku `FlashcardListComponent` będzie zarządzany przy użyciu Angular Signals. Główny stan będzie przechowywany w pojedynczym sygnale:
`state = signal<FlashcardListState>(initialState);`

Aktualizacje stanu będą dokonywane za pomocą metod `state.update()` lub `state.mutate()` wewnątrz metod obsługujących akcje użytkownika i odpowiedzi API. Stan formularza w `FlashcardFormComponent` będzie zarządzany lokalnie za pomocą Angular `ReactiveFormsModule` (`FormGroup`, `FormControl`). Nie przewiduje się potrzeby tworzenia dedykowanych custom hooks/kompozycji.

## 7. Integracja API
Należy stworzyć serwis `FlashcardApiService` z następującymi metodami, wykorzystującymi `HttpClient`:
-   `getFlashcards(params: { limit: number, offset: number }): Observable<{ flashcards: FlashcardDTO[], totalRecords: number }>` -> `GET /flashcards`
-   `createFlashcard(data: { front: string, back: string, source: 'manual' }): Observable<FlashcardDTO>` -> `POST /flashcards` (wysyła `CreateFlashcardCommand`)
-   `updateFlashcard(id: number, data: { front: string, back: string }): Observable<FlashcardDTO>` -> `PUT /flashcards/{id}` (wysyła `UpdateFlashcardCommand`)
-   `deleteFlashcard(id: number): Observable<void>` -> `DELETE /flashcards/{id}`

Interceptor HTTP musi być skonfigurowany do dodawania nagłówka `Authorization: Bearer <token>`.

**Typy żądania/odpowiedzi:**
-   `GET /flashcards`: Żądanie: `{ limit, offset }`. Odpowiedź: `{ flashcards: FlashcardDTO[], totalRecords: number }` (lub pełna odpowiedź API, którą trzeba zmapować).
-   `POST /flashcards`: Żądanie: `CreateFlashcardCommand` (`{ front, back, source: 'manual' }`). Odpowiedź: `FlashcardDTO`.
-   `PUT /flashcards/{id}`: Żądanie: `UpdateFlashcardCommand` (`{ front, back }`). Odpowiedź: `FlashcardDTO`.
-   `DELETE /flashcards/{id}`: Żądanie: Brak ciała. Odpowiedź: Brak ciała (status 200/204).

## 8. Interakcje użytkownika
-   **Ładowanie widoku:** Pobranie i wyświetlenie pierwszej strony fiszek.
-   **Paginacja:** Kliknięcie na paginatorze powoduje pobranie i wyświetlenie odpowiedniej strony fiszek.
-   **Dodawanie fiszki:** Kliknięcie "Dodaj nową" -> Otwarcie pustego modala -> Wypełnienie formularza -> Kliknięcie "Zapisz" -> Walidacja -> Wywołanie API POST -> Zamknięcie modala -> Odświeżenie listy -> Powiadomienie.
-   **Edycja fiszki:** Kliknięcie "Edytuj" przy fiszce -> Otwarcie modala z danymi fiszki -> Modyfikacja -> Kliknięcie "Zapisz" -> Walidacja -> Wywołanie API PUT -> Zamknięcie modala -> Odświeżenie listy -> Powiadomienie.
-   **Anulowanie w modalu:** Kliknięcie "Anuluj" -> Zamknięcie modala bez zmian.
-   **Usuwanie fiszki:** Kliknięcie "Usuń" przy fiszce -> Otwarcie modala potwierdzenia -> Kliknięcie "Tak" -> Wywołanie API DELETE -> Odświeżenie listy -> Powiadomienie. Kliknięcie "Nie" -> Zamknięcie modala potwierdzenia.

## 9. Warunki i walidacja
Walidacja odbywa się w `FlashcardFormComponent` przy użyciu Angular Reactive Forms:
-   **Pole `front`:**
    -   Warunek: Musi być niepuste (`Validators.required`).
    -   Warunek: Długość <= 200 znaków (`Validators.maxLength(200)`).
    -   Wpływ na UI: Wyświetlenie komunikatu błędu pod polem, jeśli warunek niespełniony i pole dotknięte (`touched`). Dezaktywacja przycisku "Zapisz".
-   **Pole `back`:**
    -   Warunek: Musi być niepuste (`Validators.required`).
    -   Warunek: Długość <= 500 znaków (`Validators.maxLength(500)`).
    -   Wpływ na UI: Wyświetlenie komunikatu błędu pod polem, jeśli warunek niespełniony i pole dotknięte (`touched`). Dezaktywacja przycisku "Zapisz".

## 10. Obsługa błędów
-   Błędy komunikacji z API (sieciowe, serwera 5xx) będą przechwytywane w `FlashcardApiService` lub w `FlashcardListComponent`.
-   Stan `loading` w `FlashcardListState` zostanie ustawiony na `false`.
-   Stan `error` w `FlashcardListState` zostanie ustawiony na odpowiedni komunikat.
-   Użytkownik zostanie poinformowany o błędzie za pomocą `MessageService` i komponentu `p-toast` (np. "Nie udało się pobrać fiszek.", "Nie udało się zapisać fiszki.", "Nie udało się usunąć fiszki.").
-   Błędy walidacji API (400) (teoretycznie nie powinny wystąpić przy poprawnej walidacji frontendowej) również zostaną wyświetlone w `p-toast`.
-   Błąd 404 przy próbie edycji/usunięcia nieistniejącej fiszki spowoduje wyświetlenie błędu w `p-toast` i odświeżenie listy.
-   Błędy 401 (brak autoryzacji) powinny być obsługiwane globalnie przez interceptor HTTP (np. przekierowanie do strony logowania).

## 11. Kroki implementacji
1.  **Utworzenie komponentów:** Stworzyć pliki dla `FlashcardListComponent`, `FlashcardTableComponent`, `FlashcardFormComponent`.
2.  **Routing:** Skonfigurować routing w Angularze, aby ścieżka `/flashcards` prowadziła do `FlashcardListComponent`.
3.  **Implementacja `FlashcardListComponent`:**
    -   Zdefiniować sygnał `state` z interfejsem `FlashcardListState`.
    -   Wstrzyknąć wymagane serwisy (`FlashcardApiService`, `ConfirmationService`, `MessageService`).
    -   Zaimplementować metodę `loadFlashcards(event?: LazyLoadEvent)` do pobierania danych z API i aktualizacji stanu.
    -   Wywołać `loadFlashcards()` w `ngOnInit`.
    -   Zaimplementować metody obsługi otwierania/zamykania modala formularza (`openAddModal`, `openEditModal`, `onCloseFormModal`).
    -   Zaimplementować metodę `onSave(formData: FlashcardFormData)` wywołującą `createFlashcard` lub `updateFlashcard` z serwisu API, obsługującą odpowiedź i błędy, aktualizującą stan i pokazującą powiadomienia toast.
    -   Zaimplementować metodę `handleDelete(flashcard: FlashcardDTO)` używającą `ConfirmationService` i wywołującą `deleteFlashcard` z serwisu API, obsługującą odpowiedź i błędy, aktualizującą stan i pokazującą powiadomienia toast.
    -   Zaimplementować szablon HTML komponentu, używając `FlashcardTableComponent`, `p-dialog`, `p-button`, `p-toast`, `p-confirmDialog`.
4.  **Implementacja `FlashcardTableComponent`:**
    -   Zdefiniować `@Input()` dla `flashcards`, `loading`, `totalRecords`, `rows`, `first`.
    -   Zdefiniować `@Output()` dla `edit`, `delete`, `pageChange`.
    -   Zaimplementować szablon HTML z `p-table` i `p-paginator`, bindować dane i emitować zdarzenia.
    -   Dodać obsługę stanu pustego (np. komunikat `*ngIf="!loading && flashcards.length === 0"`).
5.  **Implementacja `FlashcardFormComponent`:**
    -   Zdefiniować `@Input()` dla `flashcardToEdit`, `isVisible`.
    -   Zdefiniować `@Output()` dla `save`, `close`.
    -   Zaimplementować `ReactiveFormsModule` (`FormGroup`, `FormControl`) z odpowiednimi walidatorami (`required`, `maxLength`).
    -   Zaimplementować logikę wypełniania formularza danymi z `flashcardToEdit` przy inicjalizacji/zmianie inputu.
    -   Zaimplementować metodę `onSubmit()` emitującą zdarzenie `save` z danymi formularza (w tym `id` jeśli edycja).
    -   Zaimplementować metodę `onCancel()` emitującą zdarzenie `close`.
    -   Zaimplementować szablon HTML formularza z polami `p-inputtext`/`textarea`, przyciskami i wyświetlaniem błędów walidacji.
6.  **Implementacja `FlashcardApiService`:**
    -   Stworzyć serwis.
    -   Wstrzyknąć `HttpClient`.
    -   Zaimplementować metody `getFlashcards`, `createFlashcard`, `updateFlashcard`, `deleteFlashcard` wykonujące odpowiednie żądania HTTP.
    -   Dodać obsługę błędów (np. `catchError`).
7.  **Konfiguracja Modułu:** Zaimportować wymagane moduły PrimeNG (`TableModule`, `PaginatorModule`, `DialogModule`, `ButtonModule`, `InputTextModule`, `ToastModule`, `ConfirmDialogModule`) oraz `ReactiveFormsModule` w odpowiednim module Angulara.
8.  **Styling:** Dostosować style przy użyciu Tailwind, potencjalnie nadpisując style PrimeNG tam, gdzie to konieczne.
9.  **Testowanie:** Przeprowadzić testy jednostkowe dla logiki komponentów i serwisu oraz testy E2E dla przepływów użytkownika (dodawanie, edycja, usuwanie, paginacja). 