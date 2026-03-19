# Language Tests Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Use of English language proficiency tests (B1, B2/FCE, C1/CAE) with results analysis and flashcard generation from wrong answers.

**Architecture:** Static JSON question banks loaded via HttpClient, test state managed with Angular signals, results persisted to Supabase `language_test_results` table. Flashcards generated from wrong answers integrate with existing SM-2 spaced repetition system.

**Tech Stack:** Angular 21 (standalone, OnPush, signals), Supabase (PostgreSQL + RLS), PrimeNG, BEM CSS

**Spec:** `docs/superpowers/specs/2026-03-19-language-tests-design.md`

---

## Chunk 1: Database, Types, and Services

### Task 1: Supabase Migration — language_test_results table + source extension

**Files:**
- Create: `supabase/migrations/20260319000000_language_tests.sql`

- [ ] **Step 1: Create migration file**

```sql
SET search_path = public, pg_temp;

-- Extend flashcards.source CHECK constraint to include 'test'
ALTER TABLE flashcards DROP CONSTRAINT flashcards_source_check;
ALTER TABLE flashcards ADD CONSTRAINT flashcards_source_check
  CHECK (source IN ('ai-full', 'ai-edited', 'manual', 'test'));

-- Extend front column for test-generated flashcards (sentences can be long)
ALTER TABLE flashcards ALTER COLUMN front TYPE varchar(500);

-- Create language test results table
CREATE TABLE language_test_results (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  level TEXT NOT NULL,
  total_score INTEGER NOT NULL,
  max_score INTEGER NOT NULL,
  percentage NUMERIC(5,2) NOT NULL,
  category_breakdown JSONB NOT NULL,
  wrong_answers JSONB NOT NULL,
  generated_set_id BIGINT REFERENCES flashcard_sets(id) ON DELETE SET NULL,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE language_test_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own test results"
  ON language_test_results FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own test results"
  ON language_test_results FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own test results"
  ON language_test_results FOR UPDATE
  USING (auth.uid() = user_id);

-- Index
CREATE INDEX idx_language_test_results_user_id ON language_test_results(user_id);

-- Updated_at trigger
CREATE TRIGGER handle_updated_at
  BEFORE UPDATE ON language_test_results
  FOR EACH ROW
  EXECUTE FUNCTION moddatetime(updated_at);
```

- [ ] **Step 2: Apply migration locally**

Run: `cd C:/Users/domin/Desktop/Projects/10x-cards && npx supabase db push` (or apply via Supabase dashboard)

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260319000000_language_tests.sql
git commit -m "feat: add language_test_results table and extend source constraint"
```

---

### Task 2: TypeScript Types — language test interfaces + Source extension

**Files:**
- Modify: `angular-without-ssr/src/types.ts`

- [ ] **Step 1: Extend Source type**

In `src/types.ts`, change line 37:

```typescript
// OLD:
export type Source = 'ai-full' | 'ai-edited' | 'manual';

// NEW:
export type Source = 'ai-full' | 'ai-edited' | 'manual' | 'test';
```

- [ ] **Step 2: Add language test types at the end of types.ts**

Append to `src/types.ts`:

```typescript
// ============ Language Tests ============

export type TestLevel = 'b1' | 'b2-fce' | 'c1-cae';

export type QuestionCategory = 'grammar' | 'vocabulary' | 'collocations' | 'phrasal-verbs' | 'word-building';

export interface MultipleChoiceQuestion {
  type: 'multiple-choice-cloze';
  id: string;
  text: string;
  options: string[];
  correctIndex: number;
  category: QuestionCategory;
  subcategory: string;
  explanation: string;
}

export interface WordFormationQuestion {
  type: 'word-formation';
  id: string;
  text: string;
  baseWord: string;
  correctAnswer: string;
  acceptedAnswers: string[];
  category: QuestionCategory;
  subcategory: string;
  explanation: string;
}

export type TestQuestion = MultipleChoiceQuestion | WordFormationQuestion;

export interface TestDefinition {
  level: TestLevel;
  title: string;
  description: string;
  passingScore: number;
  questions: TestQuestion[];
}

export interface CategoryBreakdown {
  [category: string]: { correct: number; total: number };
}

export interface WrongAnswer {
  questionId: string;
  userAnswer: string;
  correctAnswer: string;
  front: string;
  back: string;
}

export interface LanguageTestResultDTO {
  id: number;
  user_id: string;
  level: TestLevel;
  total_score: number;
  max_score: number;
  percentage: number;
  category_breakdown: CategoryBreakdown;
  wrong_answers: WrongAnswer[];
  generated_set_id: number | null;
  completed_at: string;
  created_at: string;
  updated_at: string;
}
```

- [ ] **Step 3: Verify build compiles**

Run: `cd angular-without-ssr && npx ng build --configuration=development 2>&1 | tail -5`

- [ ] **Step 4: Commit**

```bash
git add angular-without-ssr/src/types.ts
git commit -m "feat: add language test types and extend Source with 'test'"
```

---

### Task 3: LanguageTestBankService — load question banks from JSON

**Files:**
- Create: `angular-without-ssr/src/app/services/language-test-bank.service.ts`

- [ ] **Step 1: Create the service**

```typescript
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, shareReplay } from 'rxjs';
import { TestDefinition, TestLevel } from '../../types';

@Injectable({
  providedIn: 'root'
})
export class LanguageTestBankService {
  private http = inject(HttpClient);
  private cache = new Map<TestLevel, Observable<TestDefinition>>();

  private readonly paths: Record<TestLevel, string> = {
    'b1': 'assets/test-banks/b1.json',
    'b2-fce': 'assets/test-banks/b2-fce.json',
    'c1-cae': 'assets/test-banks/c1-cae.json'
  };

  getTest(level: TestLevel): Observable<TestDefinition> {
    const cached = this.cache.get(level);
    if (cached) return cached;

    const test$ = this.http.get<TestDefinition>(this.paths[level]).pipe(
      shareReplay(1)
    );
    this.cache.set(level, test$);
    return test$;
  }

  getAvailableLevels(): { level: TestLevel; title: string; description: string; questionCount: number; estimatedMinutes: number }[] {
    return [
      { level: 'b1', title: 'B1 Preliminary', description: 'Test sprawdzający znajomość angielskiego na poziomie B1', questionCount: 30, estimatedMinutes: 20 },
      { level: 'b2-fce', title: 'B2 First (FCE)', description: 'Test sprawdzający znajomość angielskiego na poziomie B2', questionCount: 30, estimatedMinutes: 25 },
      { level: 'c1-cae', title: 'C1 Advanced (CAE)', description: 'Test sprawdzający znajomość angielskiego na poziomie C1', questionCount: 30, estimatedMinutes: 30 }
    ];
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add angular-without-ssr/src/app/services/language-test-bank.service.ts
git commit -m "feat: add LanguageTestBankService for loading question banks"
```

---

### Task 4: LanguageTestService — scoring, validation, categorization

**Files:**
- Create: `angular-without-ssr/src/app/services/language-test.service.ts`

- [ ] **Step 1: Create the service**

```typescript
import { Injectable } from '@angular/core';
import {
  TestQuestion, MultipleChoiceQuestion, WordFormationQuestion,
  CategoryBreakdown, WrongAnswer
} from '../../types';

export interface TestAnswer {
  questionId: string;
  answer: string | number; // index for MC, string for WF
}

export interface TestResult {
  totalScore: number;
  maxScore: number;
  percentage: number;
  categoryBreakdown: CategoryBreakdown;
  wrongAnswers: WrongAnswer[];
  passed: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class LanguageTestService {

  evaluateTest(questions: TestQuestion[], answers: TestAnswer[], passingScore: number): TestResult {
    const categoryBreakdown: CategoryBreakdown = {};
    const wrongAnswers: WrongAnswer[] = [];
    let totalScore = 0;

    for (const question of questions) {
      const answer = answers.find(a => a.questionId === question.id);
      const isCorrect = answer ? this.isAnswerCorrect(question, answer) : false;

      // Update category breakdown
      if (!categoryBreakdown[question.category]) {
        categoryBreakdown[question.category] = { correct: 0, total: 0 };
      }
      categoryBreakdown[question.category].total++;

      if (isCorrect) {
        totalScore++;
        categoryBreakdown[question.category].correct++;
      } else {
        wrongAnswers.push(this.buildWrongAnswer(question, answer));
      }
    }

    const percentage = Math.round((totalScore / questions.length) * 100 * 100) / 100;

    return {
      totalScore,
      maxScore: questions.length,
      percentage,
      categoryBreakdown,
      wrongAnswers,
      passed: percentage >= passingScore
    };
  }

  private isAnswerCorrect(question: TestQuestion, answer: TestAnswer): boolean {
    if (question.type === 'multiple-choice-cloze') {
      return answer.answer === (question as MultipleChoiceQuestion).correctIndex;
    }
    if (question.type === 'word-formation') {
      const wf = question as WordFormationQuestion;
      const userAnswer = String(answer.answer).trim().toLowerCase();
      return wf.acceptedAnswers.some(a => a.toLowerCase() === userAnswer);
    }
    return false;
  }

  private buildWrongAnswer(question: TestQuestion, answer: TestAnswer | undefined): WrongAnswer {
    const userAnswer = answer ? String(answer.answer) : '(brak odpowiedzi)';

    if (question.type === 'multiple-choice-cloze') {
      const mc = question as MultipleChoiceQuestion;
      const userAnswerText = typeof answer?.answer === 'number'
        ? mc.options[answer.answer]
        : userAnswer;
      return {
        questionId: question.id,
        userAnswer: userAnswerText,
        correctAnswer: mc.options[mc.correctIndex],
        front: mc.text,
        back: `${mc.options[mc.correctIndex]} — ${mc.explanation}`
      };
    }

    const wf = question as WordFormationQuestion;
    return {
      questionId: question.id,
      userAnswer,
      correctAnswer: wf.correctAnswer,
      front: `Utwórz formę słowa ${wf.baseWord}: ${wf.text}`,
      back: `${wf.correctAnswer} — ${wf.explanation}`
    };
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add angular-without-ssr/src/app/services/language-test.service.ts
git commit -m "feat: add LanguageTestService for scoring and validation"
```

---

### Task 5: LanguageTestResultsService — Supabase CRUD for results

**Files:**
- Create: `angular-without-ssr/src/app/services/language-test-results.service.ts`

- [ ] **Step 1: Create the service**

Follow the exact pattern from `review-api.service.ts` — inject `SupabaseClientFactory`, use `getCurrentUserId()`, return Observables.

```typescript
import { Injectable, inject } from '@angular/core';
import { Observable, from, switchMap, map, catchError, throwError } from 'rxjs';
import { SupabaseClient } from '@supabase/supabase-js';
import { SupabaseClientFactory } from './supabase-client.factory';
import { LanguageTestResultDTO, TestLevel, CategoryBreakdown, WrongAnswer } from '../../types';

@Injectable({
  providedIn: 'root'
})
export class LanguageTestResultsService {
  private supabase: SupabaseClient = inject(SupabaseClientFactory).getClient();

  private getCurrentUserId(): Observable<string> {
    return from(this.supabase.auth.getSession()).pipe(
      map(response => {
        if (response.error || !response.data.session?.user?.id) {
          throw new Error('User not authenticated');
        }
        return response.data.session.user.id;
      })
    );
  }

  saveResult(data: {
    level: TestLevel;
    totalScore: number;
    maxScore: number;
    percentage: number;
    categoryBreakdown: CategoryBreakdown;
    wrongAnswers: WrongAnswer[];
  }): Observable<LanguageTestResultDTO> {
    return this.getCurrentUserId().pipe(
      switchMap(userId =>
        from(
          this.supabase
            .from('language_test_results')
            .insert({
              user_id: userId,
              level: data.level,
              total_score: data.totalScore,
              max_score: data.maxScore,
              percentage: data.percentage,
              category_breakdown: data.categoryBreakdown,
              wrong_answers: data.wrongAnswers,
              completed_at: new Date().toISOString(),
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .select()
            .single()
        ).pipe(
          map(response => {
            if (response.error) throw new Error(response.error.message);
            return response.data as LanguageTestResultDTO;
          })
        )
      ),
      catchError(error => throwError(() => error))
    );
  }

  getLatestResult(level?: TestLevel): Observable<LanguageTestResultDTO | null> {
    return this.getCurrentUserId().pipe(
      switchMap(userId => {
        let query = this.supabase
          .from('language_test_results')
          .select('*')
          .eq('user_id', userId)
          .order('completed_at', { ascending: false })
          .limit(1);

        if (level) {
          query = query.eq('level', level);
        }

        return from(query).pipe(
          map(response => {
            if (response.error) throw new Error(response.error.message);
            return response.data.length > 0 ? response.data[0] as LanguageTestResultDTO : null;
          })
        );
      }),
      catchError(error => throwError(() => error))
    );
  }

  updateGeneratedSetId(resultId: number, setId: number): Observable<void> {
    return from(
      this.supabase
        .from('language_test_results')
        .update({ generated_set_id: setId, updated_at: new Date().toISOString() })
        .eq('id', resultId)
    ).pipe(
      map(response => {
        if (response.error) throw new Error(response.error.message);
      }),
      catchError(error => throwError(() => error))
    );
  }
}
```

- [ ] **Step 2: Verify build compiles**

Run: `cd angular-without-ssr && npx ng build --configuration=development 2>&1 | tail -5`

- [ ] **Step 3: Commit**

```bash
git add angular-without-ssr/src/app/services/language-test-results.service.ts
git commit -m "feat: add LanguageTestResultsService for Supabase CRUD"
```

---

### Task 6: Question Bank JSON — B2 FCE starter

**Files:**
- Create: `angular-without-ssr/src/assets/test-banks/b2-fce.json`
- Create: `angular-without-ssr/src/assets/test-banks/b1.json`
- Create: `angular-without-ssr/src/assets/test-banks/c1-cae.json`

- [ ] **Step 1: Create B2 FCE question bank**

Create `src/assets/test-banks/b2-fce.json` with 30 questions (20 MC + 10 WF). The questions should be real B2-level English Use of English content. Each question must have `id`, `type`, `text` (with `___` for gap), `category`, `subcategory`, and `explanation`.

Example structure:

```json
{
  "level": "b2-fce",
  "title": "B2 First (FCE) — Use of English",
  "description": "Test sprawdzający znajomość angielskiego na poziomie B2",
  "passingScore": 60,
  "questions": [
    {
      "type": "multiple-choice-cloze",
      "id": "b2-mc-001",
      "text": "She ___ to the party if she had known about it.",
      "options": ["would go", "would have gone", "will go", "had gone"],
      "correctIndex": 1,
      "category": "grammar",
      "subcategory": "conditionals",
      "explanation": "Third conditional: would have + past participle for unreal past situations."
    },
    {
      "type": "word-formation",
      "id": "b2-wf-001",
      "text": "His ___ of the situation was completely wrong.",
      "baseWord": "ASSESS",
      "correctAnswer": "assessment",
      "acceptedAnswers": ["assessment"],
      "category": "word-building",
      "subcategory": "noun-formation",
      "explanation": "ASSESS (verb) → assessment (noun): the act of assessing."
    }
  ]
}
```

Generate all 30 questions covering categories: grammar (conditionals, tenses, passive, reported speech), vocabulary (collocations, phrasal verbs), word-building (noun/adjective/adverb formation).

- [ ] **Step 2: Create B1 question bank**

Same structure, 30 questions at B1 level. Simpler grammar (present/past simple, comparatives, basic modals), everyday vocabulary.

- [ ] **Step 3: Create C1 CAE question bank**

Same structure, 30 questions at C1 level. Advanced grammar (inversions, cleft sentences, mixed conditionals), academic vocabulary, complex word formation.

- [ ] **Step 4: Commit**

```bash
git add angular-without-ssr/src/assets/test-banks/
git commit -m "feat: add question banks for B1, B2-FCE, C1-CAE tests"
```

---

## Chunk 2: Components and Routing

### Task 7: LanguageTestListComponent — test selection screen

**Files:**
- Create: `angular-without-ssr/src/app/components/language-test/language-test-list.component.ts`
- Create: `angular-without-ssr/src/app/components/language-test/language-test-list.component.html`
- Create: `angular-without-ssr/src/app/components/language-test/language-test-list.component.scss`

- [ ] **Step 1: Create the component**

```typescript
import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { LanguageTestBankService } from '../../services/language-test-bank.service';

@Component({
  selector: 'app-language-test-list',
  standalone: true,
  imports: [RouterModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './language-test-list.component.html',
  styleUrl: './language-test-list.component.scss'
})
export class LanguageTestListComponent {
  private bankService = inject(LanguageTestBankService);
  levels = this.bankService.getAvailableLevels();
}
```

- [ ] **Step 2: Create the template**

Display 3 cards (B1, B2/FCE, C1/CAE). Each card shows: level badge (colored circle), title, description, question count, estimated time, and "Rozpocznij →" link to `/language-test/:level`.

Use existing BEM patterns from `learning-guide` (`.guide__card` style) and PrimeNG where appropriate. Use CSS variables (`--app-text`, `--app-primary`, `--app-bg`, `--app-border`).

```html
<div class="test-list">
  <header class="test-list__header">
    <div class="test-list__header-icon">
      <i class="pi pi-check-square"></i>
    </div>
    <h1 class="test-list__title">Sprawdź swój poziom</h1>
    <p class="test-list__subtitle">
      Wybierz egzamin i sprawdź swoją znajomość angielskiego. Test Use of English obejmuje
      Multiple Choice Cloze i Word Formation.
    </p>
  </header>

  <div class="test-list__grid">
    @for (item of levels; track item.level) {
      <a [routerLink]="['/language-test', item.level]" class="test-list__card">
        <div class="test-list__card-badge" [attr.data-level]="item.level">
          {{ item.level === 'b1' ? 'B1' : item.level === 'b2-fce' ? 'B2' : 'C1' }}
        </div>
        <div class="test-list__card-body">
          <h2 class="test-list__card-title">{{ item.title }}</h2>
          <p class="test-list__card-desc">{{ item.description }}</p>
          <div class="test-list__card-meta">
            <span><i class="pi pi-question-circle"></i> {{ item.questionCount }} pytań</span>
            <span><i class="pi pi-clock"></i> ~{{ item.estimatedMinutes }} min</span>
          </div>
        </div>
        <div class="test-list__card-arrow">
          <i class="pi pi-arrow-right"></i>
        </div>
      </a>
    }
  </div>
</div>
```

- [ ] **Step 3: Create SCSS**

Style the cards with existing CSS variables. Level badges colored: B1 = blue (`#3b82f6`), B2 = purple (`#8b5cf6`), C1 = amber (`#d97706`). Responsive grid (1 column on mobile). Follow BEM. Reuse `--app-*` variables.

- [ ] **Step 4: Verify build compiles**

Run: `cd angular-without-ssr && npx ng build --configuration=development 2>&1 | tail -5`

- [ ] **Step 5: Commit**

```bash
git add angular-without-ssr/src/app/components/language-test/language-test-list.*
git commit -m "feat: add LanguageTestListComponent — test selection screen"
```

---

### Task 8: LanguageTestViewComponent — test taking UI

**Files:**
- Create: `angular-without-ssr/src/app/components/language-test/language-test-view.component.ts`
- Create: `angular-without-ssr/src/app/components/language-test/language-test-view.component.html`
- Create: `angular-without-ssr/src/app/components/language-test/language-test-view.component.scss`

- [ ] **Step 1: Create the component**

```typescript
import { Component, ChangeDetectionStrategy, inject, signal, computed, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { LanguageTestBankService } from '../../services/language-test-bank.service';
import { LanguageTestService, TestAnswer } from '../../services/language-test.service';
import { LanguageTestResultsService } from '../../services/language-test-results.service';
import { TestDefinition, TestLevel, TestQuestion } from '../../../types';

@Component({
  selector: 'app-language-test-view',
  standalone: true,
  imports: [FormsModule, RouterModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './language-test-view.component.html',
  styleUrl: './language-test-view.component.scss'
})
export class LanguageTestViewComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private bankService = inject(LanguageTestBankService);
  private testService = inject(LanguageTestService);
  private resultsService = inject(LanguageTestResultsService);

  testDefinition = signal<TestDefinition | null>(null);
  currentIndex = signal(0);
  answers = signal<TestAnswer[]>([]);
  selectedOption = signal<number | null>(null);
  wordFormationInput = signal('');
  loading = signal(true);
  submitting = signal(false);
  error = signal<string | null>(null);

  currentQuestion = computed<TestQuestion | null>(() => {
    const test = this.testDefinition();
    if (!test) return null;
    return test.questions[this.currentIndex()] ?? null;
  });

  progress = computed(() => {
    const test = this.testDefinition();
    if (!test) return 0;
    return Math.round(((this.currentIndex()) / test.questions.length) * 100);
  });

  isLastQuestion = computed(() => {
    const test = this.testDefinition();
    if (!test) return false;
    return this.currentIndex() === test.questions.length - 1;
  });

  canProceed = computed(() => {
    const q = this.currentQuestion();
    if (!q) return false;
    if (q.type === 'multiple-choice-cloze') return this.selectedOption() !== null;
    if (q.type === 'word-formation') return this.wordFormationInput().trim().length > 0;
    return false;
  });

  ngOnInit(): void {
    const level = this.route.snapshot.paramMap.get('level') as TestLevel;
    if (!level || !['b1', 'b2-fce', 'c1-cae'].includes(level)) {
      this.router.navigate(['/language-test']);
      return;
    }

    this.bankService.getTest(level).subscribe({
      next: test => {
        this.testDefinition.set(test);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Nie udało się załadować testu. Spróbuj ponownie.');
        this.loading.set(false);
      }
    });
  }

  selectOption(index: number): void {
    this.selectedOption.set(index);
  }

  next(): void {
    const q = this.currentQuestion();
    if (!q) return;

    // Save answer
    const answer: TestAnswer = {
      questionId: q.id,
      answer: q.type === 'multiple-choice-cloze'
        ? this.selectedOption()!
        : this.wordFormationInput().trim()
    };

    this.answers.update(prev => [...prev, answer]);

    if (this.isLastQuestion()) {
      this.submitTest();
      return;
    }

    // Move to next question
    this.currentIndex.update(i => i + 1);
    this.selectedOption.set(null);
    this.wordFormationInput.set('');
  }

  private submitTest(): void {
    const test = this.testDefinition();
    if (!test) return;

    this.submitting.set(true);
    const result = this.testService.evaluateTest(test.questions, this.answers(), test.passingScore);

    this.resultsService.saveResult({
      level: test.level,
      totalScore: result.totalScore,
      maxScore: result.maxScore,
      percentage: result.percentage,
      categoryBreakdown: result.categoryBreakdown,
      wrongAnswers: result.wrongAnswers
    }).subscribe({
      next: () => {
        this.router.navigate(['/language-test', test.level, 'results']);
      },
      error: () => {
        // Save failed but still show results (loaded from memory via query params or latest)
        this.router.navigate(['/language-test', test.level, 'results']);
      }
    });
  }
}
```

- [ ] **Step 2: Create the template**

Two UI modes based on `currentQuestion().type`:

**Multiple Choice Cloze:** Progress bar, sentence with highlighted gap (`___`), 4 radio-style options (A/B/C/D), "Następne →" button.

**Word Formation:** Progress bar, sentence with dashed gap, base word badge (yellow), text input field, "Następne →" button.

Both: current index / total, section type label, disabled button until answer selected.

```html
<div class="test-view">
  @if (loading()) {
    <div class="test-view__loading">
      <i class="pi pi-spin pi-spinner"></i> Ładowanie testu...
    </div>
  } @else if (error()) {
    <div class="test-view__error">
      <i class="pi pi-exclamation-triangle"></i>
      <p>{{ error() }}</p>
      <a routerLink="/language-test" class="test-view__back">← Wróć do wyboru testu</a>
    </div>
  } @else if (currentQuestion(); as q) {
    <!-- Progress -->
    <div class="test-view__progress">
      <span class="test-view__progress-text">{{ currentIndex() + 1 }}/{{ testDefinition()!.questions.length }}</span>
      <div class="test-view__progress-bar">
        <div class="test-view__progress-fill" [style.width.%]="progress()"></div>
      </div>
      <span class="test-view__progress-type">
        {{ q.type === 'multiple-choice-cloze' ? 'Multiple Choice' : 'Word Formation' }}
      </span>
    </div>

    <!-- Question: Multiple Choice -->
    @if (q.type === 'multiple-choice-cloze') {
      <div class="test-view__question">
        <p class="test-view__sentence" [innerHTML]="q.text.replace('___', '<span class=\'test-view__gap\'>______</span>')"></p>
      </div>
      <div class="test-view__options">
        @for (option of q.options; track $index) {
          <button
            class="test-view__option"
            [class.test-view__option--selected]="selectedOption() === $index"
            (click)="selectOption($index)"
          >
            <span class="test-view__option-letter">{{ ['A','B','C','D'][$index] }}</span>
            {{ option }}
          </button>
        }
      </div>
    }

    <!-- Question: Word Formation -->
    @if (q.type === 'word-formation') {
      <div class="test-view__question">
        <p class="test-view__sentence" [innerHTML]="q.text.replace('___', '<span class=\'test-view__gap test-view__gap--dashed\'>______</span>')"></p>
      </div>
      <div class="test-view__base-word">
        <span class="test-view__base-word-label">Słowo bazowe:</span>
        <span class="test-view__base-word-value">{{ q.baseWord }}</span>
      </div>
      <input
        type="text"
        class="test-view__input"
        [ngModel]="wordFormationInput()"
        (ngModelChange)="wordFormationInput.set($event)"
        placeholder="Wpisz odpowiedź..."
        (keydown.enter)="canProceed() && next()"
      />
    }

    <!-- Next button -->
    <div class="test-view__actions">
      <button
        class="test-view__next"
        [disabled]="!canProceed() || submitting()"
        (click)="next()"
      >
        @if (submitting()) {
          <i class="pi pi-spin pi-spinner"></i> Zapisywanie...
        } @else if (isLastQuestion()) {
          Zakończ test
        } @else {
          Następne →
        }
      </button>
    </div>
  }
</div>
```

- [ ] **Step 3: Create SCSS**

Style matching existing app design. Progress bar with gradient. Options as clickable cards with selected state (border color change). Word Formation input styled consistently. Use `--app-*` CSS variables. Responsive.

- [ ] **Step 4: Verify build compiles**

Run: `cd angular-without-ssr && npx ng build --configuration=development 2>&1 | tail -5`

- [ ] **Step 5: Commit**

```bash
git add angular-without-ssr/src/app/components/language-test/language-test-view.*
git commit -m "feat: add LanguageTestViewComponent — test taking UI"
```

---

### Task 9: LanguageTestResultsComponent — results and flashcard generation

**Files:**
- Create: `angular-without-ssr/src/app/components/language-test/language-test-results.component.ts`
- Create: `angular-without-ssr/src/app/components/language-test/language-test-results.component.html`
- Create: `angular-without-ssr/src/app/components/language-test/language-test-results.component.scss`

- [ ] **Step 1: Create the component**

```typescript
import { Component, ChangeDetectionStrategy, inject, signal, computed, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { LanguageTestResultsService } from '../../services/language-test-results.service';
import { FlashcardSetApiService } from '../../services/flashcard-set-api.service';
import { FlashcardApiService } from '../../services/flashcard-api.service';
import { LanguageTestResultDTO, TestLevel } from '../../../types';
import { switchMap } from 'rxjs';

@Component({
  selector: 'app-language-test-results',
  standalone: true,
  imports: [RouterModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './language-test-results.component.html',
  styleUrl: './language-test-results.component.scss'
})
export class LanguageTestResultsComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private resultsService = inject(LanguageTestResultsService);
  private setApi = inject(FlashcardSetApiService);
  private flashcardApi = inject(FlashcardApiService);

  result = signal<LanguageTestResultDTO | null>(null);
  loading = signal(true);
  generatingFlashcards = signal(false);
  flashcardsGenerated = signal(false);
  error = signal<string | null>(null);

  categories = computed(() => {
    const r = this.result();
    if (!r) return [];
    return Object.entries(r.category_breakdown).map(([name, data]) => ({
      name,
      correct: data.correct,
      total: data.total,
      percentage: Math.round((data.correct / data.total) * 100)
    }));
  });

  ngOnInit(): void {
    const level = this.route.snapshot.paramMap.get('level') as TestLevel;
    if (!level || !['b1', 'b2-fce', 'c1-cae'].includes(level)) {
      this.router.navigate(['/language-test']);
      return;
    }

    this.resultsService.getLatestResult(level).subscribe({
      next: result => {
        if (!result) {
          this.router.navigate(['/language-test']);
          return;
        }
        this.result.set(result);
        this.flashcardsGenerated.set(result.generated_set_id !== null);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Nie udało się załadować wyników.');
        this.loading.set(false);
      }
    });
  }

  generateFlashcards(): void {
    const r = this.result();
    if (!r || r.wrong_answers.length === 0) return;

    this.generatingFlashcards.set(true);

    const today = new Date().toISOString().split('T')[0];
    const levelLabel = r.level === 'b1' ? 'B1' : r.level === 'b2-fce' ? 'B2 FCE' : 'C1 CAE';

    this.setApi.createSet({
      name: `Błędy ${levelLabel} — ${today}`,
      description: `Fiszki z błędnych odpowiedzi w teście ${levelLabel}`
    }).pipe(
      switchMap(set => {
        const proposals = r.wrong_answers.map(wa => ({
          front: wa.front,
          back: wa.back,
          source: 'test' as const
        }));
        return this.flashcardApi.createFlashcards(proposals, set.id).pipe(
          switchMap(() => this.resultsService.updateGeneratedSetId(r.id, set.id))
        );
      })
    ).subscribe({
      next: () => {
        this.flashcardsGenerated.set(true);
        this.generatingFlashcards.set(false);
      },
      error: () => {
        this.error.set('Nie udało się utworzyć fiszek. Spróbuj ponownie.');
        this.generatingFlashcards.set(false);
      }
    });
  }

  getLevelLabel(): string {
    const r = this.result();
    if (!r) return '';
    if (r.level === 'b1') return 'B1 Preliminary';
    if (r.level === 'b2-fce') return 'B2 First (FCE)';
    return 'C1 Advanced (CAE)';
  }
}
```

- [ ] **Step 2: Create the template**

Show: score circle (percentage), pass/fail label, correct/total count, category breakdown bars (colored by performance: green ≥70%, amber ≥50%, red <50%), "Utwórz fiszki z błędów" button (disabled if already generated), "Powtórz test" link, "Inny test" link.

```html
<div class="test-results">
  @if (loading()) {
    <div class="test-results__loading">
      <i class="pi pi-spin pi-spinner"></i> Ładowanie wyników...
    </div>
  } @else if (result(); as r) {
    <!-- Score -->
    <div class="test-results__score">
      <div class="test-results__score-circle" [class.test-results__score-circle--pass]="r.percentage >= 60" [class.test-results__score-circle--fail]="r.percentage < 60">
        {{ r.percentage }}%
      </div>
      <div class="test-results__score-label" [class.test-results__score-label--pass]="r.percentage >= 60" [class.test-results__score-label--fail]="r.percentage < 60">
        {{ r.percentage >= 60 ? 'Zdane!' : 'Nie zdane' }}
      </div>
      <div class="test-results__score-detail">
        {{ r.total_score }}/{{ r.max_score }} poprawnych · {{ getLevelLabel() }} · Próg: 60%
      </div>
    </div>

    <!-- Category Breakdown -->
    <div class="test-results__breakdown">
      <h3 class="test-results__breakdown-title">Analiza kategorii</h3>
      @for (cat of categories; track cat.name) {
        <div class="test-results__category">
          <span class="test-results__category-name">{{ cat.name }}</span>
          <div class="test-results__category-bar">
            <div
              class="test-results__category-fill"
              [class.test-results__category-fill--green]="cat.percentage >= 70"
              [class.test-results__category-fill--amber]="cat.percentage >= 50 && cat.percentage < 70"
              [class.test-results__category-fill--red]="cat.percentage < 50"
              [style.width.%]="cat.percentage"
            ></div>
          </div>
          <span class="test-results__category-pct">{{ cat.percentage }}%</span>
        </div>
      }
    </div>

    <!-- Actions -->
    <div class="test-results__actions">
      @if (r.wrong_answers.length > 0) {
        <button
          class="test-results__btn test-results__btn--primary"
          [disabled]="flashcardsGenerated() || generatingFlashcards()"
          (click)="generateFlashcards()"
        >
          @if (generatingFlashcards()) {
            <i class="pi pi-spin pi-spinner"></i> Tworzenie fiszek...
          } @else if (flashcardsGenerated()) {
            <i class="pi pi-check"></i> Fiszki utworzone
          } @else {
            <i class="pi pi-clone"></i> Utwórz fiszki z błędów ({{ r.wrong_answers.length }})
          }
        </button>
      }
      <a [routerLink]="['/language-test', r.level]" class="test-results__btn test-results__btn--secondary">
        <i class="pi pi-replay"></i> Powtórz test
      </a>
      <a routerLink="/language-test" class="test-results__btn test-results__btn--secondary">
        <i class="pi pi-list"></i> Inny test
      </a>
    </div>

    @if (error()) {
      <div class="test-results__error">
        <i class="pi pi-exclamation-triangle"></i> {{ error() }}
      </div>
    }
  }
</div>
```

- [ ] **Step 3: Create SCSS**

Score circle centered, large font. Category bars horizontal. Actions as button row. Use `--app-*` variables. Pass = green, fail = red.

- [ ] **Step 4: Verify build compiles**

Run: `cd angular-without-ssr && npx ng build --configuration=development 2>&1 | tail -5`

- [ ] **Step 5: Commit**

```bash
git add angular-without-ssr/src/app/components/language-test/language-test-results.*
git commit -m "feat: add LanguageTestResultsComponent — results and flashcard generation"
```

---

### Task 10: Routing, Navbar, and Dashboard Widget

**Files:**
- Modify: `angular-without-ssr/src/app/app.routes.ts`
- Modify: `angular-without-ssr/src/app/shared/components/auth-navbar.component.ts` (template + scss)
- Modify: `angular-without-ssr/src/app/components/dashboard/dashboard.component.ts` (imports)
- Modify: `angular-without-ssr/src/app/components/dashboard/dashboard.component.html`
- Create: `angular-without-ssr/src/app/components/language-test/language-test-widget.component.ts`

- [ ] **Step 1: Add routes to app.routes.ts**

Add three new routes after existing ones, following the same pattern:

```typescript
{
  path: 'language-test',
  loadComponent: () => import('./components/language-test/language-test-list.component').then(m => m.LanguageTestListComponent),
  canActivate: [authGuard]
},
{
  path: 'language-test/:level',
  loadComponent: () => import('./components/language-test/language-test-view.component').then(m => m.LanguageTestViewComponent),
  canActivate: [authGuard]
},
{
  path: 'language-test/:level/results',
  loadComponent: () => import('./components/language-test/language-test-results.component').then(m => m.LanguageTestResultsComponent),
  canActivate: [authGuard]
},
```

- [ ] **Step 2: Add nav item to auth-navbar**

Add a new link in the desktop nav section (after "Poradnik") and in the mobile drawer:

```html
<a routerLink="/language-test" routerLinkActive="navbar__link--active" class="navbar__link">
  <i class="pi pi-check-square"></i> Testy
</a>
```

- [ ] **Step 3: Create LanguageTestWidgetComponent**

Inline template component. Two states based on whether `getLatestResult()` returns data.

```typescript
import { Component, ChangeDetectionStrategy, ViewEncapsulation, inject, signal, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { LanguageTestResultsService } from '../../services/language-test-results.service';
import { LanguageTestResultDTO } from '../../../types';

@Component({
  selector: 'app-language-test-widget',
  standalone: true,
  imports: [RouterModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  template: `
    @if (!loading()) {
      <div class="dash__card dash__card--test-widget">
        @if (latestResult(); as r) {
          <div class="dash__test-result">
            <div class="dash__test-score" [class.dash__test-score--pass]="r.percentage >= 60" [class.dash__test-score--fail]="r.percentage < 60">
              {{ r.percentage }}%
            </div>
            <div class="dash__test-info">
              <strong>{{ getLevelLabel(r.level) }} — {{ r.percentage >= 60 ? 'Zdane!' : 'Nie zdane' }}</strong>
              <span class="dash__test-date">{{ getRelativeDate(r.completed_at) }}</span>
            </div>
            <div class="dash__test-actions">
              <a [routerLink]="['/language-test', r.level]" class="dash__test-btn">Powtórz</a>
              <a routerLink="/language-test" class="dash__test-btn dash__test-btn--secondary">Inny test</a>
            </div>
          </div>
        } @else {
          <div class="dash__test-cta">
            <i class="pi pi-check-square"></i>
            <div>
              <strong>Nie znasz jeszcze swojego poziomu?</strong>
              <p>Sprawdź znajomość angielskiego na poziomie B1, B2 lub C1</p>
            </div>
            <a routerLink="/language-test" class="dash__test-btn">Sprawdź poziom →</a>
          </div>
        }
      </div>
    }
  `,
  styles: [] // ViewEncapsulation.None — styles defined in dashboard.component.css
})
export class LanguageTestWidgetComponent implements OnInit {
  private resultsService = inject(LanguageTestResultsService);
  latestResult = signal<LanguageTestResultDTO | null>(null);
  loading = signal(true);

  ngOnInit(): void {
    this.resultsService.getLatestResult().subscribe({
      next: result => {
        this.latestResult.set(result);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  getLevelLabel(level: string): string {
    if (level === 'b1') return 'B1';
    if (level === 'b2-fce') return 'B2 FCE';
    return 'C1 CAE';
  }

  getRelativeDate(dateStr: string): string {
    const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
    if (days === 0) return 'Dzisiaj';
    if (days === 1) return 'Wczoraj';
    return `${days} dni temu`;
  }
}
```

- [ ] **Step 4: Embed widget in dashboard**

In `dashboard.component.ts`, add `LanguageTestWidgetComponent` to imports array.

In `dashboard.component.html`, add `<app-language-test-widget />` after line 116 (closing `}` of the stats section), before line 118 (`<!-- Card Status Breakdown -->`).

Style the widget in `dashboard.component.css` using existing dashboard card patterns (`.dashboard__card`). No new BEM block — extend existing dashboard styles with modifiers.

- [ ] **Step 5: Verify build compiles and app runs**

Run: `cd angular-without-ssr && npx ng build --configuration=development 2>&1 | tail -5`

- [ ] **Step 6: Commit**

```bash
git add angular-without-ssr/src/app/app.routes.ts \
  angular-without-ssr/src/app/shared/components/auth-navbar.component.ts \
  angular-without-ssr/src/app/components/language-test/language-test-widget.component.ts \
  angular-without-ssr/src/app/components/dashboard/dashboard.component.ts \
  angular-without-ssr/src/app/components/dashboard/dashboard.component.html \
  angular-without-ssr/src/app/components/dashboard/dashboard.component.css
git commit -m "feat: add routing, navbar link, and dashboard widget for language tests"
```

---

## Chunk 3: Polish and Verification

### Task 11: End-to-end verification

- [ ] **Step 1: Run full build**

Run: `cd angular-without-ssr && npx ng build 2>&1 | tail -10`

Expected: Build succeeds with no errors.

- [ ] **Step 2: Manual smoke test**

Run: `cd angular-without-ssr && npx ng serve`

Verify in browser:
1. `/language-test` — shows 3 test cards
2. Click B2 FCE → `/language-test/b2-fce` — questions appear, progress bar works
3. Answer all 30 questions → redirects to `/language-test/b2-fce/results`
4. Results show score, category breakdown
5. "Utwórz fiszki z błędów" creates a flashcard set
6. Dashboard widget shows last result
7. Navbar has "Testy" link

- [ ] **Step 3: Final commit if any fixes needed**

```bash
git add -A
git commit -m "fix: polish language tests after smoke testing"
```
