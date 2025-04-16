# Plan implementacji widoku Generowania Fiszki (Generate View)

## 1. Przegląd
Widok "Generowania Fiszki" umożliwia użytkownikom wklejenie tekstu źródłowego, zainicjowanie procesu generowania fiszek przez AI (poprzez wywołanie odpowiedniego endpointu API), a następnie przeglądanie wygenerowanych propozycji. Widok obsługuje walidację danych wejściowych, wyświetlanie stanu ładowania oraz komunikatów o błędach. Umożliwia również zapisanie wszystkich wygenerowanych propozycji jako fiszek użytkownika.

## 2. Routing widoku
Widok powinien być dostępny pod ścieżką `/generate`. Zgodnie z `@.ai/ui.plan.md`, może to być domyślny widok po zalogowaniu/rejestracji.

## 3. Struktura komponentów
```
GenerateViewComponent (Container)
├── SourceTextareaComponent (Presentational)
├── GenerateButtonComponent (Presentational)
├── LoadingIndicatorComponent (Presentational)
├── ErrorMessageComponent (Presentational)
├── FlashcardProposalListComponent (Presentational)
│   └── (FlashcardProposalItemComponent - użyty wewnętrznie w pętli @for)
└── BulkSaveButtonComponent (Presentational) // Przycisk do zapisu wszystkich propozycji

```
*Uwaga: Usunięto `ActionButtonsComponent` na rzecz bardziej specyficznego `BulkSaveButtonComponent`.*

## 4. Szczegóły komponentów

### `GenerateViewComponent`
-   **Opis:** Główny kontener widoku `/generate`. Zarządza stanem całego procesu generowania i zapisu, obsługuje logikę wywołania API (generowanie i zapis) i koordynuje przepływ danych między komponentami podrzędnymi.
-   **Główne elementy:** Zawiera pozostałe komponenty tego widoku (`SourceTextareaComponent`, `GenerateButtonComponent`, `LoadingIndicatorComponent`, `ErrorMessageComponent`, `FlashcardProposalListComponent`, `BulkSaveButtonComponent`).
-   **Obsługiwane interakcje:** Reaguje na zdarzenia z komponentów podrzędnych (`(textChange)`, `(validityChange)` z `SourceTextareaComponent`, `(generateClick)` z `GenerateButtonComponent`, `(saveAllClick)` z `BulkSaveButtonComponent`). Inicjuje wywołania API (generowanie i zapis).
-   **Obsługiwana walidacja:** Brak bezpośredniej walidacji, polega na stanie `isTextValid` otrzymanym z `SourceTextareaComponent` do włączenia/wyłączenia przycisku generowania.
-   **Typy:** `GenerateViewModel`, `GenerateFlashcardsCommand`, `GenerationDTO`, `FlashcardProposalDTO`, `FlashcardDTO`.
-   **Propsy:** Brak (jest to komponent routowalny).

### `SourceTextareaComponent`
-   **Opis:** Komponent odpowiedzialny za pole tekstowe (`textarea`) do wprowadzania tekstu źródłowego. Implementuje walidację długości tekstu, wyświetla licznik znaków i komunikaty błędów inline.
-   **Główne elementy:** Element `<textarea>` (np. PrimeNG `pInputTextarea` z `[autoResize]="true"`), licznik znaków (np. `<span>{{currentLength}}/{{maxLength}}</span>`), miejsce na komunikat walidacyjny (np. `<small class="p-error">...</small>`).
-   **Obsługiwane interakcje:** Wprowadzanie tekstu przez użytkownika.
-   **Obsługiwana walidacja:**
    -   Minimalna długość tekstu: 1000 znaków. Komunikat: "Tekst musi zawierać co najmniej 1000 znaków."
    -   Maksymalna długość tekstu: 10000 znaków. Komunikat: "Tekst może zawierać maksymalnie 10000 znaków."
    -   Walidacja powinna odbywać się w czasie rzeczywistym. Można użyć Angular Reactive Forms z `Validators.minLength(1000)` i `Validators.maxLength(10000)`.
-   **Typy:** `string` (dla `ngModel` lub `formControl`).
-   **Propsy/Eventy:**
    -   `@Input() minLength: number = 1000;`
    -   `@Input() maxLength: number = 10000;`
    -   `@Output() textChange = new EventEmitter<string>();`
    -   `@Output() validityChange = new EventEmitter<boolean>();`

### `GenerateButtonComponent`
-   **Opis:** Przycisk (np. PrimeNG `pButton`) uruchamiający proces generowania fiszek. Jego stan `disabled` zależy od poprawności tekstu źródłowego i stanu ładowania.
-   **Główne elementy:** Element `<button>` (PrimeNG `pButton`).
-   **Obsługiwane interakcje:** Kliknięcie przez użytkownika.
-   **Obsługiwana walidacja:** Brak.
-   **Typy:** `boolean` (dla `disabled`).
-   **Propsy/Eventy:**
    -   `@Input() label: string = 'Generuj Fiszki';`
    -   `@Input() disabled: boolean = false;`
    -   `@Input() loading: boolean = false;` // Do wyświetlenia ikony ładowania na przycisku
    -   `@Output() generateClick = new EventEmitter<void>();`

### `LoadingIndicatorComponent`
-   **Opis:** Wyświetla wizualny wskaźnik ładowania (np. PrimeNG `ProgressSpinner`), gdy trwa komunikacja z API (zarówno generowanie, jak i zapis).
-   **Główne elementy:** Komponent `p-progressSpinner`.
-   **Obsługiwane interakcje:** Brak.
-   **Obsługiwana walidacja:** Brak.
-   **Typy:** `boolean` (dla `*ngIf`).
-   **Propsy:**
    -   `@Input() isLoading: boolean = false;`

### `ErrorMessageComponent`
-   **Opis:** Wyświetla komunikaty o błędach (np. błędy walidacji API, błędy serwera, błędy sieciowe) zarówno z procesu generowania, jak i zapisu.
-   **Główne elementy:** Komponent `p-messages` lub integracja z `MessageService` dla `p-toast`.
-   **Obsługiwane interakcje:** Możliwość zamknięcia komunikatu (jeśli używany jest `p-messages` z `closable`).
-   **Obsługiwana walidacja:** Brak.
-   **Typy:** `string | null` (dla treści błędu).
-   **Propsy:**
    -   `@Input() errorMessage: string | null = null;` (lub nasłuchuje na `MessageService`)

### `FlashcardProposalListComponent`
-   **Opis:** Renderuje listę wygenerowanych propozycji fiszek. Każda propozycja wyświetla tekst `front`, `back`. *Usunięto wzmiankę o przyszłych przyciskach akcji dla uproszczenia.*
-   **Główne elementy:** Pętla `@for` iterująca po liście propozycji. Dla każdego elementu: kontenery na `front` i `back` (np. `div` lub PrimeNG `Card`).
-   **Obsługiwane interakcje:** Brak.
-   **Obsługiwana walidacja:** Brak.
-   **Typy:** `FlashcardProposalViewModel[]`.
-   **Propsy/Eventy:**
    -   `@Input() proposals: FlashcardProposalViewModel[] = [];`

### `BulkSaveButtonComponent`
-   **Opis:** Przycisk (np. PrimeNG `pButton`) uruchamiający proces zapisywania *wszystkich* aktualnie wyświetlanych propozycji fiszek. Jego stan `disabled` zależy od tego, czy są jakieś propozycje do zapisania i czy nie trwa proces ładowania (generowania lub zapisu).
-   **Główne elementy:** Element `<button>` (PrimeNG `pButton`).
-   **Obsługiwane interakcje:** Kliknięcie przez użytkownika.
-   **Obsługiwana walidacja:** Brak.
-   **Typy:** `boolean` (dla `disabled`).
-   **Propsy/Eventy:**
    -   `@Input() label: string = 'Zapisz wszystkie propozycje';`
    -   `@Input() disabled: boolean = false;`
    -   `@Input() loading: boolean = false;` // Współdzielony stan ładowania z GenerateViewComponent
    -   `@Output() saveAllClick = new EventEmitter<void>();`

## 5. Typy

*   **DTO (z @angular/src/types.ts):**
    *   `GenerateFlashcardsCommand { text: string; model?: string; }`
    *   `GenerationDTO { id: number; accepted_edited_count: number | null; accepted_unedited_count: number | null; created_at: string; generated_count: number; generation_duration: number; model: string; source_text_hash: string; source_text_length: number; updated_at: string; user_id: string; }`
    *   `FlashcardProposalDTO { front: string; back: string; source: Source; }` (gdzie `Source = 'ai-full' | 'ai-edited' | 'manual'`)
    *   **`FlashcardDTO { id: number; front: string; back: string; source: Source; created_at: string; updated_at: string; user_id: string; generation_id: number | null; }` (Potrzebny do typu odpowiedzi API zapisu)**
*   **ViewModel (Zmodyfikowane i Nowe Typy):**
    *   **`GenerateViewModel`**: Zaktualizowany o stan ładowania zapisu.
        ```typescript
        interface GenerateViewModel {
          sourceText: string;
          isTextValid: boolean;
          isGenerating: boolean; // Czy trwa komunikacja z API generowania
          isSaving: boolean;     // Czy trwa komunikacja z API zapisu
          isLoading: boolean;    // Computed: isGenerating || isSaving
          generationResult: GenerationDTO | null;
          proposals: FlashcardProposalViewModel[];
          errorMessage: string | null;
          saveSuccessMessage: string | null; // Komunikat o sukcesie zapisu
        }
        ```
    *   **`FlashcardProposalViewModel`**: *(Bez zmian - na razie tożsame z DTO)*
        ```typescript
        type FlashcardProposalViewModel = FlashcardProposalDTO;
        ```

## 6. Zarządzanie stanem
Stan widoku będzie zarządzany wewnątrz `GenerateViewComponent` przy użyciu **sygnałów Angulara (Signals)**.

*   **Sygnały w `GenerateViewComponent`:**
    *   `sourceText = signal<string>('')` *(Bez zmian)*
    *   `isTextValid = signal<boolean>(false)` *(Bez zmian)*
    *   `isGenerating = signal<boolean>(false)`: Wskazuje, czy trwa proces generowania.
    *   `isSaving = signal<boolean>(false)`: Wskazuje, czy trwa proces zapisywania.
    *   `isLoading = computed(() => isGenerating() || isSaving())`: Sygnał pochodny wskazujący ogólny stan ładowania.
    *   `generationResult = signal<GenerationDTO | null>(null)` *(Bez zmian)*
    *   `proposals = signal<FlashcardProposalViewModel[]>([])`: Przechowuje listę wygenerowanych propozycji do wyświetlenia i zapisu.
    *   `errorMessage = signal<string | null>(null)`: Przechowuje komunikat o błędzie (generowania lub zapisu).
    *   `saveSuccessMessage = signal<string | null>(null)`: Przechowuje komunikat o sukcesie zapisu (do wyświetlenia np. w Toaście).

Logika biznesowa związana z wywołaniem API zostanie umieszczona w dedykowanych serwisach: `GenerationApiService` i `FlashcardApiService`.

## 7. Integracja API
Integracja z backendem będzie realizowana poprzez wywołanie endpointów:
1.  `POST /functions/v1/generations` (do generowania propozycji)
2.  `POST /functions/v1/flashcards` (do zapisywania propozycji jako fiszek)

*   **Serwis `GenerationApiService`:** *(Bez zmian)*
    *   Metoda: `generateFlashcards(command: GenerateFlashcardsCommand): Observable<{ generation: GenerationDTO, flashcards: FlashcardProposalDTO[] }>`
    *   Implementacja: *(Bez zmian)*
*   **Serwis `FlashcardApiService`:** Należy utworzyć nowy serwis.
    *   Metoda: `createFlashcards(flashcards: FlashcardProposalDTO[]): Observable<FlashcardDTO[]>`
    *   Implementacja: Metoda będzie używać wstrzykniętego `HttpClient` do wysłania żądania POST do `/functions/v1/flashcards`. **Wymaga dołączenia nagłówka `Authorization: Bearer <JWT_TOKEN>`**. Ciało żądania będzie tablicą obiektów `FlashcardProposalDTO`.
*   **Wywołanie w `GenerateViewComponent`:**
    ```typescript
    import { GenerationApiService } from './generation-api.service';
    import { FlashcardApiService } from '../flashcard/flashcard-api.service'; // Założona ścieżka
    import { GenerateFlashcardsCommand, GenerationDTO, FlashcardProposalDTO, FlashcardDTO } from '@app/types';
    import { MessageService } from 'primeng/api'; // Do wyświetlania Toastów
    // ... inne importy

    @Component({ 
      /* ... */ 
      providers: [MessageService] // Dodajemy MessageService
    })
    export class GenerateViewComponent {
      // --- Sygnały ---
      sourceText = signal<string>('');
      isTextValid = signal<boolean>(false);
      isGenerating = signal<boolean>(false);
      isSaving = signal<boolean>(false);
      isLoading = computed(() => this.isGenerating() || this.isSaving());
      generationResult = signal<GenerationDTO | null>(null);
      proposals = signal<FlashcardProposalViewModel[]>([]);
      errorMessage = signal<string | null>(null);
      // saveSuccessMessage - będziemy używać Toast

      // --- Computed Signals ---
      canGenerate = computed(() => this.isTextValid() && !this.isLoading());
      canSave = computed(() => this.proposals().length > 0 && !this.isLoading());

      constructor(
        private generationApi: GenerationApiService,
        private flashcardApi: FlashcardApiService,
        private messageService: MessageService // Wstrzykujemy MessageService
      ) {}

      generate(): void {
        if (!this.canGenerate()) return;

        this.isGenerating.set(true);
        this.clearMessagesAndProposals();

        const command: GenerateFlashcardsCommand = { text: this.sourceText() };

        this.generationApi.generateFlashcards(command).subscribe({
          next: (response) => {
            this.proposals.set(response.flashcards);
            this.generationResult.set(response.generation);
            this.isGenerating.set(false);
          },
          error: (error) => {
            console.error('Błąd generowania fiszek:', error);
            this.handleApiError(error, 'generowania');
            this.isGenerating.set(false);
          }
        });
      }
      
      saveAllProposals(): void {
        if (!this.canSave()) return;

        this.isSaving.set(true);
        this.clearMessages(); // Czyścimy tylko komunikaty

        const flashcardsToSave: FlashcardProposalDTO[] = this.proposals(); 

        this.flashcardApi.createFlashcards(flashcardsToSave).subscribe({
            next: (savedFlashcards) => {
                this.messageService.add({ severity: 'success', summary: 'Sukces', detail: `Zapisano ${savedFlashcards.length} fiszek.` });
                this.proposals.set([]); // Czyścimy listę propozycji po zapisie
                this.generationResult.set(null); // Można też wyczyścić metadane generacji
                this.isSaving.set(false);
            },
            error: (error) => {
                console.error('Błąd zapisywania fiszek:', error);
                this.handleApiError(error, 'zapisywania');
                this.isSaving.set(false);
            }
        });
      }

      // Pomocnicza metoda obsługi błędów API
      private handleApiError(error: any, action: 'generowania' | 'zapisywania'): void {
          const defaultMessage = `Wystąpił nieoczekiwany błąd podczas ${action}. Spróbuj ponownie później.`;
          let message = defaultMessage;

          if (error.status === 400) {
              message = `Błąd walidacji danych wejściowych podczas ${action}. Sprawdź dane.`;
              // Można dodać bardziej szczegółową obsługę błędów walidacji, jeśli API je zwraca
              if (error.error?.details) {
                   console.error("Szczegóły błędu walidacji:", error.error.details);
                   // Można spróbować sformatować `error.error.details` w czytelny sposób
              }
          } else if (error.status === 401) {
              message = 'Błąd autoryzacji. Zaloguj się ponownie.';
          } else if (error.status >= 500) {
              message = `Błąd serwera podczas ${action}. Spróbuj ponownie później.`;
          }
          
          this.errorMessage.set(message);
          // Opcjonalnie: Wyświetl błąd także w Toaście
          this.messageService.add({ severity: 'error', summary: 'Błąd', detail: message, sticky: true }); 
      }
      
      // Pomocnicza metoda czyszczenia stanu
      private clearMessagesAndProposals(): void {
         this.errorMessage.set(null);
         this.proposals.set([]);
         this.generationResult.set(null);
         this.messageService.clear(); // Czyści istniejące toasty
      }

      private clearMessages(): void {
          this.errorMessage.set(null);
          this.messageService.clear();
      }
      
      // Metody do aktualizacji stanów na podstawie eventów z dzieci
      onTextChange(newText: string): void {
        this.sourceText.set(newText);
      }

      onValidityChange(isValid: boolean): void {
        this.isTextValid.set(isValid);
      }
    }
    ```
*   **Typy Żądania (Generowanie):** `GenerateFlashcardsCommand { text: string; model?: string; }`
*   **Typy Odpowiedzi (Generowanie - Sukces):** `{ generation: GenerationDTO, flashcards: FlashcardProposalDTO[] }`
*   **Typy Żądania (Zapis):** `FlashcardProposalDTO[]` (Tablica propozycji)
*   **Typy Odpowiedzi (Zapis - Sukces):** `FlashcardDTO[]` (Tablica zapisanych fiszek)
*   **Typy Odpowiedzi (Błąd):** *(Bez zmian)*

## 8. Interakcje użytkownika
-   **Wprowadzanie tekstu:** Użytkownik wpisuje tekst w `SourceTextareaComponent`. Komponent na bieżąco aktualizuje licznik znaków, wyświetla błędy walidacji i emituje zmiany (`textChange`, `validityChange`) do `GenerateViewComponent`.
-   **Kliknięcie "Generuj Fiszki":** Użytkownik klika przycisk w `GenerateButtonComponent`. Jeśli przycisk nie jest wyłączony (`canGenerate()` jest true), emitowane jest zdarzenie `generateClick`. `GenerateViewComponent` odbiera zdarzenie i rozpoczyna proces wywołania API (ustawia `isGenerating`, czyści poprzednie wyniki/błędy, wywołuje serwis API).
-   **Wyświetlanie ładowania:** Gdy `isLoading` jest `true`, `LoadingIndicatorComponent` staje się widoczny.
-   **Wyświetlanie wyników:** Po pomyślnym pobraniu danych z API, `GenerateViewComponent` aktualizuje sygnał `proposals`, co powoduje wyrenderowanie listy przez `FlashcardProposalListComponent`. Stan `isGenerating` jest ustawiany na `false`.
-   **Kliknięcie "Zapisz wszystkie propozycje":** Użytkownik klika przycisk w `BulkSaveButtonComponent`. Jeśli przycisk nie jest wyłączony (`canSave()` jest true), emitowane jest zdarzenie `saveAllClick`. `GenerateViewComponent` odbiera zdarzenie, ustawia `isSaving`, czyści komunikaty i wywołuje `flashcardApiService.createFlashcards()` z aktualną listą propozycji.
-   **Wyświetlanie sukcesu zapisu:** Po pomyślnym zapisaniu fiszek, `GenerateViewComponent` używa `MessageService` do wyświetlenia komunikatu Toast o sukcesie. Lista propozycji (`proposals`) jest czyszczona.
-   **Wyświetlanie błędów:** *(Rozszerzone o błędy z API zapisu fiszek)* W przypadku błędu API (generowania lub zapisu), `GenerateViewComponent` ustawia sygnał `errorMessage` (dla `ErrorMessageComponent`) i/lub używa `MessageService` do wyświetlenia komunikatu Toast o błędzie. Stan `isGenerating` lub `isSaving` jest ustawiany na `false`.

## 9. Warunki i walidacja
-   **Warunek:** Tekst źródłowy musi mieć długość między 1000 a 10000 znaków włącznie.
-   **Komponent:** `SourceTextareaComponent`.
-   **Weryfikacja:**
    -   Użycie Angular Reactive Forms (`FormControl`) z `Validators.minLength(1000)` i `Validators.maxLength(10000)`.
    -   Formularz powiązany z `<textarea>`.
    -   Status walidacji (`FormControl.valid` lub `FormControl.invalid`) oraz błędy (`FormControl.errors`) są wykorzystywane do:
        -   Wyświetlania komunikatów błędów inline (np. `*ngIf="control.hasError('minlength')"`).
        -   Emitowania stanu poprawności (`validityChange.emit(control.valid)`) do rodzica.
        -   Warunkowego dodawania klas CSS (np. `ng-invalid`, `ng-dirty`).
-   **Wpływ na interfejs:**
    -   Komunikaty błędów pojawiają się pod `<textarea>`.
    -   Licznik znaków jest aktualizowany.
    -   Przycisk "Generuj Fiszki" (`GenerateButtonComponent`) jest wyłączony (`disabled` ustawione na `true`), gdy `isTextValid` w `GenerateViewComponent` jest `false`.
-   **Warunek:** Przycisk "Zapisz wszystkie propozycje" (`BulkSaveButtonComponent`) jest aktywny tylko wtedy, gdy:
    -   Lista propozycji (`proposals()`) nie jest pusta.
    -   Nie trwa żaden proces ładowania (`!isLoading()`).
-   **Komponent:** `GenerateViewComponent` (logika), `BulkSaveButtonComponent` (prezentacja stanu `disabled`).
-   **Weryfikacja:** W `GenerateViewComponent` sygnał `canSave = computed(() => this.proposals().length > 0 && !this.isLoading())`. Wartość tego sygnału jest przekazywana jako `@Input() disabled` do `BulkSaveButtonComponent`.
-   **Wpływ na interfejs:** Przycisk "Zapisz wszystkie propozycje" jest wyłączony, gdy warunki nie są spełnione.

## 10. Obsługa błędów
-   **Błędy walidacji długości tekstu (frontend):** Obsługiwane w `SourceTextareaComponent` poprzez wyświetlanie komunikatów inline i blokowanie przycisku "Generuj".
-   **Błędy walidacji długości tekstu (backend - 400):** Przechwytywane w subskrypcji API w `GenerateViewComponent`. Odpowiedni komunikat jest ustawiany w `errorMessage` i wyświetlany przez `ErrorMessageComponent`.
-   **Błędy autoryzacji (backend - 401):** Przechwytywane w subskrypcji API. Odpowiedni komunikat jest ustawiany w `errorMessage`. (Idealnie, powinien istnieć globalny `HttpInterceptor` do obsługi 401).
-   **Inne błędy serwera (backend - 5xx):** Przechwytywane w subskrypcji API. Generyczny komunikat błędu jest ustawiany w `errorMessage`.
-   **Błędy sieciowe (brak połączenia itp.):** Przechwytywane w bloku `error` subskrypcji API. Odpowiedni komunikat jest ustawiany w `errorMessage`.
-   **Błędy parsowania JSON (frontend):** Obsługiwane w `catch` bloku `req.json()` w funkcji backendowej (jak w kodzie `flashcards/index.ts`), frontend otrzyma odpowiedź 400. `GenerateViewComponent` obsłuży to jako błąd walidacji lub generyczny błąd serwera.
-   **Wyświetlanie błędów:** Komponent `ErrorMessageComponent` (np. PrimeNG `Messages` lub `Toast`) wyświetla aktualną wartość `errorMessage`. Komunikaty powinny być zrozumiałe dla użytkownika. Błędy powinny być również logowane do konsoli deweloperskiej dla celów diagnostycznych.

## 11. Kroki implementacji
1.  **Utworzenie routingu:** Zdefiniować ścieżkę `/generate` w module routingu aplikacji, mapując ją na `GenerateViewComponent`.
2.  **Utworzenie/Aktualizacja serwisów API:**
    -   Utworzyć `GenerationApiService` *(Bez zmian)*.
    -   Utworzyć `FlashcardApiService` z metodą `createFlashcards(flashcards: FlashcardProposalDTO[])`. Zaimplementować wywołanie POST do `/functions/v1/flashcards` używając `HttpClient`.
    -   **Zapewnić działający `HttpInterceptor` dołączający nagłówek `Authorization` dla obu serwisów.**
3.  **Utworzenie komponentów:** Wygenerować szkielety komponentów: `GenerateViewComponent`, `SourceTextareaComponent`, `GenerateButtonComponent`, `LoadingIndicatorComponent`, `ErrorMessageComponent`, `FlashcardProposalListComponent`, `BulkSaveButtonComponent`.
4.  **Implementacja `SourceTextareaComponent`:** *(Bez zmian)*
5.  **Implementacja `GenerateButtonComponent`:** *(Bez zmian, powiązać `disabled` z `!canGenerate()` i `loading` z `isLoading()`)*
6.  **Implementacja `LoadingIndicatorComponent`:** *(Bez zmian, powiązać z `isLoading()`)*
7.  **Implementacja `ErrorMessageComponent`:** *(Bez zmian)*
8.  **Implementacja `FlashcardProposalListComponent`:** *(Uproszczona - tylko wyświetlanie `front` i `back`)*
9.  **Implementacja `BulkSaveButtonComponent`:**
    -   Dodać przycisk (PrimeNG `pButton`).
    -   Powiązać wejście `@Input() disabled` (np. z `!canSave()`).
    -   Powiązać wejście `@Input() loading` (z `isLoading()`).
    -   Zaimplementować emisję zdarzenia `saveAllClick`.
10. **Implementacja `GenerateViewComponent`:**
    -   Wstrzyknąć `GenerationApiService`, `FlashcardApiService`, `MessageService`.
    -   Zdefiniować wszystkie sygnały stanu (w tym `isGenerating`, `isSaving`, `isLoading`, `canGenerate`, `canSave`).
    -   Zaimplementować metody obsługujące zdarzenia z komponentów podrzędnych (`onTextChange`, `onValidityChange`).
    -   Zaimplementować metodę `generate()` *(Bez zmian, ale używa `isGenerating`)*.
    -   Zaimplementować metodę `saveAllProposals()` wywołującą `flashcardApiService.createFlashcards()` i obsługującą wynik (sukces/błąd, aktualizacja stanu, Toast).
    -   Zaimplementować pomocnicze metody `handleApiError`, `clearMessagesAndProposals`, `clearMessages`.
    -   Połączyć komponenty w szablonie HTML, przekazując sygnały jako `@Input` i nasłuchując na `@Output`. Użyć `isLoading()`, `canGenerate()`, `canSave()` do sterowania stanami `disabled` i `loading` przycisków.
11. **Konfiguracja `Toast`:** Dodać `<p-toast>` do głównego szablonu aplikacji lub `GenerateViewComponent`.
12. **Stylowanie:** *(Bez zmian)*
13. **Testowanie:**
    -   Przetestować przepływ generowania *(Bez zmian)*.
    -   Po wygenerowaniu propozycji, przetestować kliknięcie "Zapisz wszystkie propozycje".
    -   Sprawdzić, czy wskaźnik ładowania działa podczas zapisu.
    -   Sprawdzić, czy po udanym zapisaniu pojawia się Toast sukcesu, a lista propozycji jest czyszczona.
    -   Przetestować obsługę błędów zapisu (np. zwracając błąd z API `flashcards`).
14. **Refaktoryzacja i czyszczenie kodu.** 