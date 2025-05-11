# Plan implementacji widoku: Uwierzytelnianie (Auth)

## 1. Przegląd
Widok Uwierzytelniania obsługuje proces logowania i rejestracji użytkowników w aplikacji 10x-cards. Udostępnia formularze do wprowadzenia danych uwierzytelniających (email, hasło) i komunikuje się z usługą Supabase Auth za pośrednictwem dedykowanego serwisu w celu weryfikacji i tworzenia kont. Po pomyślnej operacji użytkownik jest przekierowywany do głównego widoku aplikacji.

## 2. Routing widoku
Widok powinien być dostępny pod dwiema ścieżkami:
- `/login` (domyślnie wyświetla formularz logowania)
- `/register` (domyślnie wyświetla formularz rejestracji)
Obie ścieżki będą obsługiwane przez ten sam komponent (`AuthPageComponent`), który dostosuje swoje zachowanie na podstawie aktywnej ścieżki.

## 3. Struktura komponentów
```
AuthPageComponent (/login, /register) [Route Component]
├── p-toast (PrimeNG MessageService)
└── p-card [styleClass]="'max-w-md mx-auto mt-10'">
    ├── ng-template pTemplate="title"
    │   └── h2.text-center {{ mode() === 'login' ? 'Zaloguj się' : 'Zarejestruj się' }}
    ├── ng-template pTemplate="content"
    │   ├── app-auth-form [mode]="mode()" [loading]="loading()" [apiError]="error()" (formSubmit)="onSubmit($event)"
    │   └── div.text-center.mt-4
    │       └── p *ngIf="mode() === 'login'"> Nie masz konta? <a routerLink="/register" (click)="setMode('register')">Zarejestruj się</a> </p>
    │       └── p *ngIf="mode() === 'register'"> Masz już konto? <a routerLink="/login" (click)="setMode('login')">Zaloguj się</a> </p>
```

## 4. Szczegóły komponentów

### `AuthPageComponent`
-   **Opis komponentu:** Główny komponent routowalny dla ścieżek `/login` i `/register`. Zarządza trybem pracy (logowanie/rejestracja), stanem ładowania, obsługą błędów API, wywołuje metody serwisu `AuthService` i odpowiada za nawigację po udanej autentykacji.
-   **Główne elementy:** Komponent `p-card` jako kontener, komponent formularza (`AuthFormComponent`), linki do przełączania trybu, wykorzystuje `MessageService` (`p-toast`) do powiadomień o błędach.
-   **Obsługiwane interakcje/zdarzenia:**
    -   Inicjalizacja: Ustawienie trybu (`login`/`register`) na podstawie URL (`ActivatedRoute`).
    -   Zdarzenie `formSubmit` z `AuthFormComponent`: Wywołanie `AuthService.login()` lub `AuthService.register()`.
    -   Kliknięcie linków zmiany trybu: Aktualizacja trybu (`mode`) i potencjalnie zmiana URL (`Router`).
-   **Obsługiwana walidacja:** Deleguje do `AuthFormComponent`.
-   **Typy:** `AuthMode ('login' | 'register')`, `AuthService`, `Router`, `ActivatedRoute`, `MessageService`.
-   **Propsy:** Brak (komponent routowalny).

### `AuthFormComponent`
-   **Opis komponentu:** Komponent prezentacyjny wyświetlający formularz logowania lub rejestracji. Zawiera pola na email i hasło, przycisk akcji oraz obsługuje walidację pól za pomocą Angular Reactive Forms.
-   **Główne elementy:** Formularz (`<form [formGroup]="authForm">`), pole `p-inputtext` dla email, pole `p-password` dla hasła (z opcją pokazywania/ukrywania hasła), przycisk `p-button` (np. "Zaloguj" lub "Zarejestruj"), miejsce na wyświetlenie błędów walidacji i błędów API.
-   **Obsługiwane interakcje/zdarzenia (Emitowane):**
    -   `formSubmit: AuthFormData`: Emitowane po kliknięciu przycisku, gdy formularz jest poprawny. Przekazuje email i hasło.
-   **Obsługiwana walidacja:**
    -   Pole `email`: Wymagane (`Validators.required`), Poprawny format email (`Validators.email`).
    -   Pole `password`: Wymagane (`Validators.required`), Minimalna długość 6 znaków (`Validators.minLength(6)`).
    -   Wyświetlanie komunikatów o błędach przy polach (np. "Pole email jest wymagane", "Nieprawidłowy format adresu email", "Hasło musi mieć co najmniej 6 znaków").
    -   Dezaktywacja przycisku "Submit", gdy formularz jest niepoprawny lub trwa operacja logowania/rejestracji.
-   **Typy:** `AuthMode`, `FormGroup`, `LoginUserCommand`, `RegisterUserCommand`, `AuthFormData`.
-   **Propsy:** `mode: AuthMode`, `loading: boolean`, `apiError: string | null`.

## 5. Typy
-   **`RegisterUserCommand` (z `src/types.ts`):** Dane dla rejestracji.
    ```typescript
    export interface RegisterUserCommand {
      email: string;
      password: string;
    }
    ```
-   **`LoginUserCommand` (z `src/types.ts`):** Dane dla logowania.
    ```typescript
    export interface LoginUserCommand {
      email: string;
      password: string;
    }
    ```
-   **`AuthMode` (ViewModel/Typ):** Określa tryb pracy komponentu.
    ```typescript
    type AuthMode = 'login' | 'register';
    ```
-   **`AuthFormData` (ViewModel):** Dane emitowane przez formularz.
    ```typescript
    interface AuthFormData {
      email: string;
      password: string;
    }
    ```
-   **`User` (z `@supabase/supabase-js`):** Obiekt reprezentujący zalogowanego użytkownika (potencjalnie używany w `AuthService`).
-   **`Session` (z `@supabase/supabase-js`):** Obiekt reprezentujący sesję użytkownika (potencjalnie używany w `AuthService`).
-   **`AuthApiError` (z `@supabase/supabase-js`):** Typ błędu zwracany przez Supabase Auth.

## 6. Zarządzanie stanem
-   **`AuthPageComponent`:** Używa Angular Signals do zarządzania stanem lokalnym:
    -   `mode = signal<AuthMode>(...)`: Aktualny tryb (login/register).
    -   `loading = signal<boolean>(false)`: Stan ładowania operacji.
    -   `error = signal<string | null>(null)`: Komunikat ostatniego błędu API.
-   **`AuthFormComponent`:** Używa Angular `ReactiveFormsModule` (`FormGroup`) do zarządzania stanem formularza i walidacji.
-   **`AuthService` (Serwis globalny):** Centralny punkt zarządzania stanem autentykacji w aplikacji.
    -   Odpowiedzialny za przechowywanie i aktualizowanie stanu sesji Supabase (np. `session = signal<Session | null>(null)`, `currentUser = signal<User | null>(null)`) poprzez nasłuchiwanie na `onAuthStateChange`.
    -   Udostępnia stan zalogowania (np. `isLoggedIn = computed(() => !!session())`).

## 7. Integracja API (Supabase Auth SDK)
Integracja odbywa się poprzez serwis `AuthService`, który enkapsuluje wywołania Supabase Auth Client SDK:
-   **Rejestracja:** Wywołanie `supabase.auth.signUp({ email, password })` w `AuthService.register()`.
    -   Żądanie: `{ email: string, password: string }`
    -   Odpowiedź (sukces): `{ data: { user: User, session: Session | null }, error: null }` (sesja może być `null`, jeśli wymagane jest potwierdzenie email).
    -   Odpowiedź (błąd): `{ data: { user: null, session: null }, error: AuthApiError }`.
-   **Logowanie:** Wywołanie `supabase.auth.signInWithPassword({ email, password })` w `AuthService.login()`.
    -   Żądanie: `{ email: string, password: string }`
    -   Odpowiedź (sukces): `{ data: { user: User, session: Session }, error: null }`.
    -   Odpowiedź (błąd): `{ data: { user: null, session: null }, error: AuthApiError }`.

`AuthService` obsługuje te wywołania, aktualizuje swój wewnętrzny stan (sygnały `session`, `currentUser`) i zwraca wynik (np. `Observable<User | null>` lub rzuca błąd) do `AuthPageComponent`.

## 8. Interakcje użytkownika
-   **Wybór trybu:** Użytkownik wchodzi na `/login` lub `/register` lub klika link "Zaloguj się"/"Zarejestruj się", co zmienia wyświetlany formularz.
-   **Wprowadzanie danych:** Użytkownik wpisuje email i hasło w polach formularza.
-   **Walidacja w locie:** Formularz wyświetla błędy walidacji (np. zły format email, za krótkie hasło) po interakcji użytkownika z polem (`touched`).
-   **Wysyłanie formularza:** Użytkownik klika przycisk "Zaloguj"/"Zarejestruj".
    -   Jeśli formularz nieprawidłowy: Nic się nie dzieje (przycisk zablokowany).
    -   Jeśli formularz prawidłowy: Wyświetlany jest stan ładowania (np. na przycisku), wywoływana jest odpowiednia metoda `AuthService`.
-   **Odpowiedź API:**
    -   Sukces: Użytkownik zostaje przekierowany do widoku aplikacji (np. `/flashcards`).
    -   Błąd: Stan ładowania znika, wyświetlany jest komunikat błędu API (np. pod formularzem lub w toaście).

## 9. Warunki i walidacja
Walidacja w `AuthFormComponent` przy użyciu Angular Reactive Forms:
-   **Pole `email`:**
    -   Warunek: Wymagane (`Validators.required`).
    -   Warunek: Poprawny format email (`Validators.email`).
    -   Wpływ na UI: Komunikat błędu przy polu, blokada przycisku submit.
-   **Pole `password`:**
    -   Warunek: Wymagane (`Validators.required`).
    -   Warunek: Min. 6 znaków (`Validators.minLength(6)`).
    -   Wpływ na UI: Komunikat błędu przy polu, blokada przycisku submit.

## 10. Obsługa błędów
-   **Błędy walidacji formularza:** Obsługiwane przez Reactive Forms, komunikaty wyświetlane przy polach.
-   **Błędy API (Supabase `AuthApiError`):** Przechwytywane w `AuthService`, mapowane na komunikaty w języku polskim (np. "Nieprawidłowe dane logowania", "Użytkownik już istnieje", "Hasło jest zbyt słabe") i przekazywane do `AuthPageComponent` (sygnał `error`). Błąd wyświetlany w UI (np. `p-messages` lub `p-toast`).
-   **Inne błędy (sieciowe, etc.):** Wyświetlanie generycznego komunikatu błędu przez `MessageService` (`p-toast`), np. "Wystąpił nieoczekiwany błąd.".
-   Stan `loading` zapobiega wielokrotnemu wysyłaniu formularza.

## 11. Kroki implementacji
1.  **Utworzenie komponentów:** Stworzyć pliki dla `AuthPageComponent` i `AuthFormComponent`.
2.  **Routing:** Skonfigurować routing dla ścieżek `/login` i `/register`, obie wskazujące na `AuthPageComponent`.
3.  **Implementacja `AuthService`:**
    -   Stworzyć serwis.
    -   Zainicjować klienta Supabase (`createClient`).
    -   Zaimplementować metody `login`, `register`, `logout`, `getSession`, `getUser` opakowujące metody Supabase SDK.
    -   Zaimplementować zarządzanie stanem sesji (sygnały, `onAuthStateChange`).
    -   Dodać mapowanie błędów `AuthApiError` na komunikaty po polsku.
4.  **Implementacja `AuthFormComponent`:**
    -   Zdefiniować `@Input()` dla `mode`, `loading`, `apiError`.
    -   Zdefiniować `@Output()` dla `formSubmit`.
    -   Zaimplementować `ReactiveFormsModule` z polami `email`, `password` i walidatorami.
    -   Zaimplementować szablon HTML z odpowiednimi polami PrimeNG (`p-inputtext`, `p-password`), przyciskiem `p-button` i wyświetlaniem błędów walidacji oraz `apiError`.
    -   Dostosować etykietę przycisku i tytuł na podstawie `mode`.
    -   Zaimplementować metodę `onSubmit()` emitującą `formSubmit`.
5.  **Implementacja `AuthPageComponent`:**
    -   Zdefiniować sygnały `mode`, `loading`, `error`.
    -   Wstrzyknąć `AuthService`, `Router`, `ActivatedRoute`, `MessageService`.
    -   W `ngOnInit` ustawić początkowy `mode` na podstawie `ActivatedRoute`.
    -   Zaimplementować metodę `onSubmit(formData: AuthFormData)` wywołującą `AuthService`, obsługującą sukces (nawigacja) i błędy (ustawienie `error`, `loading`, `messageService`).
    -   Zaimplementować metodę `setMode(newMode: AuthMode)` do obsługi kliknięcia linków zmiany trybu.
    -   Zaimplementować szablon HTML używając `p-card`, `AuthFormComponent` i linków do przełączania trybu.
6.  **Konfiguracja Modułu:** Zaimportować wymagane moduły PrimeNG (`CardModule`, `InputTextModule`, `PasswordModule`, `ButtonModule`, `ToastModule`) oraz `ReactiveFormsModule`.
7.  **Guard Routingu:** Zaimplementować `AuthGuard`, który używa `AuthService.isLoggedIn()` do ochrony ścieżek wymagających zalogowania.
8.  **Styling:** Zastosować Tailwind do stylizacji komponentów.
9.  **Testowanie:** Testy jednostkowe dla `AuthService` (mockując Supabase SDK) i logiki komponentów. Testy E2E dla przepływów logowania i rejestracji. 