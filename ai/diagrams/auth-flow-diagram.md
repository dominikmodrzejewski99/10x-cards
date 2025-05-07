# Diagram przepływu autentykacji w aplikacji 10xCards

Poniższy diagram przedstawia architekturę i przepływ procesu autentykacji w aplikacji 10xCards, zgodnie ze specyfikacją techniczną.

## Diagram komponentów i przepływu danych

```mermaid
graph TB
    %% Definicja stylów
    classDef component fill:#f9f9f9,stroke:#333,stroke-width:1px
    classDef service fill:#e1f5fe,stroke:#0288d1,stroke-width:1px
    classDef guard fill:#e8f5e9,stroke:#388e3c,stroke-width:1px
    classDef external fill:#fff8e1,stroke:#ffa000,stroke-width:1px
    classDef store fill:#f3e5f5,stroke:#7b1fa2,stroke-width:1px

    %% Komponenty UI
    UI_Login["/login - AuthPageComponent"]:::component
    UI_Register["/register - AuthPageComponent"]:::component
    UI_ResetPassword["/reset-password - PasswordResetPageComponent"]:::component
    UI_SetNewPassword["/set-new-password - SetNewPasswordPageComponent"]:::component
    UI_UserMenu["UserMenuComponent"]:::component
    UI_Generate["/generate - GenerateViewComponent"]:::component
    UI_Flashcards["/flashcards - FlashcardListComponent"]:::component

    %% Formularze
    Form_Auth["AuthFormComponent"]:::component
    Form_ResetPassword["PasswordResetFormComponent"]:::component
    Form_SetNewPassword["SetNewPasswordFormComponent"]:::component

    %% Serwisy
    SVC_Auth["AuthService"]:::service
    SVC_SupabaseFactory["SupabaseClientFactory"]:::service
    SVC_Interceptor["AuthInterceptor"]:::service

    %% Guardy
    Guard_Auth["AuthGuard"]:::guard
    Guard_NonAuth["NonAuthGuard"]:::guard
    Guard_PartialAuth["PartialAuthGuard"]:::guard

    %% Zewnętrzne API
    EXT_Supabase["Supabase Auth API"]:::external

    %% Przepływy danych - Logowanie
    UI_Login --> Form_Auth
    Form_Auth -- "LoginUserCommand" --> SVC_Auth
    SVC_Auth -- "signInWithPassword()" --> EXT_Supabase
    EXT_Supabase -- "Session, User" --> SVC_Auth
    SVC_Auth -- "UserDTO" --> UI_Login
    UI_Login -- "Po pomyślnym logowaniu" --> UI_Generate

    %% Przepływy danych - Rejestracja
    UI_Register --> Form_Auth
    Form_Auth -- "RegisterUserCommand" --> SVC_Auth
    SVC_Auth -- "signUp()" --> EXT_Supabase
    EXT_Supabase -- "Session, User" --> SVC_Auth
    SVC_Auth -- "UserDTO" --> UI_Register
    UI_Register -- "Po pomyślnej rejestracji" --> UI_Generate

    %% Przepływy danych - Reset hasła
    UI_ResetPassword --> Form_ResetPassword
    Form_ResetPassword -- "ResetPasswordCommand" --> SVC_Auth
    SVC_Auth -- "resetPasswordForEmail()" --> EXT_Supabase
    EXT_Supabase -- "Email z linkiem" --> UI_SetNewPassword

    %% Przepływy danych - Ustawienie nowego hasła
    UI_SetNewPassword --> Form_SetNewPassword
    Form_SetNewPassword -- "SetNewPasswordCommand" --> SVC_Auth
    SVC_Auth -- "updateUser()" --> EXT_Supabase
    EXT_Supabase -- "Potwierdzenie" --> UI_Login

    %% Przepływy danych - Wylogowanie
    UI_UserMenu -- "Wyloguj" --> SVC_Auth
    SVC_Auth -- "signOut()" --> EXT_Supabase
    EXT_Supabase -- "Potwierdzenie" --> SVC_Auth
    SVC_Auth -- "Przekierowanie" --> UI_Login

    %% Przepływy danych - Interceptor
    SVC_Interceptor -- "Pobierz token" --> SVC_SupabaseFactory
    SVC_SupabaseFactory -- "Utwórz klienta" --> SVC_Auth
    SVC_Interceptor -- "Dodaj token do żądań" --> EXT_Supabase

    %% Guardy i dostęp do tras
    Guard_Auth -- "Chroni" --> UI_Flashcards
    Guard_NonAuth -- "Chroni" --> UI_Login
    Guard_NonAuth -- "Chroni" --> UI_Register
    Guard_NonAuth -- "Chroni" --> UI_ResetPassword
    Guard_PartialAuth -- "Modyfikuje" --> UI_Generate

    %% Relacje komponentów
    UI_Login -.-> Guard_NonAuth
    UI_Register -.-> Guard_NonAuth
    UI_ResetPassword -.-> Guard_NonAuth
    UI_Flashcards -.-> Guard_Auth
    UI_Generate -.-> Guard_PartialAuth
    UI_UserMenu -.-> SVC_Auth
```

## Diagram sekwencji procesu logowania

```mermaid
sequenceDiagram
    actor User as Użytkownik
    participant Login as AuthPageComponent (login)
    participant Form as AuthFormComponent
    participant Auth as AuthService
    participant Supabase as Supabase Auth API
    participant Router as Angular Router

    User->>Login: Wejście na /login
    Login->>Form: Wyświetlenie formularza
    User->>Form: Wprowadzenie email i hasła
    User->>Form: Kliknięcie "Zaloguj się"
    Form->>Form: Walidacja formularza
    Form->>Auth: login(LoginUserCommand)
    Auth->>Supabase: signInWithPassword()
    Supabase-->>Auth: Zwrócenie sesji i danych użytkownika
    Auth->>Auth: Zapisanie stanu użytkownika
    Auth->>Router: Przekierowanie do /generate
    Router-->>User: Wyświetlenie widoku generowania fiszek
```

## Diagram sekwencji procesu rejestracji

```mermaid
sequenceDiagram
    actor User as Użytkownik
    participant Register as AuthPageComponent (register)
    participant Form as AuthFormComponent
    participant Auth as AuthService
    participant Supabase as Supabase Auth API
    participant Router as Angular Router

    User->>Register: Wejście na /register
    Register->>Form: Wyświetlenie formularza
    User->>Form: Wprowadzenie email, hasła i potwierdzenia
    User->>Form: Kliknięcie "Zarejestruj się"
    Form->>Form: Walidacja formularza
    Form->>Auth: register(RegisterUserCommand)
    Auth->>Supabase: signUp()
    Supabase-->>Auth: Zwrócenie sesji i danych użytkownika
    Auth->>Auth: Zapisanie stanu użytkownika
    Auth->>Router: Przekierowanie do /generate
    Router-->>User: Wyświetlenie widoku generowania fiszek
```

## Diagram sekwencji procesu odzyskiwania hasła

```mermaid
sequenceDiagram
    actor User as Użytkownik
    participant Login as AuthPageComponent (login)
    participant Reset as PasswordResetPageComponent
    participant Form as PasswordResetFormComponent
    participant Auth as AuthService
    participant Supabase as Supabase Auth API
    participant Email as System Email

    User->>Login: Wejście na /login
    User->>Login: Kliknięcie "Zapomniałem hasła"
    Login->>Reset: Przekierowanie do /reset-password
    Reset->>Form: Wyświetlenie formularza
    User->>Form: Wprowadzenie adresu email
    User->>Form: Kliknięcie "Wyślij link resetujący"
    Form->>Form: Walidacja formularza
    Form->>Auth: resetPassword(ResetPasswordCommand)
    Auth->>Supabase: resetPasswordForEmail()
    Supabase->>Email: Wysłanie emaila z linkiem
    Email-->>User: Otrzymanie emaila z linkiem
    User->>Supabase: Kliknięcie linku w emailu
    Supabase->>Reset: Przekierowanie do /set-new-password z tokenem
    Reset->>User: Wyświetlenie formularza nowego hasła
    User->>Reset: Wprowadzenie nowego hasła
    Reset->>Auth: setNewPassword(SetNewPasswordCommand)
    Auth->>Supabase: updateUser()
    Supabase-->>Auth: Potwierdzenie zmiany hasła
    Auth->>Login: Przekierowanie do /login
    Login-->>User: Wyświetlenie komunikatu o pomyślnej zmianie hasła
```

## Diagram dostępu do funkcjonalności

```mermaid
flowchart TD
    User[Użytkownik] --> IsAuth{Zalogowany?}
    
    IsAuth -->|Tak| AuthFeatures[Funkcje dla zalogowanych]
    IsAuth -->|Nie| NonAuthFeatures[Funkcje bez logowania]
    
    AuthFeatures --> AF1[Lista fiszek]
    AuthFeatures --> AF2[Zapisywanie fiszek]
    AuthFeatures --> AF3[Sesja nauki]
    AuthFeatures --> AF4[Zarządzanie kontem]
    AuthFeatures --> AF5[Generowanie fiszek]
    
    NonAuthFeatures --> NAF1[Generowanie fiszek ad-hoc]
    NonAuthFeatures --> NAF2[Przeglądanie wygenerowanych fiszek]
    NonAuthFeatures --> NAF3[Edycja wygenerowanych fiszek]
    
    NAF1 -.-> Login[Zachęta do logowania]
    NAF2 -.-> Login
    NAF3 -.-> Login
    
    Login --> Register[Rejestracja]
    Login --> Reset[Reset hasła]
    
    classDef auth fill:#e8f5e9,stroke:#388e3c,stroke-width:1px
    classDef nonauth fill:#fff8e1,stroke:#ffa000,stroke-width:1px
    classDef authflow fill:#e1f5fe,stroke:#0288d1,stroke-width:1px
    
    class AuthFeatures,AF1,AF2,AF3,AF4,AF5 auth
    class NonAuthFeatures,NAF1,NAF2,NAF3 nonauth
    class Login,Register,Reset authflow
```
