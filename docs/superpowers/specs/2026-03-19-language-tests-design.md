# Language Tests — Use of English (B1, B2/FCE, C1/CAE)

## Overview

Dodatkowa funkcjonalność pozwalająca użytkownikom sprawdzić znajomość języka angielskiego na podstawie testów wzorowanych na egzaminach Cambridge. Testy Use of English z gotowymi bankami pytań, szczegółową analizą wyników i automatycznym generowaniem fiszek z błędów.

## Decyzje projektowe

| Decyzja | Wybór | Uzasadnienie |
|---------|-------|--------------|
| Źródło pytań | Gotowe banki pytań (JSON) | Precyzja i zgodność ze standardami Cambridge; AI może generować błędne pytania gramatyczne |
| Typy zadań | Multiple Choice Cloze + Word Formation | Dwa formaty dają różnorodność bez nadmiernej złożoności UI |
| Poziomy | B1, B2 (FCE), C1 (CAE) | Pokrywa największą grupę użytkowników; A1/A2 zbyt podstawowe, C2 niszowe |
| Format testu | Jeden długi test (30 pytań) | Pełny wynik diagnostyczny, pass/fail wobec progu zdawalności |
| Wyniki | Szczegółowa analiza + generowanie fiszek | Integracja z rdzeniem aplikacji (SM-2 spaced repetition) |
| Dostęp | Nawigacja + widget na dashboardzie | Stały dostęp + discoverability dla nowych użytkowników |

## Architektura

### Routing

```
/language-test          → LanguageTestListComponent (wybór poziomu)
/language-test/:level   → LanguageTestViewComponent (rozwiązywanie testu)
/language-test/:level/results → LanguageTestResultsComponent (wyniki)
```

Wszystkie lazy loaded, chronione `authGuard`.

### Komponenty

| Komponent | Odpowiedzialność |
|-----------|-----------------|
| `LanguageTestListComponent` | Ekran wyboru testu — 3 karty z poziomami B1, B2/FCE, C1/CAE |
| `LanguageTestViewComponent` | Rozwiązywanie testu — pytania jedno po drugim, progress bar, 2 typy UI (MC + WF) |
| `LanguageTestResultsComponent` | Wyniki — score, pass/fail, breakdown po kategoriach, CTA generowania fiszek |
| `LanguageTestWidgetComponent` | Widget na dashboardzie — CTA przed pierwszym testem / ostatni wynik po teście |

### Serwisy

| Serwis | Odpowiedzialność |
|--------|-----------------|
| `LanguageTestService` | Logika testu — punktacja, kategoryzacja, walidacja odpowiedzi |
| `LanguageTestBankService` | Ładowanie banków pytań z JSON (HttpClient) |
| `LanguageTestResultsService` | CRUD wyników w Supabase, pobieranie ostatniego wyniku |

### Dane pytań — statyczne JSON

Pliki w `assets/test-banks/`:
- `b1.json`
- `b2-fce.json`
- `c1-cae.json`

## Model danych

### Struktura pytania (JSON)

```typescript
// Multiple Choice Cloze
interface MultipleChoiceQuestion {
  type: 'multiple-choice-cloze';
  id: string;                    // np. 'b2-mc-001'
  text: string;                  // zdanie z ___ jako luka
  options: string[];             // 4 opcje
  correctIndex: number;          // index poprawnej odpowiedzi (0-3)
  category: QuestionCategory;
  subcategory: string;
  explanation: string;           // wyjaśnienie reguły (trafia na tył fiszki)
}

// Word Formation
interface WordFormationQuestion {
  type: 'word-formation';
  id: string;                    // np. 'b2-wf-001'
  text: string;                  // zdanie z ___ jako luka
  baseWord: string;              // słowo bazowe (np. 'ASSESS')
  correctAnswer: string;         // poprawna forma (np. 'assessment')
  acceptedAnswers: string[];     // warianty pisowni
  category: QuestionCategory;
  subcategory: string;
  explanation: string;
}

type QuestionCategory = 'grammar' | 'vocabulary' | 'collocations' | 'phrasal-verbs' | 'word-building';

type TestQuestion = MultipleChoiceQuestion | WordFormationQuestion;
```

### Struktura testu (JSON)

```typescript
interface TestDefinition {
  level: string;                 // 'b1' | 'b2-fce' | 'c1-cae'
  title: string;
  description: string;
  passingScore: number;          // procent (np. 60)
  questions: TestQuestion[];     // 30 pytań (20 MC + 10 WF)
}
```

### Tabela wyników (Supabase)

```sql
CREATE TABLE language_test_results (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  level TEXT NOT NULL,
  total_score INTEGER NOT NULL,
  max_score INTEGER NOT NULL,
  percentage NUMERIC(5,2) NOT NULL,
  category_breakdown JSONB NOT NULL,
  -- {grammar: {correct: 8, total: 12}, vocabulary: {correct: 5, total: 8}, ...}
  wrong_answers JSONB NOT NULL,
  -- [{questionId, userAnswer, correctAnswer, front, back}]
  generated_set_id BIGINT REFERENCES flashcard_sets(id) ON DELETE SET NULL,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE language_test_results ENABLE ROW LEVEL SECURITY;
-- RLS: user can only see/insert own results
```

### Rozszerzenie source w flashcards

```typescript
source: 'ai-full' | 'ai-edited' | 'manual' | 'test'
```

Fiszki z błędów w teście mają `source: 'test'`.

Wymaga migracji Supabase — ALTER CHECK constraint na kolumnie `source`.

## Flow użytkownika

### Rozwiązywanie testu

1. Użytkownik wchodzi na `/language-test`
2. Widzi 3 karty z poziomami (B1, B2/FCE, C1/CAE) — info o ilości pytań i szacowanym czasie
3. Klika "Rozpocznij" → `/language-test/b2-fce`
4. Widzi pytania jedno po drugim:
   - Progress bar (np. 5/30) + typ sekcji (Multiple Choice / Word Formation)
   - MC: zdanie z luką + 4 opcje (klik aby wybrać) + "Następne"
   - WF: zdanie z luką + słowo bazowe + pole tekstowe + "Następne"
5. Po 30 pytaniach → redirect do `/language-test/b2-fce/results`

### Wyniki

1. Wynik procentowy (np. 73%) z wizualnym wskaźnikiem
2. Pass/fail wobec progu zdawalności (60%)
3. Breakdown po kategoriach — paski procentowe (grammar, vocabulary, collocations, word-building)
4. Przycisk "Utwórz fiszki z błędów":
   - Tworzy nowy `flashcard_set`: "Błędy B2 FCE — 2026-03-19"
   - Generuje fiszki z `wrong_answers`:
     - MC: front = zdanie z luką, back = poprawna odpowiedź + explanation
     - WF: front = "Utwórz formę słowa BASE_WORD: zdanie z luką", back = correctAnswer + explanation
   - source = 'test'
   - Fiszki trafiają do SM-2 — pojawiają się w sesji nauki
5. Przycisk "Powtórz test" — ponowne rozwiązanie tego samego poziomu

### Widget na dashboardzie

- **Przed pierwszym testem:** CTA "Nie znasz jeszcze swojego poziomu?" z przyciskiem "Sprawdź poziom"
- **Po teście:** ostatni wynik (%, pass/fail), mini breakdown kategorii, "Powtórz test" / "Inny poziom"
- Korzysta z istniejących stylów i komponentów PrimeNG — nie tworzy nowych klas CSS

## Nawigacja

Nowy element w `auth-navbar`: "Testy językowe" (ikona: `pi pi-check-square`) obok istniejących pozycji (Dashboard, Nauka, Zestawy, Generuj, Poradnik).

## Wzorce techniczne

- Standalone components z `ChangeDetectionStrategy.OnPush`
- Signals API do stanu komponentu (currentQuestion, answers, score)
- Lazy loading route
- BEM CSS — wykorzystanie istniejących zmiennych CSS (`--app-text`, `--app-primary`, `--app-bg`, `--app-border`)
- PrimeNG komponenty gdzie możliwe (Button, Card, ProgressBar, RadioButton, InputText)
- HttpClient do ładowania JSON z assets
- Supabase client do zapisu/odczytu wyników

## Poza zakresem (na później)

- Reading comprehension
- Listening / Writing sections
- Poziomy A1, A2, C2/CPE
- Test adaptacyjny (zmiana poziomu w trakcie)
- Timery na pytanie
- Ranking / porównanie z innymi użytkownikami
