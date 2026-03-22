# 10xCards

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

- **Generowanie fiszek z AI** — wklej tekst (1000–10000 znaków), a model LLM (stepfun/step-3.5-flash) wygeneruje do 15 fiszek
- **Tryb bez rejestracji** — kliknij „Wypróbuj bez rejestracji" na stronie logowania lub landing page, aby korzystać z aplikacji anonimowo, bez podawania emaila i hasła
- **Zestawy tematyczne** — grupuj fiszki w zestawy (np. osobny na każdy przedmiot)
- **Inteligentne powtórki** — algorytm SM-2 z oceną 1 (nie wiem) / 3 (trudne) / 4 (wiem) planuje, kiedy powtórzyć pytanie
- **Edycja propozycji** — akceptuj, odrzucaj i edytuj fiszki zaproponowane przez AI
- **Dashboard** — statystyki: seria nauki, fiszki do powtórki, liczba sesji
- **Tryb testu (Quiz)** — test z fiszek z trzema typami pytań: wielokrotny wybór, wpisywanie odpowiedzi, prawda/fałsz
- **Panel wyników testu** — podsumowanie z wynikiem procentowym, czasem odpowiedzi, najwolniejszymi odpowiedziami i ring chart
- **Wyróżnianie fiszek** — po teście oznacz fiszki „do powtórki" i powtórz tylko wyróżnione
- **Testy językowe** — gotowe banki pytań B1, B2-FCE, C1-CAE do nauki języka angielskiego

## Stack technologiczny

| Warstwa | Technologia |
|---------|-------------|
| Frontend | Angular 21 (standalone, OnPush, signals, zoneless) |
| State management | NgRx Signals (auth store) |
| UI | PrimeNG 21, Tailwind CSS 4 |
| Backend / Auth | Supabase (PostgreSQL, Auth, RLS) |
| AI | OpenRouter API (stepfun/step-3.5-flash:free) |
| Testing | Karma/Jasmine (unit), Playwright (E2E) |
| Hosting | Cloudflare Pages |

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

## Struktura projektu

```
angular-without-ssr/src/app/
├── auth/               # Autentykacja (NgRx store, guards, serwis)
├── components/
│   ├── dashboard/      # Panel główny ze statystykami
│   ├── generate/       # Generator fiszek AI
│   ├── flashcards/     # Lista fiszek w zestawie
│   ├── sets/           # Zarządzanie zestawami
│   ├── study/          # Sesja nauki (SM-2)
│   ├── quiz/           # Tryb testu (konfiguracja, pytania, wyniki)
│   ├── language-test/  # Testy językowe (B1, B2-FCE, C1-CAE)
│   ├── landing/        # Strona główna
│   └── onboarding/     # Onboarding po rejestracji
├── services/           # Serwisy API (flashcard, generation, review, quiz, openrouter)
├── shared/             # Współdzielone komponenty i serwisy
└── interfaces/         # Interfejsy TypeScript
```
