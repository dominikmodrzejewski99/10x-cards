# Plan implementacji widoku: Sesja Nauki

## 1. Przegląd
Widok Sesji Nauki dostępny pod ścieżką `/study` jest interfejsem, który pozwala użytkownikom na efektywną naukę zapisanych fiszek z wykorzystaniem algorytmu powtórek rozłożonych w czasie (Spaced Repetition - SR). Widok prezentuje fiszki zgodnie z logiką algorytmu, umożliwia użytkownikowi ocenę swojej znajomości i dynamicznie dostosowuje kolejne kroki sesji.

## 2. Routing widoku
Widok powinien być dostępny pod ścieżką `/study`. Dostęp do tej ścieżki powinien być chroniony przez `AuthGuard`, wymagający zalogowania użytkownika.

## 3. Struktura komponentów
```
StudySessionComponent (/study) [Route Component]
├── p-toast (PrimeNG MessageService)
├── *ngIf="!state().sessionFinished && !state().loading" >
│   ├── app-flashcard-display [flashcard]="state().currentCard" [showAnswer]="state().isAnswerVisible"
│   │   └── (Wyświetlanie frontu/tyłu fiszki)
│   │   └── *ngIf="!state().isAnswerVisible" >
│   │       └── p-button label="Pokaż odpowiedź" (click)="showAnswer()"
│   └── *ngIf="state().isAnswerVisible" >
│       └── app-grading-buttons [grades]="possibleGrades" [disabled]="state().submittingGrade" (gradeSelected)="submitGrade($event)"
├── *ngIf="state().loading" >
│   └── p-progressspinner // Lub inny wskaźnik ładowania
└── *ngIf="state().sessionFinished" >
    └── p-card [header]="'Sesja zakończona'">
        <p>Gratulacje! Ukończyłeś tę sesję nauki.</p>
        <p-button label="Wróć do listy fiszek" routerLink="/flashcards" />
    </p-card>
```

## 4. Szczegóły komponentów

### `StudySessionComponent`
-   **Opis komponentu:** Główny komponent kontenerowy dla widoku `/study`. Zarządza całym cyklem życia sesji nauki: inicjalizuje sesję, pobiera kolejne fiszki z `SrAlgorithmService`, zarządza stanem wyświetlania (pytanie/odpowiedź), obsługuje ocenę użytkownika, komunikuje stan zakończenia sesji oraz obsługuje stany ładowania i błędy.
-   **Główne elementy:** Komponenty podrzędne (`FlashcardDisplayComponent`, `GradingButtonsComponent`), wskaźnik ładowania (`p-progressspinner`), ekran zakończenia sesji (`p-card`), wykorzystanie `MessageService` (`p-toast`).
-   **Obsługiwane interakcje/zdarzenia:**
    -   Inicjalizacja (`ngOnInit`): Wywołanie inicjalizacji sesji i załadowanie pierwszej fiszki z `SrAlgorithmService`.
    -   Kliknięcie przycisku "Pokaż odpowiedź": Zmiana stanu `isAnswerVisible`.
    -   Zdarzenie `gradeSelected` z `GradingButtonsComponent`: Wywołanie `SrAlgorithmService.submitReview()`, a następnie załadowanie kolejnej fiszki.
-   **Obsługiwana walidacja:** Brak.
-   **Typy:** `StudySessionState`, `FlashcardDTO | null`, `SrAlgorithmService`, `MessageService`, `Router`, `Grade`.
-   **Propsy:** Brak (komponent routowalny).

### `FlashcardDisplayComponent`
-   **Opis komponentu:** Komponent prezentacyjny odpowiedzialny za wizualne przedstawienie treści pojedynczej fiszki. Wyświetla stronę "Przód" (`front`), a warunkowo (na podstawie propsa `showAnswer`) również stronę "Tył" (`back`).
-   **Główne elementy:** Elementy HTML (`div`, `p`, `h3` itp.) do wyświetlania tekstu `front` i `back`. Potencjalnie `p-card` jako kontener dla fiszki.
-   **Obsługiwane interakcje/zdarzenia (Emitowane):** Brak.
-   **Obsługiwana walidacja:** Brak.
-   **Typy:** `FlashcardDTO`.
-   **Propsy:** `flashcard: FlashcardDTO | null`, `showAnswer: boolean`.

### `GradingButtonsComponent`
-   **Opis komponentu:** Komponent prezentacyjny wyświetlający zestaw przycisków (`p-button`) reprezentujących możliwe oceny znajomości fiszki. Etykiety i wartości przycisków są determinowane przez wybrany algorytm SR.
-   **Główne elementy:** Kontener (`div`) z przyciskami `p-button` generowanymi dynamicznie na podstawie propsa `grades`.
-   **Obsługiwane interakcje/zdarzenia (Emitowane):**
    -   `gradeSelected: number | string`: Emitowane po kliknięciu przycisku oceny, przekazuje wartość (`value`) wybranej oceny.
-   **Obsługiwana walidacja:** Brak.
-   **Typy:** `Grade`.
-   **Propsy:** `grades: Grade[]`, `disabled: boolean` (do blokowania podczas wysyłania oceny).

## 5. Typy
-   **`FlashcardDTO` (z `src/types.ts`):** Podstawowy obiekt fiszki.
    ```typescript
    export interface FlashcardDTO { /* ... pola jak w poprzednich planach ... */ }
    ```
-   **`StudySessionState` (ViewModel):** Interfejs dla sygnału stanu w `StudySessionComponent`.
    ```typescript
    interface StudySessionState {
      currentCard: FlashcardDTO | null; // Aktualna fiszka lub null
      isAnswerVisible: boolean;      // Czy pokazano odpowiedź
      loading: boolean;             // Czy trwa ładowanie/inicjalizacja
      submittingGrade: boolean;     // Czy trwa wysyłanie oceny
      sessionFinished: boolean;     // Czy sesja zakończona
      error: string | null;         // Komunikat błędu
    }
    ```
-   **`Grade` (ViewModel):** Struktura danych dla przycisku oceny.
    ```typescript
    interface Grade {
      label: string;               // Tekst na przycisku (np. "Dobrze")
      value: number | string;      // Wartość przekazywana do algorytmu SR
    }
    ```
-   **`SrAlgorithmService` (Serwis Aplikacji - Interfejs):** Definicja interfejsu serwisu obsługującego logikę SR.
    ```typescript
    interface SrAlgorithmService {
      initializeSession(): Promise<void>; // lub Observable<void>
      getNextCard(): Promise<FlashcardDTO | null>; // lub Observable<FlashcardDTO | null>
      submitReview(cardId: number, grade: number | string): Promise<void>; // lub Observable<void>
      getPossibleGrades(): Grade[];
    }
    ```

## 6. Zarządzanie stanem
-   **`StudySessionComponent`:** Główny stan sesji zarządzany przez sygnał `state = signal<StudySessionState>(initialState)`. Aktualizacje stanu (`loading`, `currentCard`, `isAnswerVisible`, `sessionFinished`, `error`, `submittingGrade`) następują w odpowiedzi na interakcje użytkownika i wyniki z `SrAlgorithmService`.
-   **`SrAlgorithmService`:** Ten serwis jest kluczowy i zarządza wewnętrznym stanem algorytmu SR (np. które fiszki pokazać, kiedy, jakie są ich parametry SR). Może wymagać własnego zarządzania stanem, potencjalnie z zapisem/odczytem do/z backendu.

## 7. Integracja API (Poprzez SrAlgorithmService)
Cała komunikacja związana z logiką powtórek odbywa się przez `SrAlgorithmService`.
-   **Inicjalizacja:** `StudySessionComponent` wywołuje `srAlgorithmService.initializeSession()`.
-   **Pobranie fiszki:** `StudySessionComponent` wywołuje `srAlgorithmService.getNextCard()`.
-   **Przesłanie oceny:** `StudySessionComponent` wywołuje `srAlgorithmService.submitReview()`.

Serwis `SrAlgorithmService` wewnętrznie może (w zależności od implementacji):
-   Korzystać z biblioteki SR działającej w przeglądarce (np. ts-fsrs).
-   Pobierać potrzebne dane fiszek z backendu (`GET /flashcards` lub dedykowany endpoint).
-   Zapisywać/aktualizować stan nauki fiszek w backendzie (np. przez `PUT /flashcards/{id}` z dodatkowymi polami SR lub dedykowany endpoint `/study/review`). **Uwaga:** Obecny `api-plan.md` nie definiuje endpointów do zapisu stanu SR.

## 8. Interakcje użytkownika
-   **Start sesji:** Użytkownik wchodzi na `/study`, komponent inicjalizuje sesję i wyświetla pierwszą fiszkę (przód).
-   **Odsłonięcie odpowiedzi:** Użytkownik klika "Pokaż odpowiedź". Wyświetlany jest tył fiszki oraz przyciski ocen.
-   **Ocena:** Użytkownik klika jeden z przycisków oceny. Ocena jest wysyłana, przyciski są blokowane, pokazywany jest stan ładowania, a następnie ładowana jest kolejna fiszka (lub ekran końca sesji).
-   **Koniec sesji:** Użytkownik widzi ekran podsumowujący/zakończenia i może wrócić do listy fiszek.

## 9. Warunki i walidacja
-   Brak walidacji danych wprowadzanych przez użytkownika, oprócz wyboru oceny.
-   Interfejs musi prawidłowo obsługiwać stany: ładowania, wyświetlania pytania, wyświetlania odpowiedzi i ocen, końca sesji.
-   Przyciski ocen powinny być aktywne tylko po pokazaniu odpowiedzi i nieaktywne podczas wysyłania oceny (`submittingGrade`).

## 10. Obsługa błędów
-   **Błąd `SrAlgorithmService.initializeSession()`:** Wyświetlenie błędu przez `MessageService` (`p-toast`), ustawienie stanu błędu w komponencie, potencjalne zablokowanie interfejsu.
-   **Błąd `SrAlgorithmService.getNextCard()`:** Wyświetlenie błędu przez `MessageService`, ustawienie stanu błędu, umożliwienie ponowienia próby (?).
-   **Błąd `SrAlgorithmService.submitReview()`:** Wyświetlenie błędu przez `MessageService`, odblokowanie przycisków ocen, pozostawienie użytkownika przy bieżącej fiszce w celu ponowienia oceny.
-   **Stan, gdy brak fiszek do nauki:** `initializeSession` lub `getNextCard` zwraca odpowiedni sygnał/wartość, komponent przechodzi do stanu `sessionFinished`.

## 11. Kroki implementacji
1.  **Wybór i konfiguracja algorytmu SR:** Zdecydować, która biblioteka SR (np. ts-fsrs) lub podejście backendowe zostanie użyte.
2.  **Implementacja `SrAlgorithmService`:**
    -   Stworzyć serwis.
    -   Zaimplementować metody interfejsu (`initializeSession`, `getNextCard`, `submitReview`, `getPossibleGrades`) zgodnie z wybranym algorytmem.
    -   Zaimplementować logikę pobierania danych fiszek (jeśli potrzebne) i zapisywania/odczytywania stanu SR (jeśli stan jest utrwalany).
3.  **Utworzenie komponentów:** Stworzyć pliki dla `StudySessionComponent`, `FlashcardDisplayComponent`, `GradingButtonsComponent`.
4.  **Routing:** Skonfigurować ścieżkę `/study` wskazującą na `StudySessionComponent` i zabezpieczyć ją `AuthGuard`.
5.  **Implementacja `GradingButtonsComponent`:**
    -   Zdefiniować `@Input()` dla `grades`, `disabled`.
    -   Zdefiniować `@Output()` dla `gradeSelected`.
    -   Zaimplementować szablon z dynamicznie generowanymi przyciskami `p-button` emitującymi zdarzenie `gradeSelected`.
6.  **Implementacja `FlashcardDisplayComponent`:**
    -   Zdefiniować `@Input()` dla `flashcard`, `showAnswer`.
    -   Zaimplementować szablon wyświetlający `front` i warunkowo `back` fiszki.
7.  **Implementacja `StudySessionComponent`:**
    -   Zdefiniować sygnał `state` (`StudySessionState`) i `possibleGrades`.
    -   Wstrzyknąć `SrAlgorithmService`, `MessageService`, `Router`.
    -   W `ngOnInit` wywołać `srAlgorithmService.initializeSession()` i `loadNextCard()`.
    -   Zaimplementować `loadNextCard()`: wywołanie `srAlgorithmService.getNextCard()`, aktualizacja `state` (ładowanie, karta, błąd, koniec sesji).
    -   Zaimplementować `showAnswer()`: aktualizacja `state.isAnswerVisible`.
    -   Zaimplementować `submitGrade(gradeValue)`: ustawienie `submittingGrade`, wywołanie `srAlgorithmService.submitReview()`, obsługa odpowiedzi/błędu, wywołanie `loadNextCard()`.
    -   Zaimplementować szablon HTML, używając komponentów podrzędnych, dyrektyw `*ngIf` do zarządzania widocznością elementów w zależności od stanu, oraz `p-progressspinner` i ekranu końca sesji.
8.  **Konfiguracja Modułu:** Zaimportować wymagane moduły PrimeNG (`CardModule`, `ButtonModule`, `ProgressSpinnerModule`, `ToastModule`) i zapewnić dostarczenie `MessageService`.
9.  **Styling:** Zastosować Tailwind do stylizacji, szczególnie dla komponentu `FlashcardDisplayComponent`.
10. **Testowanie:** Testy jednostkowe dla `StudySessionComponent` (mockując `SrAlgorithmService`), `SrAlgorithmService` (jeśli logika jest na frontendzie). Testy E2E dla przepływu sesji nauki. 