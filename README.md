# Memlo (10xCards)

Aplikacja do tworzenia i zarządzania fiszkami edukacyjnymi wspierana przez AI. Wklej tekst z wykładu, podręcznika lub artykułu — sztuczna inteligencja wygeneruje gotowe fiszki, a algorytm SM-2 zaplanuje powtórki dopasowane do Twojego tempa nauki.

## [Live Demo](https://10x-cards-70n.pages.dev/)

**Dane logowania:** `test@gmail.com` / `123123qwe`
Można też kliknąć „Wypróbuj bez rejestracji" aby korzystać anonimowo.

### Strona logowania
![Strona logowania](docs/screenshots/login-page.png)

### Dashboard
![Dashboard](docs/screenshots/dashboard.png)

### Generator fiszek (AI)
![Generator fiszek](docs/screenshots/generation.png)

## Funkcje

### Generowanie fiszek z AI
- Wklej tekst (1000–10000 znaków), a model LLM automatycznie wyodrębni kluczowe pojęcia i wygeneruje fiszki
- Akceptuj, odrzucaj i edytuj propozycje przed zapisem
- Zapis do istniejącego lub nowego zestawu

### Nauka z powtórkami (SM-2)
- Algorytm SM-2 z oceną 1 (nie wiem) / 3 (trudne) / 4 (wiem) planuje optymalne powtórki
- Nauka w obu kierunkach (przód/tył)
- Tasowanie kart, tryb dodatkowej praktyki
- Sterowanie klawiaturą (Space — odwróć, 1/2/3 — ocena) i gestami (swipe)
- Konfetti po ukończeniu sesji

### Quiz
- Trzy typy pytań: wielokrotny wybór, wpisywanie odpowiedzi, prawda/fałsz
- Konfiguracja: liczba pytań, limit czasu, filtr źródła (AI/ręczne)
- Wyniki z procentem poprawności, analizą czasu odpowiedzi i ring chart
- Powtórka: wszystkie, tylko błędne, tylko oznaczone gwiazdką

### Testy językowe
- Gotowe banki pytań: B1 Preliminary, B2 First (FCE), C1 Advanced (CAE)
- 30 pytań na test, śledzenie czasu odpowiedzi, analiza wyników

### Zestawy i fiszki
- Grupowanie fiszek w zestawy tematyczne
- Import: wklejanie tekstu (klucz-wartość, tabulatory), podgląd i edycja przed zapisem
- Eksport: CSV (z BOM dla Excela) i JSON
- Obrazek na przodzie (JPEG, PNG, WebP, GIF — max 2 MB)
- Notatka głosowa na tyle (MP3, WAV, OGG, WebM — max 2 MB) z nagrywaniem w przeglądarce
- Konfigurowalna liczba fiszek na stronę (5, 10, 20, 40, 100)

### Dashboard
- Seria nauki (bieżąca i najdłuższa), ukończone sesje, fiszki powtórzone dziś
- Podział fiszek: nowe / w nauce / powtarzane / opanowane
- Fiszki do powtórki z datą kolejnej sesji

### Tryb bez rejestracji
- Pełna funkcjonalność bez podawania emaila — anonimowe konto tworzone jednym kliknięciem

### Znajomi i ranking
- Zaproszenia do znajomych, podgląd statystyk
- Ranking tygodniowy (streak, fiszki, aktywność)
- Udostępnianie zestawów bezpośrednio znajomym

### Explore — publiczne zestawy
- Przeglądanie i kopiowanie publicznych zestawów
- Profil autora z liczbą publikacji i pobrań

### Program partnerski
- Onboarding kreatora (KYC, dane do wypłat)
- Dashboard z miesięcznymi statystykami (unikalni uczniowie, billable uses)
- Panel admina do zarządzania wypłatami (eksport CSV dla przelewów bankowych)

### Wielojęzyczność (i18n)
- 6 języków interfejsu: PL, EN, DE, ES, FR, UK
- Automatyczny wybór na podstawie języka przeglądarki
- Transloco z lazy-loading tłumaczeń

### PWA i offline
- Service Worker z cache'owaniem zasobów
- Timer Pomodoro z powiadomieniami push
- Wykrywanie stanu połączenia, kolejka offline

### Poradnik nauki
- 8 artykułów: Spaced Repetition, Active Recall, krzywa zapominania, efekt Dunninga-Krugera, technika Feynmana, Pomodoro, interleaving, growth mindset

### MCP Server — powtórki w czacie
- Wbudowany serwer MCP pozwala powtarzać fiszki bezpośrednio w Claude Code
- 4 narzędzia: `list_sets`, `start_review`, `show_answer`, `rate_card`
- Ten sam algorytm SM-2 co w aplikacji webowej
- Konfiguracja: uzupełnij `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `MCP_USER_ID` w `.mcp.json`

## Stack technologiczny

| Warstwa | Technologia |
|---------|-------------|
| Frontend | Angular 21 (standalone, OnPush, signals, zoneless) |
| State management | NgRx Signals |
| UI | Angular CDK, SCSS, PrimeIcons |
| Backend / Auth | Supabase (PostgreSQL, Auth, RLS, Storage, Edge Functions) |
| i18n | Transloco (PL, EN, DE, ES, FR, UK) |
| AI | OpenRouter API (Google Gemma 3) |
| Monitoring | Sentry |
| Testing | Karma/Jasmine (unit), Playwright (E2E) |
| Hosting | Cloudflare Pages (PWA) |

## Uruchomienie

### Wymagania
- Node.js 18+
- Konto Supabase (projekt + klucze)
- Klucz API OpenRouter

### Instalacja

```bash
cd angular-without-ssr
npm install
```

### Zmienne środowiskowe

Utwórz plik `angular-without-ssr/src/environments/environments.ts`:

```typescript
export const environment = {
  production: false,
  supabaseUrl: 'https://YOUR_PROJECT.supabase.co',
  supabaseKey: 'YOUR_ANON_KEY',
  googleAiKey: 'YOUR_GOOGLE_AI_STUDIO_KEY'
};
```

### Development server

```bash
cd angular-without-ssr
npm start
```

Aplikacja będzie dostępna pod `http://localhost:4200/`.

### Build produkcyjny

```bash
npm run build:prod
```

### Testy

```bash
npm test                # unit testy
npm run e2e             # Playwright E2E
npm run test:quiz       # testy modułu quiz
npm run lint            # ESLint
npm run format          # Prettier
```

## Architektura frontendu

### Wzorzec Smart/Dumb + Facade

Każdy feature stosuje trójwarstwowy podział odpowiedzialności:

```
┌─────────────────────────────────────────────────┐
│  Smart Component (orkiestracja)                  │
│  inject(Facade), Router, ActivatedRoute          │
│  routing, keyboard, confirm dialogs, fullscreen  │
│  ZERO .subscribe() — czyste sygnały              │
├─────────────────────────────────────────────────┤
│  Facade Service  [services/facades/]             │
│  private signals → public readonly (.asReadonly)  │
│  .subscribe() do API, toasty, obliczenia         │
│  providedIn: 'root'                              │
├─────────────────────────────────────────────────┤
│  Domain Service  [services/domain/]              │
│  logika biznesowa (SM-2, quiz, export, i18n)     │
│  czyste funkcje i serwisy bez stanu UI           │
├─────────────────────────────────────────────────┤
│  API Service  [services/api/]                    │
│  zwraca Observable, zero sygnałów                │
│  Supabase client, error handling                 │
├─────────────────────────────────────────────────┤
│  Infrastructure  [services/infrastructure/]      │
│  logger, auth interceptor, upload, Sentry        │
├─────────────────────────────────────────────────┤
│  Dumb Components (prezentacja)                   │
│  input() / output() — zero serwisów             │
│  ChangeDetectionStrategy.OnPush                  │
└─────────────────────────────────────────────────┘
```

### Fasady per feature

| Feature | Fasada | Smart Component | Dumb Components |
|---------|--------|----------------|-----------------|
| Dashboard | `DashboardFacadeService` | `DashboardComponent` | `ReviewReminderComponent` |
| Fiszki | `FlashcardsFacadeService` | `FlashcardListComponent` | `FlashcardTableComponent`, `FlashcardFormComponent`, `ImportModalComponent` |
| Zestawy | `SetsFacadeService` | `SetListComponent` | `SetCardComponent`, `SetFormDialogComponent` |
| Nauka | `StudyFacadeService` | `StudyViewComponent` | `FlashcardFlipComponent` |
| Quiz | `QuizFacadeService` | `QuizViewComponent` | `QuizConfigComponent`, `QuizQuestionComponent`, `QuizResultsComponent` |
| Generator AI | `GenerateFacadeService` | `GenerateViewComponent` | `SourceTextareaComponent`, `FlashcardProposalListComponent` |
| Znajomi | `FriendsFacadeService` | `FriendsListComponent` | `FriendStatsComponent`, `FriendsLeaderboardComponent` |
| Testy językowe | `LanguageTestFacadeService` | `LanguageTestViewComponent` | `LanguageTestWidgetComponent` |
| Explore | `ExploreFacadeService` | `ExploreComponent` | `AuthorProfileComponent` |
| Ustawienia | `SettingsFacadeService` | `SettingsComponent` | — |
| Partner | `PartnerFacadeService` | `PartnerPageComponent` | `PartnerDashboardComponent`, `PartnerOnboardingComponent` |
| Feedback | `FeedbackFacadeService` | `FeedbackComponent` | — |
| Pomodoro | `PomodoroFacadeService` | — | `PomodoroTimerComponent` |
| Powiadomienia | `NotificationFacadeService` | — | `NotificationBellComponent` |
| Onboarding | `OnboardingFacadeService` | — | `OnboardingComponent` |

`FlashcardsFacadeService` deleguje zarządzanie mediami (upload obrazów/audio, tłumaczenia) do wydzielonego `FlashcardMediaService`.

### Zasady

- **Fasada** jest jedynym miejscem z `.subscribe()` — smart komponenty czytają sygnały, nie subskrybują
- **Routing** w smart komponentach via `toSignal(route.params)` + `effect()` — zero manual `Subscription`
- **Browser API** (fullscreen, clipboard, confirm dialog, print) zostają w smart komponentach
- **Sygnały**: private bez postfixa (`_loading`), public readonly z postfixem (`loadingSignal`)
- **Auth**: `@ngrx/signals` Signal Store w `auth/store/`

## Struktura projektu

```
angular-without-ssr/src/app/
├── auth/                   # Autentykacja (NgRx Signal Store, guards, serwis)
│   ├── store/              #   Signal Store (stan użytkownika)
│   ├── guards/             #   authGuard, nonAuthGuard, adminGuard
│   └── components/         #   Login, rejestracja, reset hasła
├── components/
│   ├── dashboard/          # Panel główny ze statystykami
│   ├── generate/           # Generator fiszek AI
│   ├── flashcards/         # Lista fiszek, formularz, import, tabela
│   ├── sets/               # Zarządzanie zestawami
│   ├── study/              # Sesja nauki (SM-2)
│   ├── quiz/               # Tryb testu (konfiguracja, pytania, wyniki)
│   ├── language-test/      # Testy językowe (B1, B2-FCE, C1-CAE)
│   ├── friends/            # Lista znajomych, ranking, udostępnianie
│   ├── explore/            # Przeglądanie publicznych zestawów
│   ├── partner/            # Program partnerski (dashboard, onboarding)
│   ├── admin/              # Panel admina (wypłaty partnerskie)
│   ├── settings/           # Ustawienia użytkownika
│   ├── feedback/           # Formularz zgłoszeń
│   ├── landing/            # Strona główna
│   ├── learning-guide/     # Poradnik nauki (8 artykułów)
│   ├── legal/              # Regulamin, polityka prywatności
│   └── onboarding/         # Onboarding po rejestracji
├── services/
│   ├── api/                # Serwisy HTTP/Supabase (CRUD, RPC)
│   ├── facades/            # Fasady — orkiestracja stanu UI (sygnały)
│   ├── domain/             # Logika biznesowa (SM-2, quiz, export, i18n)
│   └── infrastructure/     # Cross-cutting (logger, interceptor, upload, Sentry)
├── shared/
│   ├── components/         # Współdzielone UI (navbar, dialog, toast, audio)
│   ├── models/             # Interfejsy współdzielone między warstwami
│   ├── services/           # Współdzielone serwisy (toast, confirm, streak)
│   └── utils/              # Helpery (confetti, error-classifier)
└── interfaces/             # Interfejsy zewnętrzne (OpenRouter)

supabase/functions/
├── chat/               # Proxy do OpenRouter (tłumaczenia, chat)
├── flashcards/         # Zapis fiszek
├── flashcards-create/  # Tworzenie fiszek (walidacja Zod)
└── generations/        # Walidacja tekstu wejściowego

mcp-review/src/         # MCP server — powtórki fiszek w Claude Code
├── index.ts            # Entry point (McpServer + StdioServerTransport)
├── tools.ts            # 4 narzędzia MCP
├── sm2.ts              # Algorytm SM-2 (pure function)
├── supabase.ts         # Klient Supabase + zapytania
└── session.ts          # Stan sesji powtórkowej (in-memory)
```
