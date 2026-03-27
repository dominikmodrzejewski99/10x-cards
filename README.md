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

### Poradnik nauki
- 8 artykułów: Spaced Repetition, Active Recall, krzywa zapominania, efekt Dunninga-Krugera, technika Feynmana, Pomodoro, interleaving, growth mindset

## Stack technologiczny

| Warstwa | Technologia |
|---------|-------------|
| Frontend | Angular 21 (standalone, OnPush, signals, zoneless) |
| State management | NgRx Signals |
| UI | PrimeNG 21, SCSS |
| Backend / Auth | Supabase (PostgreSQL, Auth, RLS, Storage, Edge Functions) |
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
  openRouterKey: 'YOUR_OPENROUTER_KEY'
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

## Struktura projektu

```
angular-without-ssr/src/app/
├── auth/               # Autentykacja (NgRx store, guards, serwis)
├── components/
│   ├── dashboard/      # Panel główny ze statystykami
│   ├── generate/       # Generator fiszek AI
│   ├── flashcards/     # Lista fiszek, formularz, import, tabela
│   ├── sets/           # Zarządzanie zestawami
│   ├── study/          # Sesja nauki (SM-2)
│   ├── quiz/           # Tryb testu (konfiguracja, pytania, wyniki)
│   ├── language-test/  # Testy językowe (B1, B2-FCE, C1-CAE)
│   ├── landing/        # Strona główna
│   ├── learning-guide/ # Poradnik nauki (8 artykułów)
│   └── onboarding/     # Onboarding po rejestracji
├── services/           # Serwisy API i biznesowe
├── shared/             # Współdzielone komponenty (navbar, audio player/recorder)
└── interfaces/         # Interfejsy TypeScript

supabase/functions/
├── chat/               # Proxy do OpenRouter (tłumaczenia, chat)
├── flashcards/         # Zapis fiszek
├── flashcards-create/  # Tworzenie fiszek (walidacja Zod)
└── generations/        # Walidacja tekstu wejściowego
```
