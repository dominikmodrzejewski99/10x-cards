# Plan Testów dla Aplikacji 10xCards

## Struktura komponentów i zależności

```
Angular App (10xCards)
│
├── Moduły główne
│   ├── AppComponent
│   │   └── AuthNavbarComponent
│   ├── AppRouting
│   └── AppConfig (providery, interceptory)
│
├── Moduł autentykacji
│   ├── Komponenty
│   │   ├── AuthPageComponent
│   │   ├── AuthFormComponent
│   │   ├── PasswordResetPageComponent
│   │   ├── PasswordResetFormComponent
│   │   ├── SetNewPasswordPageComponent
│   │   └── SetNewPasswordFormComponent
│   ├── Guardy
│   │   ├── AuthGuard
│   │   ├── NonAuthGuard
│   │   └── PartialAuthGuard
│   ├── Serwisy
│   │   └── AuthService
│   └── Store (NgRx)
│       ├── AuthActions
│       ├── AuthReducer
│       ├── AuthSelectors
│       └── AuthEffects
│
├── Moduł generowania fiszek
│   ├── Komponenty
│   │   ├── GenerateViewComponent
│   │   ├── SourceTextareaComponent
│   │   ├── GenerateButtonComponent
│   │   ├── LoadingIndicatorComponent
│   │   ├── ErrorMessageComponent
│   │   ├── FlashcardProposalListComponent
│   │   └── BulkSaveButtonComponent
│   └── Serwisy
│       ├── GenerationApiService
│       └── OpenRouterService
│
├── Moduł zarządzania fiszkami
│   ├── Komponenty
│   │   ├── FlashcardListComponent
│   │   ├── FlashcardTableComponent
│   │   └── FlashcardFormComponent
│   └── Serwisy
│       └── FlashcardApiService
│
├── Moduł sesji nauki
│   ├── Komponenty
│   │   ├── StudySessionComponent
│   │   └── FlashcardDisplayComponent
│   └── Serwisy
│       └── SrAlgorithmService
│
├── Serwisy współdzielone
│   ├── AuthInterceptor
│   └── SupabaseClient
│
└── Integracje zewnętrzne
    ├── Supabase
    │   ├── Autentykacja
    │   ├── Baza danych
    │   └── RPC
    └── OpenRouter.ai
        └── API generowania tekstu
```

## Przepływ danych

```
┌─────────────┐     ┌───────────────┐     ┌───────────────┐
│  Komponenty │     │    Serwisy    │     │  Zewnętrzne   │
│    Angular  │◄────┤   aplikacji   │◄────┤      API      │
└─────┬───────┘     └───────┬───────┘     └───────────────┘
      │                     │                      ▲
      │                     │                      │
      │                     │                      │
      ▼                     ▼                      │
┌─────────────┐     ┌───────────────┐             │
│   NgRx      │     │  Interceptory │             │
│   Store     │     │     HTTP      │─────────────┘
└─────────────┘     └───────────────┘
```

## Przepływ autentykacji

```
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│ Formularz │    │   Auth   │    │ Supabase │    │  Token   │
│ logowania │───►│ Service  │───►│   Auth   │───►│   JWT    │
└──────────┘    └──────────┘    └──────────┘    └─────┬────┘
                                                       │
                                                       ▼
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│  Dostęp  │    │   Auth   │    │  NgRx    │    │  Local   │
│ do stron │◄───│   Guard  │◄───│  Store   │◄───│ Storage  │
└──────────┘    └──────────┘    └──────────┘    └──────────┘
```

## Przepływ generowania fiszek

```
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│  Tekst   │    │Generation│    │OpenRouter│    │   AI     │
│ źródłowy │───►│ Service  │───►│ Service  │───►│  Model   │
└──────────┘    └──────────┘    └──────────┘    └─────┬────┘
                                                       │
                                                       ▼
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│ Propozycje│    │Flashcard │    │ Supabase │    │  Baza    │
│  fiszek   │◄───│ Service  │◄───│   API    │◄───│  danych  │
└──────────┘    └──────────┘    └──────────┘    └──────────┘
```

## 1. Wprowadzenie i cele testowania

### 1.1. Cel dokumentu
Niniejszy dokument przedstawia kompleksowy plan testów dla aplikacji 10xCards, która służy do tworzenia i zarządzania fiszkami edukacyjnymi z wykorzystaniem sztucznej inteligencji. Plan określa strategie, metodologie i zasoby niezbędne do zapewnienia wysokiej jakości aplikacji przed jej wdrożeniem produkcyjnym.

### 1.2. Cele testowania
- Weryfikacja zgodności aplikacji z wymaganiami funkcjonalnymi i niefunkcjonalnymi
- Identyfikacja i eliminacja defektów w aplikacji
- Zapewnienie poprawnego działania integracji z zewnętrznymi usługami (Supabase, OpenRouter.ai)
- Weryfikacja bezpieczeństwa danych użytkowników
- Zapewnienie optymalnej wydajności aplikacji
- Potwierdzenie zgodności z wytycznymi dostępności WCAG

## 2. Zakres testów

### 2.1. Elementy podlegające testowaniu
- Interfejs użytkownika (komponenty Angular)
- Logika biznesowa aplikacji
- Integracja z Supabase (autentykacja, baza danych)
- Integracja z OpenRouter.ai (generowanie fiszek przez AI)
- Zarządzanie stanem aplikacji (NgRx Store)
- Routing i nawigacja
- Responsywność i dostępność interfejsu

### 2.2. Elementy wyłączone z testowania
- Infrastruktura hostingowa (DigitalOcean)
- Wewnętrzne mechanizmy działania usług zewnętrznych (Supabase, OpenRouter.ai)
- Wydajność sieci i łączy internetowych użytkowników końcowych

## 3. Typy testów

### 3.1. Testy jednostkowe
**Cel**: Weryfikacja poprawności działania poszczególnych komponentów, serwisów i funkcji w izolacji.

**Zakres**:
- Komponenty Angular (*.component.ts)
- Serwisy (*.service.ts)
- Reducery i selektory NgRx
- Guardy routingu
- Interceptory HTTP
- Funkcje pomocnicze i utility

**Narzędzia**:
- Jasmine
- Karma
- Angular Testing Utilities

**Przykładowe scenariusze**:
- Weryfikacja poprawnego renderowania komponentów
- Testowanie logiki biznesowej w serwisach
- Sprawdzenie poprawności działania reducerów i selektorów NgRx
- Weryfikacja działania guardów routingu
- Testowanie interceptorów HTTP

### 3.2. Testy integracyjne
**Cel**: Weryfikacja poprawnej współpracy między różnymi komponentami i modułami aplikacji.

**Zakres**:
- Integracja komponentów z serwisami
- Integracja serwisów z API
- Przepływ danych między komponentami
- Integracja z NgRx Store

**Narzędzia**:
- Jest
- Angular Testing Utilities
- MockBackend dla HTTP

**Przykładowe scenariusze**:
- Weryfikacja przepływu danych między komponentami formularzy a serwisami
- Testowanie integracji serwisów z API (z wykorzystaniem mocków)
- Sprawdzenie poprawności działania efektów NgRx

### 3.3. Testy end-to-end (E2E)
**Cel**: Weryfikacja działania całej aplikacji z perspektywy użytkownika końcowego.

**Zakres**:
- Przepływy użytkownika (user flows)
- Interakcje z interfejsem
- Integracja z rzeczywistymi API (opcjonalnie z wykorzystaniem środowiska testowego)

**Narzędzia**:
- Cypress lub Playwright

**Przykładowe scenariusze**:
- Rejestracja i logowanie użytkownika
- Generowanie fiszek z tekstu
- Zapisywanie i edycja fiszek
- Przeglądanie listy fiszek
- Sesja nauki z wykorzystaniem fiszek

### 3.4. Testy API
**Cel**: Weryfikacja poprawności działania punktów końcowych API.

**Zakres**:
- Endpointy Supabase
- Funkcje RPC Supabase
- Integracja z OpenRouter.ai

**Narzędzia**:
- Postman
- Supabase CLI
- Skrypty testowe JavaScript/TypeScript

**Przykładowe scenariusze**:
- Weryfikacja poprawności odpowiedzi API
- Testowanie obsługi błędów
- Sprawdzenie limitów i walidacji danych

### 3.5. Testy wydajnościowe
**Cel**: Weryfikacja wydajności aplikacji pod obciążeniem.

**Zakres**:
- Czas ładowania aplikacji
- Responsywność interfejsu
- Wydajność operacji na dużych zbiorach danych

**Narzędzia**:
- Lighthouse
- Angular DevTools
- Chrome DevTools Performance

**Przykładowe scenariusze**:
- Pomiar czasu ładowania aplikacji
- Testowanie wydajności renderowania dużych list fiszek
- Analiza wydajności operacji generowania fiszek

### 3.6. Testy dostępności
**Cel**: Weryfikacja zgodności aplikacji z wytycznymi dostępności WCAG.

**Zakres**:
- Struktura HTML
- Kontrast kolorów
- Obsługa czytników ekranowych
- Nawigacja klawiaturowa

**Narzędzia**:
- Lighthouse
- axe DevTools
- WAVE

**Przykładowe scenariusze**:
- Weryfikacja zgodności z WCAG 2.1 AA
- Testowanie nawigacji klawiaturowej
- Sprawdzenie poprawności działania z czytnikami ekranowymi

### 3.7. Testy bezpieczeństwa
**Cel**: Identyfikacja potencjalnych luk bezpieczeństwa w aplikacji.

**Zakres**:
- Autentykacja i autoryzacja
- Ochrona danych użytkownika
- Zabezpieczenie przed typowymi atakami (XSS, CSRF)

**Narzędzia**:
- OWASP ZAP
- Snyk
- ESLint Security Plugin

**Przykładowe scenariusze**:
- Testowanie mechanizmów autentykacji
- Weryfikacja poprawności implementacji zabezpieczeń
- Skanowanie kodu pod kątem luk bezpieczeństwa

## 4. Scenariusze testowe dla kluczowych funkcjonalności

### 4.1. Moduł autentykacji

#### 4.1.1. Rejestracja użytkownika
1. **Warunki wstępne**: Użytkownik nie jest zalogowany, znajduje się na stronie rejestracji.
2. **Kroki**:
   - Wprowadzenie poprawnego adresu e-mail
   - Wprowadzenie poprawnego hasła
   - Kliknięcie przycisku "Zarejestruj się"
3. **Oczekiwany rezultat**: Użytkownik zostaje zarejestrowany, zalogowany i przekierowany do strony generowania fiszek.

#### 4.1.2. Logowanie użytkownika
1. **Warunki wstępne**: Użytkownik nie jest zalogowany, posiada konto, znajduje się na stronie logowania.
2. **Kroki**:
   - Wprowadzenie poprawnego adresu e-mail
   - Wprowadzenie poprawnego hasła
   - Kliknięcie przycisku "Zaloguj się"
3. **Oczekiwany rezultat**: Użytkownik zostaje zalogowany i przekierowany do strony generowania fiszek.

#### 4.1.3. Resetowanie hasła
1. **Warunki wstępne**: Użytkownik nie jest zalogowany, posiada konto, znajduje się na stronie resetowania hasła.
2. **Kroki**:
   - Wprowadzenie adresu e-mail
   - Kliknięcie przycisku "Resetuj hasło"
   - Otrzymanie e-maila z linkiem do resetowania hasła
   - Kliknięcie linku w e-mailu
   - Wprowadzenie nowego hasła
   - Kliknięcie przycisku "Ustaw nowe hasło"
3. **Oczekiwany rezultat**: Hasło użytkownika zostaje zmienione, użytkownik może zalogować się przy użyciu nowego hasła.

#### 4.1.4. Wylogowanie
1. **Warunki wstępne**: Użytkownik jest zalogowany.
2. **Kroki**:
   - Kliknięcie przycisku wylogowania w menu użytkownika
3. **Oczekiwany rezultat**: Użytkownik zostaje wylogowany, sesja zostaje zakończona, użytkownik zostaje przekierowany do strony logowania.

### 4.2. Moduł generowania fiszek

#### 4.2.1. Generowanie fiszek z tekstu
1. **Warunki wstępne**: Użytkownik jest zalogowany, znajduje się na stronie generowania fiszek.
2. **Kroki**:
   - Wprowadzenie tekstu źródłowego w pole tekstowe
   - Kliknięcie przycisku "Generuj fiszki"
3. **Oczekiwany rezultat**: System generuje propozycje fiszek na podstawie wprowadzonego tekstu, wyświetla je użytkownikowi.

#### 4.2.2. Edycja wygenerowanych fiszek
1. **Warunki wstępne**: Użytkownik wygenerował fiszki, znajduje się na stronie z propozycjami fiszek.
2. **Kroki**:
   - Kliknięcie przycisku edycji przy wybranej fiszce
   - Modyfikacja pytania i/lub odpowiedzi
   - Zapisanie zmian
3. **Oczekiwany rezultat**: Fiszka zostaje zaktualizowana, zmiany są widoczne na liście propozycji.

#### 4.2.3. Zapisywanie fiszek
1. **Warunki wstępne**: Użytkownik wygenerował fiszki, znajduje się na stronie z propozycjami fiszek.
2. **Kroki**:
   - Zaznaczenie fiszek do zapisania
   - Kliknięcie przycisku "Zapisz zaznaczone"
3. **Oczekiwany rezultat**: Zaznaczone fiszki zostają zapisane w bazie danych, użytkownik otrzymuje potwierdzenie.

### 4.3. Moduł zarządzania fiszkami

#### 4.3.1. Przeglądanie listy fiszek
1. **Warunki wstępne**: Użytkownik jest zalogowany, posiada zapisane fiszki, znajduje się na stronie listy fiszek.
2. **Kroki**:
   - Przeglądanie listy fiszek
   - Filtrowanie/sortowanie fiszek (opcjonalnie)
3. **Oczekiwany rezultat**: System wyświetla listę fiszek użytkownika zgodnie z zastosowanymi filtrami/sortowaniem.

#### 4.3.2. Edycja istniejącej fiszki
1. **Warunki wstępne**: Użytkownik jest zalogowany, posiada zapisane fiszki, znajduje się na stronie listy fiszek.
2. **Kroki**:
   - Kliknięcie przycisku edycji przy wybranej fiszce
   - Modyfikacja pytania i/lub odpowiedzi
   - Zapisanie zmian
3. **Oczekiwany rezultat**: Fiszka zostaje zaktualizowana, zmiany są widoczne na liście fiszek.

#### 4.3.3. Usuwanie fiszki
1. **Warunki wstępne**: Użytkownik jest zalogowany, posiada zapisane fiszki, znajduje się na stronie listy fiszek.
2. **Kroki**:
   - Kliknięcie przycisku usuwania przy wybranej fiszce
   - Potwierdzenie chęci usunięcia
3. **Oczekiwany rezultat**: Fiszka zostaje usunięta z bazy danych, znika z listy fiszek.

### 4.4. Moduł sesji nauki

#### 4.4.1. Rozpoczęcie sesji nauki
1. **Warunki wstępne**: Użytkownik jest zalogowany, posiada zapisane fiszki.
2. **Kroki**:
   - Przejście do sekcji "Sesja nauki"
   - Wybór zestawu fiszek (opcjonalnie)
   - Rozpoczęcie sesji
3. **Oczekiwany rezultat**: System rozpoczyna sesję nauki, wyświetla pierwszą fiszkę.

#### 4.4.2. Ocena znajomości fiszki
1. **Warunki wstępne**: Użytkownik jest w trakcie sesji nauki, wyświetlona jest fiszka.
2. **Kroki**:
   - Zapoznanie się z pytaniem
   - Próba odpowiedzi
   - Sprawdzenie poprawności odpowiedzi
   - Ocena znajomości (np. "Łatwe", "Trudne")
3. **Oczekiwany rezultat**: System zapisuje ocenę, przechodzi do kolejnej fiszki zgodnie z algorytmem powtórek.

## 5. Środowisko testowe

### 5.1. Konfiguracja środowiska
- **Środowisko deweloperskie**: Lokalne środowisko deweloperskie z uruchomioną instancją Supabase
- **Środowisko testowe**: Dedykowane środowisko testowe z oddzielną instancją Supabase
- **Środowisko przedprodukcyjne**: Środowisko zbliżone do produkcyjnego, z pełną konfiguracją

### 5.2. Wymagania sprzętowe i programowe
- **Przeglądarki**: Chrome, Firefox, Safari, Edge (najnowsze wersje)
- **Urządzenia**: Komputery stacjonarne, laptopy, tablety, smartfony
- **Systemy operacyjne**: Windows, macOS, iOS, Android

### 5.3. Dane testowe
- Konta testowe z różnymi poziomami uprawnień
- Przykładowe teksty źródłowe do generowania fiszek
- Predefiniowane zestawy fiszek
- Dane do testów wydajnościowych (duże zestawy fiszek)

## 6. Narzędzia do testowania

### 6.1. Narzędzia do testów jednostkowych i integracyjnych
- Jest - framework do testów jednostkowych i test runner
- Angular Testing Utilities - narzędzia do testowania komponentów Angular

### 6.2. Narzędzia do testów E2E
- Cypress lub Playwright - frameworki do testów E2E
- Narzędzia do nagrywania i odtwarzania testów

### 6.3. Narzędzia do testów wydajnościowych i dostępności
- Lighthouse - narzędzie do analizy wydajności i dostępności
- axe DevTools - narzędzie do testów dostępności
- Chrome DevTools Performance - narzędzie do analizy wydajności

### 6.4. Narzędzia do testów API
- Postman - narzędzie do testowania API
- Supabase CLI - narzędzie do zarządzania i testowania Supabase

### 6.5. Narzędzia do zarządzania testami
- GitHub Issues - śledzenie błędów i zadań
- GitHub Actions - automatyzacja testów

## 7. Harmonogram testów

### 7.1. Faza przygotowawcza
- Przygotowanie środowiska testowego
- Przygotowanie danych testowych
- Implementacja podstawowych testów jednostkowych

### 7.2. Faza testów jednostkowych i integracyjnych
- Implementacja testów jednostkowych dla komponentów i serwisów
- Implementacja testów integracyjnych
- Analiza i naprawa wykrytych błędów

### 7.3. Faza testów E2E
- Implementacja testów E2E dla kluczowych przepływów użytkownika
- Testowanie na różnych przeglądarkach i urządzeniach
- Analiza i naprawa wykrytych błędów

### 7.4. Faza testów wydajnościowych i dostępności
- Przeprowadzenie testów wydajnościowych
- Przeprowadzenie testów dostępności
- Optymalizacja aplikacji na podstawie wyników testów

### 7.5. Faza testów bezpieczeństwa
- Przeprowadzenie testów bezpieczeństwa
- Analiza i naprawa wykrytych luk

### 7.6. Faza testów akceptacyjnych
- Przeprowadzenie testów akceptacyjnych z udziałem interesariuszy
- Finalne poprawki i optymalizacje

## 8. Kryteria akceptacji testów

### 8.1. Kryteria dla testów jednostkowych i integracyjnych
- Pokrycie kodu testami na poziomie minimum 80%
- Wszystkie testy jednostkowe i integracyjne przechodzą pomyślnie
- Brak krytycznych błędów w kodzie

### 8.2. Kryteria dla testów E2E
- Wszystkie kluczowe przepływy użytkownika działają poprawnie
- Aplikacja działa poprawnie na wszystkich wspieranych przeglądarkach i urządzeniach
- Brak krytycznych błędów w interfejsie użytkownika

### 8.3. Kryteria dla testów wydajnościowych
- Czas ładowania aplikacji poniżej 3 sekund
- Czas odpowiedzi na akcje użytkownika poniżej 1 sekundy
- Wynik Lighthouse Performance powyżej 90

### 8.4. Kryteria dla testów dostępności
- Zgodność z WCAG 2.1 AA
- Wynik Lighthouse Accessibility powyżej 90
- Aplikacja jest w pełni użyteczna przy pomocy klawiatury

### 8.5. Kryteria dla testów bezpieczeństwa
- Brak krytycznych luk bezpieczeństwa
- Poprawna implementacja mechanizmów autentykacji i autoryzacji
- Dane użytkowników są odpowiednio chronione

## 9. Role i odpowiedzialności w procesie testowania

### 9.1. Kierownik testów
- Planowanie i koordynacja procesu testowania
- Monitorowanie postępu testów
- Raportowanie wyników testów

### 9.2. Testerzy
- Implementacja i wykonywanie testów
- Raportowanie błędów
- Weryfikacja poprawek

### 9.3. Deweloperzy
- Implementacja funkcjonalności
- Implementacja testów jednostkowych
- Naprawa wykrytych błędów

### 9.4. Interesariusze
- Definiowanie wymagań
- Udział w testach akceptacyjnych
- Zatwierdzanie wersji do wdrożenia

## 10. Procedury raportowania błędów

### 10.1. Format raportu błędu
- Tytuł błędu
- Opis błędu
- Kroki reprodukcji
- Oczekiwany rezultat
- Aktualny rezultat
- Środowisko testowe
- Priorytet i waga błędu
- Załączniki (zrzuty ekranu, logi)

### 10.2. Proces obsługi błędów
1. Zgłoszenie błędu w systemie śledzenia błędów (GitHub Issues)
2. Triage błędu (określenie priorytetu i przypisanie)
3. Naprawa błędu przez dewelopera
4. Weryfikacja poprawki przez testera
5. Zamknięcie zgłoszenia

### 10.3. Priorytety błędów
- **Krytyczny**: Błąd uniemożliwiający korzystanie z kluczowych funkcjonalności aplikacji
- **Wysoki**: Błąd znacząco utrudniający korzystanie z aplikacji
- **Średni**: Błąd wpływający na doświadczenie użytkownika, ale nie blokujący korzystania z aplikacji
- **Niski**: Drobne błędy kosmetyczne, nie wpływające na funkcjonalność

## 11. Zarządzanie ryzykiem

### 11.1. Identyfikacja ryzyk
- Opóźnienia w implementacji funkcjonalności
- Problemy z integracją z zewnętrznymi usługami
- Niewystarczające zasoby do przeprowadzenia testów
- Zmiany w wymaganiach w trakcie procesu testowania

### 11.2. Strategie mitygacji ryzyk
- Regularne spotkania statusowe
- Wczesna integracja z zewnętrznymi usługami
- Automatyzacja testów
- Elastyczne planowanie

## 12. Podsumowanie

Plan testów dla aplikacji 10xCards obejmuje kompleksowe podejście do zapewnienia jakości, uwzględniając różne typy testów, środowiska testowe, narzędzia i procedury. Realizacja planu testów pozwoli na dostarczenie użytkownikom stabilnej, wydajnej i bezpiecznej aplikacji, spełniającej wszystkie wymagania funkcjonalne i niefunkcjonalne.

Regularna aktualizacja planu testów w odpowiedzi na zmiany w wymaganiach i postęp w implementacji zapewni jego aktualność i skuteczność w procesie zapewnienia jakości aplikacji 10xCards.
