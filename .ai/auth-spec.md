# Specyfikacja techniczna modułu autentykacji dla aplikacji 10xCards

## 1. Wprowadzenie

Niniejsza specyfikacja techniczna opisuje architekturę modułu rejestracji, logowania i odzyskiwania hasła użytkowników dla aplikacji 10xCards. Moduł ten będzie zintegrowany z istniejącą aplikacją Angular i wykorzysta Supabase Auth jako backend autentykacji.

## 2. Architektura interfejsu użytkownika

### 2.0. Dostęp do funkcjonalności bez logowania

Zgodnie z wymaganiami, aplikacja będzie udostępniać część funkcjonalności bez konieczności logowania:

1. **Funkcjonalności dostępne bez logowania**:
   - Generowanie fiszek przez AI ("ad-hoc")
   - Tworzenie fiszek
   - Przeglądanie i edycja wygenerowanych fiszek w ramach bieżącej sesji

2. **Funkcjonalności wymagające logowania**:
   - Dostęp do listy fiszek (zapisanych wcześniej)
   - Zapisywanie fiszek w bazie danych
   - Sesja nauki
   - Zarządzanie kontem użytkownika

System będzie zachęcał niezalogowanych użytkowników do rejestracji/logowania w momencie próby dostępu do funkcjonalności wymagających autentykacji.

### 2.1. Struktura widoków i komponentów

#### 2.1.1. Widoki (Routes)

Moduł autentykacji będzie składał się z następujących widoków:

1. **Widok logowania** (`/login`)
   - Główny komponent: `AuthPageComponent` z trybem `login`
   - Dostępny dla niezalogowanych użytkowników
   - Przekierowuje zalogowanych użytkowników do strony głównej

2. **Widok rejestracji** (`/register`)
   - Główny komponent: `AuthPageComponent` z trybem `register`
   - Dostępny dla niezalogowanych użytkowników
   - Przekierowuje zalogowanych użytkowników do strony głównej

3. **Widok odzyskiwania hasła** (`/reset-password`)
   - Główny komponent: `PasswordResetPageComponent`
   - Dostępny dla niezalogowanych użytkowników
   - Zawiera formularz do wprowadzenia adresu email

4. **Widok ustawiania nowego hasła** (`/set-new-password`)
   - Główny komponent: `SetNewPasswordPageComponent`
   - Dostępny poprzez link wysłany na email użytkownika
   - Zawiera formularz do wprowadzenia nowego hasła

#### 2.1.2. Komponenty

1. **AuthPageComponent** (istniejący, do rozszerzenia)
   - Główny komponent dla widoków logowania i rejestracji
   - Zarządza stanem (login/register)
   - Obsługuje nawigację między widokami
   - Wyświetla komunikaty o błędach

2. **AuthFormComponent** (istniejący, do rozszerzenia)
   - Komponent formularza dla logowania i rejestracji
   - Zawiera pola email i hasło
   - Obsługuje walidację formularza
   - Emituje zdarzenia po wypełnieniu formularza

3. **PasswordResetFormComponent** (nowy)
   - Komponent formularza do odzyskiwania hasła
   - Zawiera pole email
   - Obsługuje walidację formularza
   - Emituje zdarzenia po wypełnieniu formularza

4. **SetNewPasswordFormComponent** (nowy)
   - Komponent formularza do ustawiania nowego hasła
   - Zawiera pola na nowe hasło i potwierdzenie hasła
   - Obsługuje walidację formularza
   - Emituje zdarzenia po wypełnieniu formularza

5. **AuthNavbarComponent** (nowy)
   - Komponent nawigacyjny dla widoków autentykacji
   - Wyświetla logo aplikacji i linki do logowania/rejestracji
   - Dostosowuje się do aktualnego widoku

6. **UserMenuComponent** (nowy)
   - Komponent menu użytkownika w prawym górnym rogu nagłówka aplikacji
   - Wyświetla informacje o zalogowanym użytkowniku
   - Zawiera przycisk wylogowania
   - Zmienia wygląd w zależności od stanu autentykacji (przycisk "Konto"/"Zaloguj" dla niezalogowanych, menu z opcją wylogowania dla zalogowanych)

### 2.2. Przepływy użytkownika

#### 2.2.1. Rejestracja użytkownika

1. Użytkownik wchodzi na stronę `/register`
2. Wypełnia formularz rejestracyjny (email, hasło, potwierdzenie hasła)
3. Po kliknięciu przycisku "Zarejestruj się":
   - Formularz jest walidowany
   - Dane są wysyłane do Supabase Auth
   - Użytkownik otrzymuje komunikat o pomyślnej rejestracji
   - Użytkownik jest automatycznie logowany i przekierowywany do widoku generowania fiszek

#### 2.2.2. Logowanie użytkownika

1. Użytkownik wchodzi na stronę `/login`
2. Wypełnia formularz logowania (email, hasło)
3. Po kliknięciu przycisku "Zaloguj się":
   - Formularz jest walidowany
   - Dane są wysyłane do Supabase Auth
   - Po pomyślnym logowaniu użytkownik jest przekierowywany do widoku generowania fiszek
   - W przypadku błędu wyświetlany jest odpowiedni komunikat

#### 2.2.3. Odzyskiwanie hasła

1. Użytkownik wchodzi na stronę `/login`
2. Klika link "Zapomniałem hasła"
3. Jest przekierowywany na stronę `/reset-password`
4. Wprowadza adres email
5. Po kliknięciu przycisku "Wyślij link resetujący":
   - Formularz jest walidowany
   - Żądanie jest wysyłane do Supabase Auth
   - Użytkownik otrzymuje komunikat o wysłaniu linku resetującego na podany adres email

#### 2.2.4. Ustawianie nowego hasła

1. Użytkownik klika link otrzymany w emailu
2. Jest przekierowywany na stronę `/set-new-password` z odpowiednimi parametrami w URL
3. Wprowadza nowe hasło i jego potwierdzenie
4. Po kliknięciu przycisku "Ustaw nowe hasło":
   - Formularz jest walidowany
   - Żądanie jest wysyłane do Supabase Auth
   - Po pomyślnym zresetowaniu hasła użytkownik jest przekierowywany do strony logowania
   - W przypadku błędu wyświetlany jest odpowiedni komunikat

#### 2.2.5. Wylogowanie

1. Zalogowany użytkownik klika przycisk "Wyloguj" w menu użytkownika
2. Żądanie wylogowania jest wysyłane do Supabase Auth
3. Sesja użytkownika jest usuwana
4. Użytkownik jest przekierowywany do strony logowania

### 2.3. Walidacja i komunikaty błędów

#### 2.3.1. Walidacja formularzy

1. **Formularz rejestracji**:
   - Email: wymagany, poprawny format email
   - Hasło: wymagane, minimum 6 znaków
   - Potwierdzenie hasła: wymagane, musi być zgodne z hasłem

2. **Formularz logowania**:
   - Email: wymagany, poprawny format email
   - Hasło: wymagane

3. **Formularz odzyskiwania hasła**:
   - Email: wymagany, poprawny format email

4. **Formularz ustawiania nowego hasła**:
   - Nowe hasło: wymagane, minimum 6 znaków
   - Potwierdzenie hasła: wymagane, musi być zgodne z nowym hasłem

#### 2.3.2. Komunikaty błędów

1. **Błędy walidacji formularza**:
   - "Pole email jest wymagane"
   - "Nieprawidłowy format adresu email"
   - "Hasło jest wymagane"
   - "Hasło musi mieć co najmniej 6 znaków"
   - "Hasła nie są zgodne"

2. **Błędy autentykacji**:
   - "Nieprawidłowy adres email lub hasło"
   - "Konto z podanym adresem email już istnieje"
   - "Nie znaleziono konta z podanym adresem email"
   - "Link do resetowania hasła wygasł lub jest nieprawidłowy"
   - "Wystąpił błąd podczas przetwarzania żądania. Spróbuj ponownie później."

## 3. Logika backendowa

### 3.1. Struktura endpointów API

Moduł autentykacji będzie korzystał z Supabase Auth API, które udostępnia następujące endpointy:

1. **Rejestracja użytkownika**:
   - Metoda: `supabase.auth.signUp()`
   - Parametry: `{ email, password }`
   - Odpowiedź: `{ data: { user, session }, error }`

2. **Logowanie użytkownika**:
   - Metoda: `supabase.auth.signInWithPassword()`
   - Parametry: `{ email, password }`
   - Odpowiedź: `{ data: { user, session }, error }`

3. **Wylogowanie użytkownika**:
   - Metoda: `supabase.auth.signOut()`
   - Odpowiedź: `{ error }`

4. **Odzyskiwanie hasła**:
   - Metoda: `supabase.auth.resetPasswordForEmail()`
   - Parametry: `{ email, redirectTo }`
   - Odpowiedź: `{ data, error }`

5. **Ustawianie nowego hasła**:
   - Metoda: `supabase.auth.updateUser()`
   - Parametry: `{ password }`
   - Odpowiedź: `{ data: { user }, error }`

6. **Pobieranie sesji użytkownika**:
   - Metoda: `supabase.auth.getSession()`
   - Odpowiedź: `{ data: { session }, error }`

### 3.2. Modele danych

#### 3.2.1. Modele wejściowe (Command Models)

1. **RegisterUserCommand** (istniejący, do rozszerzenia):
   ```typescript
   export interface RegisterUserCommand {
     email: string;
     password: string;
     passwordConfirmation?: string; // Dodane pole do walidacji po stronie klienta
   }
   ```

2. **LoginUserCommand** (istniejący):
   ```typescript
   export interface LoginUserCommand {
     email: string;
     password: string;
   }
   ```

3. **ResetPasswordCommand** (nowy):
   ```typescript
   export interface ResetPasswordCommand {
     email: string;
   }
   ```

4. **SetNewPasswordCommand** (nowy):
   ```typescript
   export interface SetNewPasswordCommand {
     password: string;
     token: string; // Token z URL
   }
   ```

#### 3.2.2. Modele wyjściowe (DTO)

1. **UserDTO** (istniejący):
   ```typescript
   export interface UserDTO {
     id: string;
     email: string;
     created_at: string;
     updated_at: string;
   }
   ```

2. **AuthResponseDTO** (nowy):
   ```typescript
   export interface AuthResponseDTO {
     user: UserDTO | null;
     session: any | null;
     error: string | null;
   }
   ```

### 3.3. Mechanizm walidacji danych wejściowych

1. **Walidacja po stronie klienta**:
   - Wykorzystanie Angular Reactive Forms do walidacji formularzy
   - Walidatory: `Validators.required`, `Validators.email`, `Validators.minLength`, itp.
   - Własny walidator do sprawdzania zgodności haseł

2. **Walidacja po stronie serwera**:
   - Supabase Auth przeprowadza walidację danych wejściowych
   - Zwraca odpowiednie komunikaty błędów w przypadku nieprawidłowych danych

### 3.4. Obsługa wyjątków

1. **Mapowanie błędów Supabase Auth**:
   - Przechwytywanie błędów zwracanych przez Supabase Auth
   - Mapowanie kodów błędów na przyjazne dla użytkownika komunikaty w języku polskim
   - Wyświetlanie komunikatów błędów w interfejsie użytkownika

2. **Obsługa błędów sieciowych**:
   - Przechwytywanie błędów HTTP
   - Wyświetlanie ogólnego komunikatu o błędzie w przypadku problemów z połączeniem

## 4. System autentykacji

### 4.1. Integracja z Supabase Auth

#### 4.1.1. Konfiguracja Supabase Auth

1. **Inicjalizacja klienta Supabase**:
   - Wykorzystanie istniejącego serwisu `SupabaseClientFactory`
   - Konfiguracja opcji autentykacji (persistSession, autoRefreshToken, itp.)

2. **Konfiguracja URL przekierowania**:
   - Ustawienie URL przekierowania dla resetowania hasła
   - Konfiguracja obsługi parametrów w URL

#### 4.1.2. Serwis AuthService

1. **Rozszerzenie istniejącego serwisu `AuthService`**:
   - Dodanie metod do obsługi odzyskiwania hasła i ustawiania nowego hasła
   - Rozszerzenie obsługi błędów
   - Dodanie metod pomocniczych

2. **Nowe metody**:
   - `resetPassword(command: ResetPasswordCommand): Observable<void>`
   - `setNewPassword(command: SetNewPasswordCommand): Observable<UserDTO>`
   - `handleAuthError(error: any): string` - mapowanie błędów na komunikaty

### 4.2. Zarządzanie sesją użytkownika

1. **Przechowywanie sesji**:
   - Wykorzystanie Supabase Auth do przechowywania sesji w localStorage
   - Automatyczne odświeżanie tokenu

2. **Pobieranie stanu sesji**:
   - Wykorzystanie `supabase.auth.getSession()` do pobierania aktualnej sesji
   - Aktualizacja stanu aplikacji na podstawie sesji

3. **Nasłuchiwanie zmian sesji**:
   - Wykorzystanie `supabase.auth.onAuthStateChange()` do nasłuchiwania zmian sesji
   - Aktualizacja stanu aplikacji po zmianie sesji

### 4.3. Ochrona tras (Route Guards)

1. **AuthGuard**:
   - Implementacja `CanActivate` do ochrony tras wymagających autentykacji
   - Przekierowanie niezalogowanych użytkowników do strony logowania
   - Ochrona tras: `/flashcards` (lista fiszek), `/profile` (profil użytkownika), `/study` (sesja nauki)

2. **NonAuthGuard**:
   - Implementacja `CanActivate` do ochrony tras dostępnych tylko dla niezalogowanych użytkowników
   - Przekierowanie zalogowanych użytkowników do widoku generowania fiszek
   - Ochrona tras: `/login`, `/register`, `/reset-password`

3. **PartialAuthGuard**:
   - Implementacja `CanActivate` do tras częściowo dostępnych bez logowania
   - Nie blokuje dostępu, ale modyfikuje zachowanie komponentów w zależności od stanu autentykacji
   - Stosowany dla tras: `/generate` (generowanie fiszek)

### 4.4. Interceptor HTTP

1. **Rozszerzenie istniejącego interceptora `authInterceptor`**:
   - Dodawanie tokenu autentykacji do nagłówków żądań HTTP
   - Obsługa wygaśnięcia tokenu
   - Przekierowanie do strony logowania w przypadku błędu 401

## 5. Implementacja

### 5.1. Struktura plików

```
src/app/
├── auth/
│   ├── components/
│   │   ├── auth-form.component.ts
│   │   ├── password-reset-form.component.ts
│   │   ├── set-new-password-form.component.ts
│   │   └── user-menu.component.ts
│   ├── pages/
│   │   ├── auth-page.component.ts
│   │   ├── password-reset-page.component.ts
│   │   └── set-new-password-page.component.ts
│   ├── guards/
│   │   ├── auth.guard.ts
│   │   ├── non-auth.guard.ts
│   │   └── partial-auth.guard.ts
│   ├── services/
│   │   └── auth.service.ts
│   └── auth.routes.ts
├── shared/
│   ├── components/
│   │   └── auth-navbar.component.ts
│   └── interceptors/
│       └── auth.interceptor.ts
└── types.ts
```

### 5.2. Kroki implementacji

1. **Rozszerzenie istniejących komponentów**:
   - Aktualizacja `AuthPageComponent` i `AuthFormComponent`
   - Dodanie obsługi odzyskiwania hasła

2. **Implementacja nowych komponentów**:
   - Utworzenie `PasswordResetFormComponent` i `SetNewPasswordFormComponent`
   - Utworzenie `PasswordResetPageComponent` i `SetNewPasswordPageComponent`
   - Utworzenie `UserMenuComponent`

3. **Rozszerzenie serwisu `AuthService`**:
   - Dodanie metod do obsługi odzyskiwania hasła i ustawiania nowego hasła
   - Rozszerzenie obsługi błędów

4. **Implementacja guardów**:
   - Utworzenie `AuthGuard`, `NonAuthGuard` i `PartialAuthGuard`
   - Konfiguracja routingu z guardami
   - Implementacja logiki dostępu do funkcjonalności bez logowania

5. **Aktualizacja interceptora HTTP**:
   - Rozszerzenie `authInterceptor` o obsługę wygaśnięcia tokenu

6. **Aktualizacja głównego komponentu aplikacji**:
   - Dodanie `UserMenuComponent` do nagłówka
   - Aktualizacja nawigacji w zależności od stanu autentykacji

7. **Testowanie**:
   - Testy jednostkowe dla serwisów i komponentów
   - Testy integracyjne dla przepływów autentykacji

## 6. Podsumowanie

Moduł autentykacji dla aplikacji 10xCards będzie oparty na Supabase Auth i zintegrowany z istniejącą aplikacją Angular. Zapewni funkcjonalności rejestracji, logowania, wylogowywania i odzyskiwania hasła, zgodnie z wymaganiami z pliku PRD.

Główne komponenty modułu to:
- Widoki logowania, rejestracji, odzyskiwania hasła i ustawiania nowego hasła
- Formularze z walidacją danych
- Serwis `AuthService` do komunikacji z Supabase Auth
- Guardy do ochrony tras z uwzględnieniem dostępu do części funkcjonalności bez logowania
- Interceptor HTTP do dodawania tokenu autentykacji

Moduł będzie zgodny z istniejącą architekturą aplikacji i zapewni bezpieczny dostęp do funkcjonalności aplikacji, jednocześnie umożliwiając korzystanie z generowania fiszek przez AI i tworzenia fiszek "ad-hoc" bez konieczności logowania.
