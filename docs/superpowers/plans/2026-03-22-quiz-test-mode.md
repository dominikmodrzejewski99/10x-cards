# Quiz/Test Mode Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Quizlet-style quiz mode where users test themselves on flashcards from a set with configurable question types, count, and direction.

**Architecture:** Smart/Dumb component pattern. QuizViewComponent (smart) orchestrates config→test→results flow. QuizService holds all business logic (question generation, answer validation, scoring). Three dumb components handle presentation: QuizConfigComponent, QuizQuestionComponent, QuizResultsComponent.

**Tech Stack:** Angular 21 (signals, standalone, OnPush), PrimeNG (ButtonModule, CheckboxModule, SelectModule, RadioButtonModule), SCSS with BEM + shared mixins from `src/styles/`.

**Coding Standards:** Explicit type annotations everywhere, access modifiers on all members, Signal naming convention (public = `Signal` postfix), business logic in services not components, BEM SCSS, `@use` for shared styles.

---

## File Structure

### New Files
| File | Responsibility |
|------|---------------|
| `src/app/services/quiz.service.ts` | All quiz logic: generate questions, validate answers, calculate score |
| `src/app/components/quiz/quiz-view.component.ts` | Smart container: orchestrates flow, injects QuizService |
| `src/app/components/quiz/quiz-view.component.html` | Template for quiz view |
| `src/app/components/quiz/quiz-view.component.scss` | Styles for quiz view |
| `src/app/components/quiz/quiz-list.component.ts` | Smart: fetches sets, navigates |
| `src/app/components/quiz/quiz-list.component.html` | Template for quiz list |
| `src/app/components/quiz/quiz-list.component.scss` | Styles for quiz list |
| `src/app/components/quiz/quiz-config/quiz-config.component.ts` | Dumb: config form |
| `src/app/components/quiz/quiz-config/quiz-config.component.html` | Template for config |
| `src/app/components/quiz/quiz-config/quiz-config.component.scss` | Styles for config |
| `src/app/components/quiz/quiz-question/quiz-question.component.ts` | Dumb: renders one question |
| `src/app/components/quiz/quiz-question/quiz-question.component.html` | Template for question |
| `src/app/components/quiz/quiz-question/quiz-question.component.scss` | Styles for question |
| `src/app/components/quiz/quiz-results/quiz-results.component.ts` | Dumb: score + wrong answers |
| `src/app/components/quiz/quiz-results/quiz-results.component.html` | Template for results |
| `src/app/components/quiz/quiz-results/quiz-results.component.scss` | Styles for results |

### Modified Files
| File | Change |
|------|--------|
| `src/types.ts` | Add quiz-related interfaces |
| `src/app/app.routes.ts` | Add `/quiz` and `/quiz/:setId` routes |
| `src/app/components/flashcards/flashcard-list.component.html` | Add "Test" button |
| `src/app/components/flashcards/flashcard-list.component.scss` | Add `.flist__btn--quiz` style |
| `src/app/components/navbar/navbar.component.html` | Add "Quiz" link |

---

## Chunk 1: Types, Service, and Routing

### Task 1: Add Quiz Types

**Files:**
- Modify: `src/app/../src/types.ts`

- [ ] **Step 1: Add quiz interfaces to types.ts**

Add at the end of the file, before the closing content:

```typescript
// ── Quiz types ──

export type QuizQuestionType = 'written' | 'multiple-choice' | 'true-false';

export interface QuizConfig {
  setId: number;
  questionCount: number | 'all';
  questionTypes: QuizQuestionType[];
  reversed: boolean;
}

export interface QuizQuestion {
  id: number;
  type: QuizQuestionType;
  questionText: string;
  questionImageUrl: string | null;
  correctAnswer: string;
  options?: string[];
  trueFalsePairing?: { shown: string; isCorrect: boolean };
  sourceFlashcard: FlashcardDTO;
}

export interface QuizAnswer {
  questionId: number;
  userAnswer: string;
  isCorrect: boolean;
  correctAnswer: string;
  questionText: string;
}

export interface QuizResult {
  totalQuestions: number;
  correctCount: number;
  percentage: number;
  answers: QuizAnswer[];
}
```

- [ ] **Step 2: Verify build**

Run: `cd angular-without-ssr && npx ng build --configuration=development 2>&1 | head -5`
Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add src/types.ts
git commit -m "feat(quiz): add quiz type definitions"
```

---

### Task 2: Create QuizService

**Files:**
- Create: `src/app/services/quiz.service.ts`

- [ ] **Step 1: Create the service file**

```typescript
import { Injectable } from '@angular/core';
import {
  FlashcardDTO,
  QuizConfig,
  QuizQuestion,
  QuizQuestionType,
  QuizAnswer,
  QuizResult
} from '../../types';

@Injectable({
  providedIn: 'root'
})
export class QuizService {

  public generateQuestions(flashcards: FlashcardDTO[], config: QuizConfig): QuizQuestion[] {
    const shuffled: FlashcardDTO[] = this.shuffle([...flashcards]);
    const count: number = config.questionCount === 'all'
      ? shuffled.length
      : Math.min(config.questionCount, shuffled.length);
    const selected: FlashcardDTO[] = shuffled.slice(0, count);

    return selected.map((card: FlashcardDTO, index: number) => {
      const type: QuizQuestionType = this.pickRandomType(config.questionTypes);
      return this.buildQuestion(card, type, index, config.reversed, flashcards);
    });
  }

  public validateWrittenAnswer(userAnswer: string, correctAnswer: string): boolean {
    const normalizedUser: string = userAnswer.trim().toLowerCase();
    if (!normalizedUser) return false;

    const meanings: string[] = correctAnswer.split(';').map((m: string) => m.trim().toLowerCase());
    return meanings.some((meaning: string) => meaning === normalizedUser);
  }

  public calculateResult(answers: QuizAnswer[]): QuizResult {
    const totalQuestions: number = answers.length;
    const correctCount: number = answers.filter((a: QuizAnswer) => a.isCorrect).length;
    const percentage: number = totalQuestions > 0
      ? Math.round((correctCount / totalQuestions) * 100)
      : 0;

    return { totalQuestions, correctCount, percentage, answers };
  }

  public getGradeText(percentage: number): string {
    if (percentage >= 90) return 'Świetnie!';
    if (percentage >= 70) return 'Dobra robota!';
    if (percentage >= 50) return 'Poćwicz jeszcze';
    return 'Spróbuj ponownie';
  }

  public getWrongAnswers(answers: QuizAnswer[]): QuizAnswer[] {
    return answers.filter((a: QuizAnswer) => !a.isCorrect);
  }

  private buildQuestion(
    card: FlashcardDTO,
    type: QuizQuestionType,
    index: number,
    reversed: boolean,
    allCards: FlashcardDTO[]
  ): QuizQuestion {
    const questionText: string = reversed ? card.back : card.front;
    const correctAnswer: string = reversed ? card.front : card.back;
    const questionImageUrl: string | null = reversed ? null : (card.front_image_url || null);

    const base: QuizQuestion = {
      id: index,
      type,
      questionText,
      questionImageUrl,
      correctAnswer,
      sourceFlashcard: card
    };

    if (type === 'multiple-choice') {
      base.options = this.buildMultipleChoiceOptions(correctAnswer, allCards, reversed);
    }

    if (type === 'true-false') {
      base.trueFalsePairing = this.buildTrueFalsePairing(correctAnswer, allCards, reversed);
    }

    return base;
  }

  private buildMultipleChoiceOptions(
    correctAnswer: string,
    allCards: FlashcardDTO[],
    reversed: boolean
  ): string[] {
    const answerPool: string[] = allCards
      .map((c: FlashcardDTO) => reversed ? c.front : c.back)
      .filter((a: string) => a.trim().toLowerCase() !== correctAnswer.trim().toLowerCase());

    const distractors: string[] = this.shuffle([...answerPool]).slice(0, 3);

    while (distractors.length < 3) {
      distractors.push(`—`);
    }

    const options: string[] = this.shuffle([correctAnswer, ...distractors]);
    return options;
  }

  private buildTrueFalsePairing(
    correctAnswer: string,
    allCards: FlashcardDTO[],
    reversed: boolean
  ): { shown: string; isCorrect: boolean } {
    const showCorrect: boolean = Math.random() < 0.5;

    if (showCorrect) {
      return { shown: correctAnswer, isCorrect: true };
    }

    const wrongPool: string[] = allCards
      .map((c: FlashcardDTO) => reversed ? c.front : c.back)
      .filter((a: string) => a.trim().toLowerCase() !== correctAnswer.trim().toLowerCase());

    if (wrongPool.length === 0) {
      return { shown: correctAnswer, isCorrect: true };
    }

    const wrongAnswer: string = wrongPool[Math.floor(Math.random() * wrongPool.length)];
    return { shown: wrongAnswer, isCorrect: false };
  }

  private pickRandomType(types: QuizQuestionType[]): QuizQuestionType {
    return types[Math.floor(Math.random() * types.length)];
  }

  private shuffle<T>(array: T[]): T[] {
    for (let i: number = array.length - 1; i > 0; i--) {
      const j: number = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }
}
```

- [ ] **Step 2: Verify build**

Run: `cd angular-without-ssr && npx ng build --configuration=development 2>&1 | head -5`
Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add src/app/services/quiz.service.ts
git commit -m "feat(quiz): add QuizService with question generation and answer validation"
```

---

### Task 3: Add Routes

**Files:**
- Modify: `src/app/app.routes.ts`

- [ ] **Step 1: Add quiz routes**

Add these two routes after the `study` route (line 35) in `app.routes.ts`:

```typescript
  {
    path: 'quiz',
    loadComponent: () => import('./components/quiz/quiz-list.component').then(m => m.QuizListComponent),
    canActivate: [authGuard]
  },
  {
    path: 'quiz/:setId',
    loadComponent: () => import('./components/quiz/quiz-view.component').then(m => m.QuizViewComponent),
    canActivate: [authGuard]
  },
```

- [ ] **Step 2: Commit**

```bash
git add src/app/app.routes.ts
git commit -m "feat(quiz): add quiz routes"
```

---

## Chunk 2: Dumb Components

### Task 4: QuizConfigComponent (Dumb)

**Files:**
- Create: `src/app/components/quiz/quiz-config/quiz-config.component.ts`
- Create: `src/app/components/quiz/quiz-config/quiz-config.component.html`
- Create: `src/app/components/quiz/quiz-config/quiz-config.component.scss`

- [ ] **Step 1: Create component TypeScript**

```typescript
import { Component, ChangeDetectionStrategy, input, output, InputSignal, OutputEmitterRef, signal, WritableSignal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { CheckboxModule } from 'primeng/checkbox';
import { RadioButtonModule } from 'primeng/radiobutton';
import { QuizConfig, QuizQuestionType } from '../../../../types';

interface QuestionCountOption {
  label: string;
  value: number | 'all';
}

@Component({
  selector: 'app-quiz-config',
  imports: [FormsModule, ButtonModule, SelectModule, CheckboxModule, RadioButtonModule],
  templateUrl: './quiz-config.component.html',
  styleUrls: ['./quiz-config.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class QuizConfigComponent {
  public setIdSignal: InputSignal<number> = input.required<number>({ alias: 'setId' });
  public setNameSignal: InputSignal<string> = input.required<string>({ alias: 'setName' });
  public cardCountSignal: InputSignal<number> = input.required<number>({ alias: 'cardCount' });

  public startQuiz: OutputEmitterRef<QuizConfig> = output<QuizConfig>();
  public goBack: OutputEmitterRef<void> = output<void>();

  public selectedCountSignal: WritableSignal<number | 'all'> = signal<number | 'all'>(10);
  public writtenEnabledSignal: WritableSignal<boolean> = signal<boolean>(true);
  public multipleChoiceEnabledSignal: WritableSignal<boolean> = signal<boolean>(true);
  public trueFalseEnabledSignal: WritableSignal<boolean> = signal<boolean>(true);
  public reversedSignal: WritableSignal<boolean> = signal<boolean>(false);

  public readonly COUNT_OPTIONS: QuestionCountOption[] = [
    { label: '5 pytań', value: 5 },
    { label: '10 pytań', value: 10 },
    { label: '15 pytań', value: 15 },
    { label: '20 pytań', value: 20 },
    { label: 'Wszystkie', value: 'all' }
  ];

  public get availableCountOptionsSignal(): QuestionCountOption[] {
    const count: number = this.cardCountSignal();
    return this.COUNT_OPTIONS.filter((opt: QuestionCountOption) =>
      opt.value === 'all' || opt.value <= count
    );
  }

  public get isValidSignal(): boolean {
    return this.writtenEnabledSignal() || this.multipleChoiceEnabledSignal() || this.trueFalseEnabledSignal();
  }

  public onStart(): void {
    if (!this.isValidSignal) return;

    const types: QuizQuestionType[] = [];
    if (this.writtenEnabledSignal()) types.push('written');
    if (this.multipleChoiceEnabledSignal()) types.push('multiple-choice');
    if (this.trueFalseEnabledSignal()) types.push('true-false');

    const config: QuizConfig = {
      setId: this.setIdSignal(),
      questionCount: this.selectedCountSignal(),
      questionTypes: types,
      reversed: this.reversedSignal()
    };

    this.startQuiz.emit(config);
  }

  public onGoBack(): void {
    this.goBack.emit();
  }
}
```

- [ ] **Step 2: Create component template**

```html
<div class="quiz-config">
  <h1 class="quiz-config__title">Test: {{ setNameSignal() }}</h1>
  <p class="quiz-config__subtitle">{{ cardCountSignal() }} fiszek w zestawie</p>

  <div class="quiz-config__section">
    <label class="quiz-config__label">Liczba pytań</label>
    <p-select
      [options]="availableCountOptionsSignal"
      optionLabel="label"
      optionValue="value"
      [ngModel]="selectedCountSignal()"
      (ngModelChange)="selectedCountSignal.set($event)"
      [style]="{ width: '100%' }">
    </p-select>
  </div>

  <div class="quiz-config__section">
    <label class="quiz-config__label">Typy pytań</label>
    <div class="quiz-config__checkboxes">
      <div class="quiz-config__checkbox">
        <p-checkbox
          [ngModel]="writtenEnabledSignal()"
          (ngModelChange)="writtenEnabledSignal.set($event)"
          [binary]="true"
          inputId="written"
          label="Wpisywanie odpowiedzi">
        </p-checkbox>
      </div>
      <div class="quiz-config__checkbox">
        <p-checkbox
          [ngModel]="multipleChoiceEnabledSignal()"
          (ngModelChange)="multipleChoiceEnabledSignal.set($event)"
          [binary]="true"
          inputId="multipleChoice"
          label="Wielokrotny wybór">
        </p-checkbox>
      </div>
      <div class="quiz-config__checkbox">
        <p-checkbox
          [ngModel]="trueFalseEnabledSignal()"
          (ngModelChange)="trueFalseEnabledSignal.set($event)"
          [binary]="true"
          inputId="trueFalse"
          label="Prawda / Fałsz">
        </p-checkbox>
      </div>
    </div>
    @if (!isValidSignal) {
      <small class="quiz-config__error">Wybierz co najmniej jeden typ pytania</small>
    }
  </div>

  <div class="quiz-config__section">
    <label class="quiz-config__label">Kierunek</label>
    <div class="quiz-config__radios">
      <div class="quiz-config__radio">
        <p-radioButton
          name="direction"
          [value]="false"
          [ngModel]="reversedSignal()"
          (ngModelChange)="reversedSignal.set($event)"
          inputId="frontToBack"
          label="Przód → Tył">
        </p-radioButton>
      </div>
      <div class="quiz-config__radio">
        <p-radioButton
          name="direction"
          [value]="true"
          [ngModel]="reversedSignal()"
          (ngModelChange)="reversedSignal.set($event)"
          inputId="backToFront"
          label="Tył → Przód">
        </p-radioButton>
      </div>
    </div>
  </div>

  <div class="quiz-config__actions">
    <button
      pButton
      label="Rozpocznij test"
      icon="pi pi-play"
      class="p-button-primary"
      [disabled]="!isValidSignal"
      (click)="onStart()">
    </button>
    <button
      pButton
      label="Wróć"
      icon="pi pi-arrow-left"
      class="p-button-outlined p-button-secondary"
      (click)="onGoBack()">
    </button>
  </div>
</div>
```

- [ ] **Step 3: Create component styles**

```scss
@use 'variables' as *;

.quiz-config {
  max-width: 500px;
  margin: 0 auto;
  padding: 2rem 1.25rem;
}

.quiz-config__title {
  font-size: 1.5rem;
  font-weight: 800;
  color: $color-text;
  margin: 0 0 0.25rem;
}

.quiz-config__subtitle {
  font-size: 0.85rem;
  color: $color-text-secondary;
  margin: 0 0 2rem;
}

.quiz-config__section {
  margin-bottom: 1.5rem;
}

.quiz-config__label {
  display: block;
  font-size: 0.85rem;
  font-weight: 700;
  color: $color-text;
  margin-bottom: 0.5rem;
}

.quiz-config__checkboxes,
.quiz-config__radios {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.quiz-config__error {
  display: block;
  color: $color-danger;
  font-size: 0.8rem;
  margin-top: 0.4rem;
}

.quiz-config__actions {
  display: flex;
  gap: 0.75rem;
  margin-top: 2rem;
}

@media (max-width: 480px) {
  .quiz-config {
    padding: 1.25rem 0.75rem;
  }

  .quiz-config__actions {
    flex-direction: column;
  }
}
```

- [ ] **Step 4: Verify build**

Run: `cd angular-without-ssr && npx ng build --configuration=development 2>&1 | head -5`
Expected: Build succeeds

- [ ] **Step 5: Commit**

```bash
git add src/app/components/quiz/quiz-config/
git commit -m "feat(quiz): add QuizConfigComponent (dumb)"
```

---

### Task 5: QuizQuestionComponent (Dumb)

**Files:**
- Create: `src/app/components/quiz/quiz-question/quiz-question.component.ts`
- Create: `src/app/components/quiz/quiz-question/quiz-question.component.html`
- Create: `src/app/components/quiz/quiz-question/quiz-question.component.scss`

- [ ] **Step 1: Create component TypeScript**

```typescript
import { Component, ChangeDetectionStrategy, input, output, InputSignal, OutputEmitterRef, signal, WritableSignal, computed, Signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { QuizQuestion, QuizAnswer } from '../../../../types';

@Component({
  selector: 'app-quiz-question',
  imports: [FormsModule, ButtonModule, InputTextModule],
  templateUrl: './quiz-question.component.html',
  styleUrls: ['./quiz-question.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class QuizQuestionComponent {
  public questionSignal: InputSignal<QuizQuestion> = input.required<QuizQuestion>({ alias: 'question' });
  public currentIndexSignal: InputSignal<number> = input.required<number>({ alias: 'currentIndex' });
  public totalQuestionsSignal: InputSignal<number> = input.required<number>({ alias: 'totalQuestions' });

  public answerSubmitted: OutputEmitterRef<QuizAnswer> = output<QuizAnswer>();

  public writtenAnswerSignal: WritableSignal<string> = signal<string>('');
  public selectedOptionSignal: WritableSignal<string | null> = signal<string | null>(null);
  public selectedTrueFalseSignal: WritableSignal<boolean | null> = signal<boolean | null>(null);
  public isAnsweredSignal: WritableSignal<boolean> = signal<boolean>(false);
  public isCorrectSignal: WritableSignal<boolean | null> = signal<boolean | null>(null);

  public readonly progressPercentSignal: Signal<number> = computed<number>(() => {
    const total: number = this.totalQuestionsSignal();
    return total > 0 ? Math.round((this.currentIndexSignal() / total) * 100) : 0;
  });

  public onCheckWritten(): void {
    if (this.isAnsweredSignal()) return;

    const question: QuizQuestion = this.questionSignal();
    const userAnswer: string = this.writtenAnswerSignal().trim();
    const meanings: string[] = question.correctAnswer.split(';').map((m: string) => m.trim().toLowerCase());
    const isCorrect: boolean = meanings.some((m: string) => m === userAnswer.toLowerCase());

    this.isCorrectSignal.set(isCorrect);
    this.isAnsweredSignal.set(true);
  }

  public onSelectOption(option: string): void {
    if (this.isAnsweredSignal()) return;

    this.selectedOptionSignal.set(option);
    const question: QuizQuestion = this.questionSignal();
    const isCorrect: boolean = option.trim().toLowerCase() === question.correctAnswer.trim().toLowerCase();

    this.isCorrectSignal.set(isCorrect);
    this.isAnsweredSignal.set(true);
  }

  public onSelectTrueFalse(value: boolean): void {
    if (this.isAnsweredSignal()) return;

    this.selectedTrueFalseSignal.set(value);
    const question: QuizQuestion = this.questionSignal();
    const isCorrect: boolean = value === (question.trueFalsePairing?.isCorrect ?? true);

    this.isCorrectSignal.set(isCorrect);
    this.isAnsweredSignal.set(true);
  }

  public onNext(): void {
    const question: QuizQuestion = this.questionSignal();
    let userAnswer: string = '';

    if (question.type === 'written') {
      userAnswer = this.writtenAnswerSignal().trim();
    } else if (question.type === 'multiple-choice') {
      userAnswer = this.selectedOptionSignal() || '';
    } else if (question.type === 'true-false') {
      userAnswer = this.selectedTrueFalseSignal() === true ? 'Prawda' : 'Fałsz';
    }

    const answer: QuizAnswer = {
      questionId: question.id,
      userAnswer,
      isCorrect: this.isCorrectSignal() ?? false,
      correctAnswer: question.correctAnswer,
      questionText: question.questionText
    };

    this.answerSubmitted.emit(answer);

    // Reset state for next question
    this.writtenAnswerSignal.set('');
    this.selectedOptionSignal.set(null);
    this.selectedTrueFalseSignal.set(null);
    this.isAnsweredSignal.set(false);
    this.isCorrectSignal.set(null);
  }

  public onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      if (this.isAnsweredSignal()) {
        this.onNext();
      } else if (this.questionSignal().type === 'written') {
        this.onCheckWritten();
      }
    }
  }

  public getOptionClass(option: string): string {
    if (!this.isAnsweredSignal()) return '';
    const question: QuizQuestion = this.questionSignal();
    const isCorrectOption: boolean = option.trim().toLowerCase() === question.correctAnswer.trim().toLowerCase();
    if (isCorrectOption) return 'quiz-question__option--correct';
    if (this.selectedOptionSignal() === option && !isCorrectOption) return 'quiz-question__option--wrong';
    return 'quiz-question__option--dimmed';
  }
}
```

- [ ] **Step 2: Create component template**

```html
<div class="quiz-question" (keydown)="onKeydown($event)">
  <div class="quiz-question__progress">
    <span class="quiz-question__progress-text">
      Pytanie {{ currentIndexSignal() + 1 }} / {{ totalQuestionsSignal() }}
    </span>
    <div class="quiz-question__progress-bar">
      <div class="quiz-question__progress-fill" [style.width.%]="progressPercentSignal()"></div>
    </div>
  </div>

  <div class="quiz-question__content">
    @if (questionSignal().questionImageUrl) {
      <img
        [src]="questionSignal().questionImageUrl"
        alt="Obrazek pytania"
        class="quiz-question__image" />
    }

    <h2 class="quiz-question__text">{{ questionSignal().questionText }}</h2>
  </div>

  @switch (questionSignal().type) {
    @case ('written') {
      <div class="quiz-question__written">
        <input
          type="text"
          pInputText
          class="quiz-question__input"
          [class.quiz-question__input--correct]="isAnsweredSignal() && isCorrectSignal()"
          [class.quiz-question__input--wrong]="isAnsweredSignal() && !isCorrectSignal()"
          [ngModel]="writtenAnswerSignal()"
          (ngModelChange)="writtenAnswerSignal.set($event)"
          [disabled]="isAnsweredSignal()"
          placeholder="Wpisz odpowiedź..."
          (keydown)="onKeydown($event)"
          autofocus />

        @if (!isAnsweredSignal()) {
          <button
            pButton
            label="Sprawdź"
            icon="pi pi-check"
            class="p-button-primary"
            [disabled]="!writtenAnswerSignal().trim()"
            (click)="onCheckWritten()">
          </button>
        }

        @if (isAnsweredSignal() && !isCorrectSignal()) {
          <p class="quiz-question__correct-answer">
            Poprawna odpowiedź: <strong>{{ questionSignal().correctAnswer }}</strong>
          </p>
        }
      </div>
    }

    @case ('multiple-choice') {
      <div class="quiz-question__options">
        @for (option of questionSignal().options; track option) {
          <button
            class="quiz-question__option"
            [class]="getOptionClass(option)"
            [disabled]="isAnsweredSignal()"
            (click)="onSelectOption(option)">
            {{ option }}
          </button>
        }
      </div>
    }

    @case ('true-false') {
      <div class="quiz-question__true-false">
        <p class="quiz-question__pairing">
          {{ questionSignal().questionText }} = {{ questionSignal().trueFalsePairing?.shown }}
        </p>
        <div class="quiz-question__tf-buttons">
          <button
            pButton
            label="Prawda"
            icon="pi pi-check"
            class="p-button-success p-button-outlined"
            [class.quiz-question__tf--correct]="isAnsweredSignal() && questionSignal().trueFalsePairing?.isCorrect === true"
            [class.quiz-question__tf--wrong]="isAnsweredSignal() && selectedTrueFalseSignal() === true && !questionSignal().trueFalsePairing?.isCorrect"
            [disabled]="isAnsweredSignal()"
            (click)="onSelectTrueFalse(true)">
          </button>
          <button
            pButton
            label="Fałsz"
            icon="pi pi-times"
            class="p-button-danger p-button-outlined"
            [class.quiz-question__tf--correct]="isAnsweredSignal() && questionSignal().trueFalsePairing?.isCorrect === false"
            [class.quiz-question__tf--wrong]="isAnsweredSignal() && selectedTrueFalseSignal() === false && questionSignal().trueFalsePairing?.isCorrect"
            [disabled]="isAnsweredSignal()"
            (click)="onSelectTrueFalse(false)">
          </button>
        </div>

        @if (isAnsweredSignal() && !isCorrectSignal()) {
          <p class="quiz-question__correct-answer">
            Poprawna odpowiedź: <strong>{{ questionSignal().correctAnswer }}</strong>
          </p>
        }
      </div>
    }
  }

  @if (isAnsweredSignal()) {
    <div class="quiz-question__feedback">
      @if (isCorrectSignal()) {
        <span class="quiz-question__feedback--correct">
          <i class="pi pi-check-circle"></i> Dobrze!
        </span>
      } @else {
        <span class="quiz-question__feedback--wrong">
          <i class="pi pi-times-circle"></i> Źle
        </span>
      }
    </div>

    <button
      pButton
      label="Dalej"
      icon="pi pi-arrow-right"
      iconPos="right"
      class="p-button-primary quiz-question__next"
      (click)="onNext()">
    </button>
  }
</div>
```

- [ ] **Step 3: Create component styles**

```scss
@use 'variables' as *;

.quiz-question {
  max-width: 640px;
  margin: 0 auto;
  padding: 1.5rem 1.25rem;
}

.quiz-question__progress {
  margin-bottom: 1.5rem;
}

.quiz-question__progress-text {
  font-size: 0.8rem;
  font-weight: 700;
  color: $color-text-secondary;
  display: block;
  margin-bottom: 0.4rem;
}

.quiz-question__progress-bar {
  width: 100%;
  height: 0.25rem;
  background: $color-border;
  border-radius: $radius-pill;
  overflow: hidden;
}

.quiz-question__progress-fill {
  height: 100%;
  background: $color-primary;
  border-radius: $radius-pill;
  transition: width 0.3s ease-out;
}

.quiz-question__content {
  text-align: center;
  margin-bottom: 1.5rem;
}

.quiz-question__image {
  max-width: 100%;
  max-height: 200px;
  border-radius: $radius-lg;
  margin-bottom: 1rem;
  object-fit: contain;
}

.quiz-question__text {
  font-size: 1.25rem;
  font-weight: 700;
  color: $color-text;
  margin: 0;
}

// Written answer
.quiz-question__written {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.quiz-question__input {
  width: 100%;
  padding: 0.75rem;
  font-size: 1rem;
  border: 1.5px solid $color-border;
  border-radius: $radius-md;
  transition: border-color 0.2s;

  &:focus {
    border-color: $color-primary;
    outline: none;
  }
}

.quiz-question__input--correct {
  border-color: $color-success;
  background: $color-success-light;
}

.quiz-question__input--wrong {
  border-color: $color-danger;
  background: $color-danger-light;
}

// Multiple choice
.quiz-question__options {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.quiz-question__option {
  padding: 0.85rem 1rem;
  border: 1.5px solid $color-border;
  border-radius: $radius-md;
  background: $color-white;
  color: $color-text;
  font-size: 0.95rem;
  font-family: inherit;
  text-align: left;
  cursor: pointer;
  transition: all 0.15s;

  &:hover:not(:disabled) {
    border-color: $color-primary;
    background: $color-primary-light;
  }

  &:disabled {
    cursor: default;
  }
}

.quiz-question__option--correct {
  border-color: $color-success;
  background: $color-success-light;
  color: $color-success;
  font-weight: 600;
}

.quiz-question__option--wrong {
  border-color: $color-danger;
  background: $color-danger-light;
  color: $color-danger;
}

.quiz-question__option--dimmed {
  opacity: 0.5;
}

// True/False
.quiz-question__true-false {
  text-align: center;
}

.quiz-question__pairing {
  font-size: 1.1rem;
  font-weight: 600;
  color: $color-text;
  margin: 0 0 1.25rem;
  padding: 1rem;
  background: $color-bg;
  border-radius: $radius-md;
}

.quiz-question__tf-buttons {
  display: flex;
  gap: 1rem;
  justify-content: center;
}

.quiz-question__tf--correct {
  border-color: $color-success !important;
  background: $color-success-light !important;
}

.quiz-question__tf--wrong {
  border-color: $color-danger !important;
  background: $color-danger-light !important;
}

// Correct answer display
.quiz-question__correct-answer {
  font-size: 0.9rem;
  color: $color-success;
  margin: 0.5rem 0 0;
}

// Feedback
.quiz-question__feedback {
  text-align: center;
  margin: 1.25rem 0 0.75rem;
  font-size: 1rem;
  font-weight: 700;
}

.quiz-question__feedback--correct {
  color: $color-success;
}

.quiz-question__feedback--wrong {
  color: $color-danger;
}

// Next button
.quiz-question__next {
  width: 100%;
  margin-top: 0.5rem;
}

@media (max-width: 480px) {
  .quiz-question {
    padding: 1rem 0.75rem;
  }

  .quiz-question__text {
    font-size: 1.1rem;
  }

  .quiz-question__tf-buttons {
    flex-direction: column;
    gap: 0.5rem;
  }
}
```

- [ ] **Step 4: Verify build**

Run: `cd angular-without-ssr && npx ng build --configuration=development 2>&1 | head -5`
Expected: Build succeeds

- [ ] **Step 5: Commit**

```bash
git add src/app/components/quiz/quiz-question/
git commit -m "feat(quiz): add QuizQuestionComponent (dumb) with 3 question type variants"
```

---

### Task 6: QuizResultsComponent (Dumb)

**Files:**
- Create: `src/app/components/quiz/quiz-results/quiz-results.component.ts`
- Create: `src/app/components/quiz/quiz-results/quiz-results.component.html`
- Create: `src/app/components/quiz/quiz-results/quiz-results.component.scss`

- [ ] **Step 1: Create component TypeScript**

```typescript
import { Component, ChangeDetectionStrategy, input, output, InputSignal, OutputEmitterRef } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { QuizResult, QuizAnswer } from '../../../../types';

@Component({
  selector: 'app-quiz-results',
  imports: [ButtonModule],
  templateUrl: './quiz-results.component.html',
  styleUrls: ['./quiz-results.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class QuizResultsComponent {
  public resultSignal: InputSignal<QuizResult> = input.required<QuizResult>({ alias: 'result' });
  public gradeTextSignal: InputSignal<string> = input.required<string>({ alias: 'gradeText' });

  public retry: OutputEmitterRef<void> = output<void>();
  public retryWrong: OutputEmitterRef<void> = output<void>();
  public goBack: OutputEmitterRef<void> = output<void>();

  public get wrongAnswersSignal(): QuizAnswer[] {
    return this.resultSignal().answers.filter((a: QuizAnswer) => !a.isCorrect);
  }

  public get hasWrongAnswersSignal(): boolean {
    return this.wrongAnswersSignal.length > 0;
  }

  public onRetry(): void {
    this.retry.emit();
  }

  public onRetryWrong(): void {
    this.retryWrong.emit();
  }

  public onGoBack(): void {
    this.goBack.emit();
  }
}
```

- [ ] **Step 2: Create component template**

```html
<div class="quiz-results">
  <div class="quiz-results__header">
    <div class="quiz-results__score">
      {{ resultSignal().correctCount }}/{{ resultSignal().totalQuestions }}
    </div>
    <div class="quiz-results__percentage">{{ resultSignal().percentage }}%</div>
    <h2 class="quiz-results__grade">{{ gradeTextSignal() }}</h2>
  </div>

  @if (hasWrongAnswersSignal) {
    <div class="quiz-results__wrong">
      <h3 class="quiz-results__wrong-title">Błędne odpowiedzi</h3>
      @for (answer of wrongAnswersSignal; track answer.questionId) {
        <div class="quiz-results__wrong-item">
          <p class="quiz-results__wrong-question">{{ answer.questionText }}</p>
          <p class="quiz-results__wrong-user">
            <i class="pi pi-times"></i> {{ answer.userAnswer || '(brak odpowiedzi)' }}
          </p>
          <p class="quiz-results__wrong-correct">
            <i class="pi pi-check"></i> {{ answer.correctAnswer }}
          </p>
        </div>
      }
    </div>
  }

  <div class="quiz-results__actions">
    @if (hasWrongAnswersSignal) {
      <button
        pButton
        label="Powtórz tylko błędne"
        icon="pi pi-refresh"
        class="p-button-primary"
        (click)="onRetryWrong()">
      </button>
    }
    <button
      pButton
      label="Powtórz test"
      icon="pi pi-replay"
      [class]="hasWrongAnswersSignal ? 'p-button-outlined p-button-secondary' : 'p-button-primary'"
      (click)="onRetry()">
    </button>
    <button
      pButton
      label="Wróć do zestawu"
      icon="pi pi-arrow-left"
      class="p-button-outlined p-button-secondary"
      (click)="onGoBack()">
    </button>
  </div>
</div>
```

- [ ] **Step 3: Create component styles**

```scss
@use 'variables' as *;

.quiz-results {
  max-width: 640px;
  margin: 0 auto;
  padding: 2rem 1.25rem;
}

.quiz-results__header {
  text-align: center;
  margin-bottom: 2rem;
  animation: fadeInUp 0.6s ease-out;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(24px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.quiz-results__score {
  font-size: 3rem;
  font-weight: 800;
  color: $color-text;
}

.quiz-results__percentage {
  font-size: 1.25rem;
  font-weight: 700;
  color: $color-primary;
  margin-top: 0.25rem;
}

.quiz-results__grade {
  font-size: 1.25rem;
  font-weight: 700;
  color: $color-text-secondary;
  margin: 0.5rem 0 0;
}

.quiz-results__wrong {
  margin-bottom: 2rem;
}

.quiz-results__wrong-title {
  font-size: 1rem;
  font-weight: 700;
  color: $color-text;
  margin: 0 0 1rem;
}

.quiz-results__wrong-item {
  padding: 0.75rem 1rem;
  border: 1px solid $color-border;
  border-radius: $radius-md;
  margin-bottom: 0.5rem;
  background: $color-white;
}

.quiz-results__wrong-question {
  font-weight: 600;
  color: $color-text;
  margin: 0 0 0.35rem;
  font-size: 0.9rem;
}

.quiz-results__wrong-user {
  color: $color-danger;
  font-size: 0.85rem;
  margin: 0 0 0.2rem;

  i {
    margin-right: 0.3rem;
  }
}

.quiz-results__wrong-correct {
  color: $color-success;
  font-size: 0.85rem;
  margin: 0;

  i {
    margin-right: 0.3rem;
  }
}

.quiz-results__actions {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

@media (max-width: 480px) {
  .quiz-results {
    padding: 1.25rem 0.75rem;
  }

  .quiz-results__score {
    font-size: 2.5rem;
  }
}
```

- [ ] **Step 4: Verify build**

Run: `cd angular-without-ssr && npx ng build --configuration=development 2>&1 | head -5`
Expected: Build succeeds

- [ ] **Step 5: Commit**

```bash
git add src/app/components/quiz/quiz-results/
git commit -m "feat(quiz): add QuizResultsComponent (dumb) with score and wrong answers"
```

---

## Chunk 3: Smart Components and Integration

### Task 7: QuizViewComponent (Smart)

**Files:**
- Create: `src/app/components/quiz/quiz-view.component.ts`
- Create: `src/app/components/quiz/quiz-view.component.html`
- Create: `src/app/components/quiz/quiz-view.component.scss`

- [ ] **Step 1: Create component TypeScript**

```typescript
import { Component, OnInit, OnDestroy, inject, signal, WritableSignal, ChangeDetectionStrategy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { FlashcardApiService } from '../../services/flashcard-api.service';
import { FlashcardSetApiService } from '../../services/flashcard-set-api.service';
import { QuizService } from '../../services/quiz.service';
import { QuizConfigComponent } from './quiz-config/quiz-config.component';
import { QuizQuestionComponent } from './quiz-question/quiz-question.component';
import { QuizResultsComponent } from './quiz-results/quiz-results.component';
import {
  FlashcardDTO,
  QuizConfig,
  QuizQuestion,
  QuizAnswer,
  QuizResult
} from '../../../types';

type QuizPhase = 'loading' | 'error' | 'config' | 'test' | 'results';

@Component({
  selector: 'app-quiz-view',
  imports: [QuizConfigComponent, QuizQuestionComponent, QuizResultsComponent],
  templateUrl: './quiz-view.component.html',
  styleUrls: ['./quiz-view.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class QuizViewComponent implements OnInit, OnDestroy {
  private route: ActivatedRoute = inject(ActivatedRoute);
  private router: Router = inject(Router);
  private flashcardApiService: FlashcardApiService = inject(FlashcardApiService);
  private flashcardSetApiService: FlashcardSetApiService = inject(FlashcardSetApiService);
  private quizService: QuizService = inject(QuizService);

  public phaseSignal: WritableSignal<QuizPhase> = signal<QuizPhase>('loading');
  public errorMessageSignal: WritableSignal<string> = signal<string>('');
  public setIdSignal: WritableSignal<number> = signal<number>(0);
  public setNameSignal: WritableSignal<string> = signal<string>('');
  public flashcardsSignal: WritableSignal<FlashcardDTO[]> = signal<FlashcardDTO[]>([]);
  public questionsSignal: WritableSignal<QuizQuestion[]> = signal<QuizQuestion[]>([]);
  public currentIndexSignal: WritableSignal<number> = signal<number>(0);
  public answersSignal: WritableSignal<QuizAnswer[]> = signal<QuizAnswer[]>([]);
  public resultSignal: WritableSignal<QuizResult | null> = signal<QuizResult | null>(null);
  public gradeTextSignal: WritableSignal<string> = signal<string>('');

  private lastConfig: QuizConfig | null = null;
  private routeSub: Subscription | null = null;

  public ngOnInit(): void {
    this.routeSub = this.route.params.subscribe(params => {
      const setId: number = Number(params['setId']);
      if (!setId) {
        this.router.navigate(['/quiz']);
        return;
      }
      this.setIdSignal.set(setId);
      this.loadSetData(setId);
    });
  }

  public ngOnDestroy(): void {
    this.routeSub?.unsubscribe();
  }

  public onStartQuiz(config: QuizConfig): void {
    this.lastConfig = config;
    const questions: QuizQuestion[] = this.quizService.generateQuestions(this.flashcardsSignal(), config);
    this.questionsSignal.set(questions);
    this.currentIndexSignal.set(0);
    this.answersSignal.set([]);
    this.resultSignal.set(null);
    this.phaseSignal.set('test');
  }

  public onAnswerSubmitted(answer: QuizAnswer): void {
    this.answersSignal.update((answers: QuizAnswer[]) => [...answers, answer]);

    const nextIndex: number = this.currentIndexSignal() + 1;
    if (nextIndex >= this.questionsSignal().length) {
      this.finishQuiz();
    } else {
      this.currentIndexSignal.set(nextIndex);
    }
  }

  public onRetry(): void {
    if (this.lastConfig) {
      this.onStartQuiz(this.lastConfig);
    } else {
      this.phaseSignal.set('config');
    }
  }

  public onRetryWrong(): void {
    if (!this.lastConfig || !this.resultSignal()) return;

    const wrongAnswers: QuizAnswer[] = this.quizService.getWrongAnswers(this.resultSignal()!.answers);
    const wrongFlashcards: FlashcardDTO[] = wrongAnswers
      .map((a: QuizAnswer) => {
        const question: QuizQuestion | undefined = this.questionsSignal().find((q: QuizQuestion) => q.id === a.questionId);
        return question?.sourceFlashcard;
      })
      .filter((f: FlashcardDTO | undefined): f is FlashcardDTO => !!f);

    if (wrongFlashcards.length < 4) {
      // Not enough for multiple-choice distractors, use all flashcards but only ask about wrong ones
      const config: QuizConfig = {
        ...this.lastConfig,
        questionCount: wrongFlashcards.length
      };
      // Use wrong flashcards but keep full pool for distractors
      const questions: QuizQuestion[] = this.quizService.generateQuestions(
        wrongFlashcards,
        { ...config, questionCount: 'all' }
      );
      // Rebuild with full card pool for distractors
      const fullQuestions: QuizQuestion[] = wrongFlashcards.map((card: FlashcardDTO, index: number) => {
        const type = this.lastConfig!.questionTypes[Math.floor(Math.random() * this.lastConfig!.questionTypes.length)];
        return {
          id: index,
          type,
          questionText: this.lastConfig!.reversed ? card.back : card.front,
          questionImageUrl: this.lastConfig!.reversed ? null : (card.front_image_url || null),
          correctAnswer: this.lastConfig!.reversed ? card.front : card.back,
          sourceFlashcard: card,
          ...(type === 'multiple-choice' ? {
            options: this.quizService.generateQuestions(this.flashcardsSignal(), {
              ...this.lastConfig!,
              questionCount: 1
            })[0]?.options || [card.back]
          } : {}),
          ...(type === 'true-false' ? {
            trueFalsePairing: { shown: this.lastConfig!.reversed ? card.front : card.back, isCorrect: true }
          } : {})
        } as QuizQuestion;
      });
      this.questionsSignal.set(fullQuestions.length > 0 ? fullQuestions : questions);
    } else {
      const config: QuizConfig = { ...this.lastConfig, questionCount: 'all' };
      const questions: QuizQuestion[] = this.quizService.generateQuestions(wrongFlashcards, config);
      this.questionsSignal.set(questions);
    }

    this.currentIndexSignal.set(0);
    this.answersSignal.set([]);
    this.resultSignal.set(null);
    this.phaseSignal.set('test');
  }

  public onGoBack(): void {
    this.router.navigate(['/sets', this.setIdSignal()]);
  }

  public onGoBackFromConfig(): void {
    this.router.navigate(['/sets', this.setIdSignal()]);
  }

  public get currentQuestionSignal(): QuizQuestion | null {
    const questions: QuizQuestion[] = this.questionsSignal();
    const index: number = this.currentIndexSignal();
    return questions[index] ?? null;
  }

  private loadSetData(setId: number): void {
    this.phaseSignal.set('loading');

    this.flashcardSetApiService.getSet(setId).subscribe({
      next: (set) => {
        this.setNameSignal.set(set.name);
        this.loadFlashcards(setId);
      },
      error: () => {
        this.errorMessageSignal.set('Nie znaleziono zestawu.');
        this.phaseSignal.set('error');
      }
    });
  }

  private loadFlashcards(setId: number): void {
    this.flashcardApiService.getFlashcards({
      limit: 9999,
      offset: 0,
      setId
    }).subscribe({
      next: (response) => {
        if (response.flashcards.length < 4) {
          this.errorMessageSignal.set('Zestaw musi mieć minimum 4 fiszki, aby uruchomić test.');
          this.phaseSignal.set('error');
          return;
        }
        this.flashcardsSignal.set(response.flashcards);
        this.phaseSignal.set('config');
      },
      error: () => {
        this.errorMessageSignal.set('Nie udało się pobrać fiszek.');
        this.phaseSignal.set('error');
      }
    });
  }

  private finishQuiz(): void {
    const result: QuizResult = this.quizService.calculateResult(this.answersSignal());
    this.resultSignal.set(result);
    this.gradeTextSignal.set(this.quizService.getGradeText(result.percentage));
    this.phaseSignal.set('results');
  }
}
```

- [ ] **Step 2: Create component template**

```html
<div class="quiz-view">
  @switch (phaseSignal()) {
    @case ('loading') {
      <div class="quiz-view__state">
        <i class="pi pi-spin pi-spinner quiz-view__state-icon"></i>
        <p class="quiz-view__state-text">Ładowanie zestawu...</p>
      </div>
    }

    @case ('error') {
      <div class="quiz-view__state">
        <i class="pi pi-exclamation-triangle quiz-view__state-icon" style="color: #ff6240;"></i>
        <p class="quiz-view__state-text">{{ errorMessageSignal() }}</p>
        <button
          pButton
          label="Wróć do zestawu"
          icon="pi pi-arrow-left"
          class="p-button-outlined p-button-secondary"
          (click)="onGoBack()">
        </button>
      </div>
    }

    @case ('config') {
      <app-quiz-config
        [setId]="setIdSignal()"
        [setName]="setNameSignal()"
        [cardCount]="flashcardsSignal().length"
        (startQuiz)="onStartQuiz($event)"
        (goBack)="onGoBackFromConfig()">
      </app-quiz-config>
    }

    @case ('test') {
      @if (currentQuestionSignal; as question) {
        <app-quiz-question
          [question]="question"
          [currentIndex]="currentIndexSignal()"
          [totalQuestions]="questionsSignal().length"
          (answerSubmitted)="onAnswerSubmitted($event)">
        </app-quiz-question>
      }
    }

    @case ('results') {
      @if (resultSignal(); as result) {
        <app-quiz-results
          [result]="result"
          [gradeText]="gradeTextSignal()"
          (retry)="onRetry()"
          (retryWrong)="onRetryWrong()"
          (goBack)="onGoBack()">
        </app-quiz-results>
      }
    }
  }
</div>
```

- [ ] **Step 3: Create component styles**

```scss
@use 'variables' as *;

.quiz-view {
  min-height: calc(100vh - 64px);
}

.quiz-view__state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  padding: 4rem 1rem;
  text-align: center;
}

.quiz-view__state-icon {
  font-size: 3rem;
  color: $color-primary;
}

.quiz-view__state-text {
  color: $color-text-secondary;
  font-size: 0.95rem;
  margin: 0;
}
```

- [ ] **Step 4: Verify build**

Run: `cd angular-without-ssr && npx ng build --configuration=development 2>&1 | head -5`
Expected: Build succeeds

- [ ] **Step 5: Commit**

```bash
git add src/app/components/quiz/quiz-view.component.*
git commit -m "feat(quiz): add QuizViewComponent (smart) orchestrating config/test/results flow"
```

---

### Task 8: QuizListComponent (Smart)

**Files:**
- Create: `src/app/components/quiz/quiz-list.component.ts`
- Create: `src/app/components/quiz/quiz-list.component.html`
- Create: `src/app/components/quiz/quiz-list.component.scss`

- [ ] **Step 1: Create component TypeScript**

```typescript
import { Component, OnInit, inject, signal, WritableSignal, ChangeDetectionStrategy } from '@angular/core';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { FlashcardSetApiService } from '../../services/flashcard-set-api.service';
import { FlashcardApiService } from '../../services/flashcard-api.service';
import { FlashcardSetDTO } from '../../../types';
import { forkJoin } from 'rxjs';

interface QuizSetItem {
  set: FlashcardSetDTO;
  cardCount: number;
}

@Component({
  selector: 'app-quiz-list',
  imports: [ButtonModule],
  templateUrl: './quiz-list.component.html',
  styleUrls: ['./quiz-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class QuizListComponent implements OnInit {
  private router: Router = inject(Router);
  private flashcardSetApiService: FlashcardSetApiService = inject(FlashcardSetApiService);
  private flashcardApiService: FlashcardApiService = inject(FlashcardApiService);

  public setsSignal: WritableSignal<QuizSetItem[]> = signal<QuizSetItem[]>([]);
  public loadingSignal: WritableSignal<boolean> = signal<boolean>(true);
  public errorSignal: WritableSignal<string | null> = signal<string | null>(null);

  public ngOnInit(): void {
    this.loadSets();
  }

  public onStartQuiz(setId: number): void {
    this.router.navigate(['/quiz', setId]);
  }

  public onGoToSets(): void {
    this.router.navigate(['/sets']);
  }

  private loadSets(): void {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    this.flashcardSetApiService.getSets().subscribe({
      next: (sets: FlashcardSetDTO[]) => {
        if (sets.length === 0) {
          this.setsSignal.set([]);
          this.loadingSignal.set(false);
          return;
        }

        const countObservables = sets.map((set: FlashcardSetDTO) =>
          this.flashcardApiService.getFlashcards({ limit: 1, offset: 0, setId: set.id })
        );

        forkJoin(countObservables).subscribe({
          next: (responses) => {
            const items: QuizSetItem[] = sets.map((set: FlashcardSetDTO, i: number) => ({
              set,
              cardCount: responses[i].totalRecords
            }));
            this.setsSignal.set(items);
            this.loadingSignal.set(false);
          },
          error: () => {
            this.errorSignal.set('Nie udało się pobrać liczby fiszek.');
            this.loadingSignal.set(false);
          }
        });
      },
      error: () => {
        this.errorSignal.set('Nie udało się pobrać zestawów.');
        this.loadingSignal.set(false);
      }
    });
  }
}
```

- [ ] **Step 2: Create component template**

```html
<div class="quiz-list">
  <h1 class="quiz-list__title">Wybierz zestaw do testu</h1>

  @if (loadingSignal()) {
    <div class="quiz-list__state">
      <i class="pi pi-spin pi-spinner" style="font-size: 2rem; color: #4255ff;"></i>
    </div>
  }

  @if (errorSignal()) {
    <div class="quiz-list__state">
      <p class="quiz-list__state-text">{{ errorSignal() }}</p>
    </div>
  }

  @if (!loadingSignal() && !errorSignal() && setsSignal().length === 0) {
    <div class="quiz-list__state">
      <i class="pi pi-folder-open" style="font-size: 2.5rem; color: #4255ff;"></i>
      <p class="quiz-list__state-text">Nie masz jeszcze zestawów fiszek.</p>
      <button
        pButton
        label="Przejdź do zestawów"
        icon="pi pi-arrow-right"
        class="p-button-primary"
        (click)="onGoToSets()">
      </button>
    </div>
  }

  @if (!loadingSignal() && !errorSignal() && setsSignal().length > 0) {
    <div class="quiz-list__grid">
      @for (item of setsSignal(); track item.set.id) {
        <div class="quiz-list__card">
          <div class="quiz-list__card-body">
            <h3 class="quiz-list__card-name">{{ item.set.name }}</h3>
            <p class="quiz-list__card-count">{{ item.cardCount }} fiszek</p>
          </div>
          <button
            pButton
            label="Rozpocznij test"
            icon="pi pi-play"
            class="p-button-primary p-button-sm"
            [disabled]="item.cardCount < 4"
            [title]="item.cardCount < 4 ? 'Minimum 4 fiszki' : ''"
            (click)="onStartQuiz(item.set.id)">
          </button>
        </div>
      }
    </div>
  }
</div>
```

- [ ] **Step 3: Create component styles**

```scss
@use 'variables' as *;

.quiz-list {
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem 1.25rem;
}

.quiz-list__title {
  font-size: 1.5rem;
  font-weight: 800;
  color: $color-text;
  margin: 0 0 1.5rem;
}

.quiz-list__state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  padding: 4rem 0;
  text-align: center;
}

.quiz-list__state-text {
  color: $color-text-secondary;
  font-size: 0.95rem;
  margin: 0;
}

.quiz-list__grid {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.quiz-list__card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.25rem;
  border: 1px solid $color-border;
  border-radius: $radius-lg;
  background: $color-white;
  transition: box-shadow 0.15s;

  &:hover {
    box-shadow: $shadow-md;
  }
}

.quiz-list__card-body {
  flex: 1;
  min-width: 0;
}

.quiz-list__card-name {
  font-size: 1rem;
  font-weight: 700;
  color: $color-text;
  margin: 0 0 0.15rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.quiz-list__card-count {
  font-size: 0.8rem;
  color: $color-text-secondary;
  margin: 0;
}

@media (max-width: 480px) {
  .quiz-list {
    padding: 1.25rem 0.75rem;
  }

  .quiz-list__card {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.75rem;
  }
}
```

- [ ] **Step 4: Verify build**

Run: `cd angular-without-ssr && npx ng build --configuration=development 2>&1 | head -5`
Expected: Build succeeds

- [ ] **Step 5: Commit**

```bash
git add src/app/components/quiz/quiz-list.component.*
git commit -m "feat(quiz): add QuizListComponent (smart) with set selection"
```

---

### Task 9: Add "Test" Button to Flashcard List + Navbar Link

**Files:**
- Modify: `src/app/components/flashcards/flashcard-list.component.html`
- Modify: `src/app/components/flashcards/flashcard-list.component.scss`
- Modify: `src/app/components/navbar/navbar.component.html` (if navbar has links)

- [ ] **Step 1: Add "Test" button to flashcard-list.component.html**

In `flashcard-list.component.html`, add the Test button after the Study link (line 11), inside `.flist__actions`:

```html
      <a [routerLink]="['/quiz', state().setId]" class="flist__btn flist__btn--quiz" data-test-id="start-quiz-button">
        <i class="pi pi-file-edit"></i> Test
      </a>
```

So the actions section becomes:
```html
    <div class="flist__actions">
      <a [routerLink]="['/study']" [queryParams]="{setId: state().setId}" class="flist__btn flist__btn--study" data-test-id="start-study-button">
        <i class="pi pi-book"></i> Rozpocznij naukę
      </a>
      <a [routerLink]="['/quiz', state().setId]" class="flist__btn flist__btn--quiz" data-test-id="start-quiz-button">
        <i class="pi pi-file-edit"></i> Test
      </a>
      <button (click)="openAddModal()" class="flist__btn flist__btn--add" data-test-id="add-flashcard-button">
        <i class="pi pi-plus"></i> Dodaj fiszkę
      </button>
      <button (click)="openImportModal()" class="flist__btn flist__btn--import" data-test-id="import-flashcards-button">
        <i class="pi pi-upload"></i> Importuj
      </button>
    </div>
```

- [ ] **Step 2: Add quiz button style to flashcard-list.component.scss**

Add after `.flist__btn--study`:

```scss
.flist__btn--quiz {
  @include btn-warning;
  @include btn-md;
}
```

- [ ] **Step 3: Add Quiz link to navbar (if applicable)**

Check `src/app/components/navbar/navbar.component.html` for existing nav links. Add a "Quiz" link alongside existing links (Dashboard, Zestawy, Nauka, etc.):

```html
<a routerLink="/quiz" routerLinkActive="navbar__link--active" class="navbar__link">
  <i class="pi pi-file-edit"></i> Quiz
</a>
```

- [ ] **Step 4: Verify build**

Run: `cd angular-without-ssr && npx ng build --configuration=development 2>&1 | head -5`
Expected: Build succeeds

- [ ] **Step 5: Verify the app runs**

Run: `cd angular-without-ssr && npx ng serve &` then open http://localhost:4200/quiz
Expected: Quiz list page loads, navigating to a set shows Test button

- [ ] **Step 6: Commit**

```bash
git add src/app/components/flashcards/flashcard-list.component.html src/app/components/flashcards/flashcard-list.component.scss src/app/components/navbar/
git commit -m "feat(quiz): add Test button to flashcard list and Quiz link to navbar"
```

---

### Task 10: Final Verification

- [ ] **Step 1: Full build check**

Run: `cd angular-without-ssr && npx ng build 2>&1 | tail -5`
Expected: Build succeeds with no errors

- [ ] **Step 2: Manual smoke test**

Verify the following flow works:
1. Navigate to `/quiz` — see set list
2. Click a set with ≥4 cards — see config screen
3. Configure and start test — questions display correctly
4. Answer all questions — results screen shows
5. "Powtórz test" works
6. "Wróć do zestawu" navigates back
7. Test button in `/sets/:id` navigates to `/quiz/:setId`

- [ ] **Step 3: Final commit (if any fixes needed)**

```bash
git add -A
git commit -m "fix(quiz): address smoke test issues"
```
