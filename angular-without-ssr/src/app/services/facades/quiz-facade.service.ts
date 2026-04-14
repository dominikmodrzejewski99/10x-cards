import { Injectable, inject, signal, computed, Signal, WritableSignal } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import { FlashcardApiService } from '../api/flashcard-api.service';
import { FlashcardSetApiService } from '../api/flashcard-set-api.service';
import { QuizService } from '../domain/quiz.service';
import {
  FlashcardDTO,
  FlashcardSetDTO,
  QuizConfig,
  QuizQuestion,
  QuizAnswer,
  QuizResult
} from '../../../types';

export type QuizPhase = 'loading' | 'error' | 'config' | 'test' | 'results';

export interface QuizSetItem {
  set: FlashcardSetDTO;
  cardCount: number;
}

@Injectable({ providedIn: 'root' })
export class QuizFacadeService {
  private readonly flashcardApi: FlashcardApiService = inject(FlashcardApiService);
  private readonly setApi: FlashcardSetApiService = inject(FlashcardSetApiService);
  private readonly quizService: QuizService = inject(QuizService);
  private readonly t: TranslocoService = inject(TranslocoService);

  // --- Quiz list state ---
  private readonly _quizSets: WritableSignal<QuizSetItem[]> = signal<QuizSetItem[]>([]);
  private readonly _quizSetsLoading: WritableSignal<boolean> = signal<boolean>(true);
  private readonly _quizSetsError: WritableSignal<string | null> = signal<string | null>(null);

  public readonly quizSetsSignal: Signal<QuizSetItem[]> = this._quizSets.asReadonly();
  public readonly quizSetsLoadingSignal: Signal<boolean> = this._quizSetsLoading.asReadonly();
  public readonly quizSetsErrorSignal: Signal<string | null> = this._quizSetsError.asReadonly();

  // --- Quiz session state ---
  private readonly _phase: WritableSignal<QuizPhase> = signal<QuizPhase>('loading');
  private readonly _errorMessage: WritableSignal<string> = signal<string>('');
  private readonly _setId: WritableSignal<number> = signal<number>(0);
  private readonly _setName: WritableSignal<string> = signal<string>('');
  private readonly _flashcards: WritableSignal<FlashcardDTO[]> = signal<FlashcardDTO[]>([]);
  private readonly _questions: WritableSignal<QuizQuestion[]> = signal<QuizQuestion[]>([]);
  private readonly _currentIndex: WritableSignal<number> = signal<number>(0);
  private readonly _answers: WritableSignal<QuizAnswer[]> = signal<QuizAnswer[]>([]);
  private readonly _result: WritableSignal<QuizResult | null> = signal<QuizResult | null>(null);
  private readonly _gradeText: WritableSignal<string> = signal<string>('');

  public readonly phaseSignal: Signal<QuizPhase> = this._phase.asReadonly();
  public readonly errorMessageSignal: Signal<string> = this._errorMessage.asReadonly();
  public readonly setIdSignal: Signal<number> = this._setId.asReadonly();
  public readonly setNameSignal: Signal<string> = this._setName.asReadonly();
  public readonly flashcardsSignal: Signal<FlashcardDTO[]> = this._flashcards.asReadonly();
  public readonly questionsSignal: Signal<QuizQuestion[]> = this._questions.asReadonly();
  public readonly currentIndexSignal: Signal<number> = this._currentIndex.asReadonly();
  public readonly answersSignal: Signal<QuizAnswer[]> = this._answers.asReadonly();
  public readonly resultSignal: Signal<QuizResult | null> = this._result.asReadonly();
  public readonly gradeTextSignal: Signal<string> = this._gradeText.asReadonly();

  public readonly currentQuestionSignal: Signal<QuizQuestion | null> = computed<QuizQuestion | null>(() => {
    const questions: QuizQuestion[] = this._questions();
    const index: number = this._currentIndex();
    return questions[index] ?? null;
  });

  private lastConfig: QuizConfig | null = null;
  private questionStartTime: number = 0;

  public loadQuizSets(): void {
    this._quizSetsLoading.set(true);
    this._quizSetsError.set(null);

    this.setApi.getSetsWithCardCount().subscribe({
      next: (items: QuizSetItem[]) => {
        this._quizSets.set(items);
        this._quizSetsLoading.set(false);
      },
      error: () => {
        this._quizSetsError.set(this.t.translate('quiz.errors.loadSetsFailed'));
        this._quizSetsLoading.set(false);
      },
    });
  }

  public loadSetData(setId: number): void {
    this._phase.set('loading');
    this._setId.set(setId);

    this.setApi.getSet(setId).subscribe({
      next: (set) => {
        this._setName.set(set.name);
        this.loadFlashcards(setId);
      },
      error: () => {
        this._errorMessage.set(this.t.translate('quiz.errors.setNotFound'));
        this._phase.set('error');
      }
    });
  }

  public startQuiz(config: QuizConfig): void {
    this.lastConfig = config;
    const questions: QuizQuestion[] = this.quizService.generateQuestions(this._flashcards(), config);
    this._questions.set(questions);
    this._currentIndex.set(0);
    this._answers.set([]);
    this._result.set(null);
    this.questionStartTime = Date.now();
    this._phase.set('test');
  }

  public submitAnswer(answer: QuizAnswer): void {
    const now: number = Date.now();
    const timeMs: number = now - this.questionStartTime;
    this.questionStartTime = now;

    const timedAnswer: QuizAnswer = { ...answer, timeMs };
    this._answers.update((answers: QuizAnswer[]) => [...answers, timedAnswer]);

    const nextIndex: number = this._currentIndex() + 1;
    if (nextIndex >= this._questions().length) {
      this.finishQuiz();
    } else {
      this._currentIndex.set(nextIndex);
    }
  }

  public retry(): void {
    if (this.lastConfig) {
      this.startQuiz(this.lastConfig);
    } else {
      this._phase.set('config');
    }
  }

  public retryWrong(): void {
    const result: QuizResult | null = this._result();
    if (!this.lastConfig || !result) return;

    const wrongAnswers: QuizAnswer[] = this.quizService.getWrongAnswers(result.answers);
    const wrongFlashcards: FlashcardDTO[] = wrongAnswers
      .map((a: QuizAnswer) => {
        const question: QuizQuestion | undefined = this._questions().find((q: QuizQuestion) => q.id === a.questionId);
        return question?.sourceFlashcard;
      })
      .filter((f: FlashcardDTO | undefined): f is FlashcardDTO => !!f);

    if (wrongFlashcards.length === 0) return;

    const config: QuizConfig = { ...this.lastConfig, questionCount: 'all' };
    const pool: FlashcardDTO[] = wrongFlashcards.length >= 4 ? wrongFlashcards : this._flashcards();
    const questions: QuizQuestion[] = wrongFlashcards.map((card: FlashcardDTO, index: number) => {
      const singleConfig: QuizConfig = { ...config, questionCount: 1 };
      const generated: QuizQuestion[] = this.quizService.generateQuestions([card], singleConfig);
      if (generated[0] && generated[0].type === 'multiple-choice' && pool.length > wrongFlashcards.length) {
        const fullGenerated: QuizQuestion[] = this.quizService.generateQuestions(pool, { ...config, questionCount: pool.length });
        const matching: QuizQuestion | undefined = fullGenerated.find(
          (q: QuizQuestion) => q.sourceFlashcard.id === card.id && q.type === 'multiple-choice'
        );
        if (matching) {
          return { ...matching, id: index };
        }
      }
      return { ...generated[0], id: index };
    });

    this._questions.set(questions);
    this._currentIndex.set(0);
    this._answers.set([]);
    this._result.set(null);
    this.questionStartTime = Date.now();
    this._phase.set('test');
  }

  public retryStarred(questionIds: number[]): void {
    if (!this.lastConfig) return;

    const starredFlashcards: FlashcardDTO[] = questionIds
      .map((id: number) => {
        const question: QuizQuestion | undefined = this._questions().find((q: QuizQuestion) => q.id === id);
        return question?.sourceFlashcard;
      })
      .filter((f: FlashcardDTO | undefined): f is FlashcardDTO => !!f);

    if (starredFlashcards.length === 0) return;

    const config: QuizConfig = { ...this.lastConfig, questionCount: 'all' };
    const pool: FlashcardDTO[] = starredFlashcards.length >= 4 ? starredFlashcards : this._flashcards();
    const questions: QuizQuestion[] = starredFlashcards.map((card: FlashcardDTO, index: number) => {
      const singleConfig: QuizConfig = { ...config, questionCount: 1 };
      const generated: QuizQuestion[] = this.quizService.generateQuestions([card], singleConfig);
      if (generated[0] && generated[0].type === 'multiple-choice' && pool.length > starredFlashcards.length) {
        const fullGenerated: QuizQuestion[] = this.quizService.generateQuestions(pool, { ...config, questionCount: pool.length });
        const matching: QuizQuestion | undefined = fullGenerated.find(
          (q: QuizQuestion) => q.sourceFlashcard.id === card.id && q.type === 'multiple-choice'
        );
        if (matching) {
          return { ...matching, id: index };
        }
      }
      return { ...generated[0], id: index };
    });

    this._questions.set(questions);
    this._currentIndex.set(0);
    this._answers.set([]);
    this._result.set(null);
    this.questionStartTime = Date.now();
    this._phase.set('test');
  }

  public reset(): void {
    this._phase.set('loading');
    this._errorMessage.set('');
    this._setId.set(0);
    this._setName.set('');
    this._flashcards.set([]);
    this._questions.set([]);
    this._currentIndex.set(0);
    this._answers.set([]);
    this._result.set(null);
    this._gradeText.set('');
    this.lastConfig = null;
    this.questionStartTime = 0;
  }

  private loadFlashcards(setId: number): void {
    this.flashcardApi.getAllFlashcardsForSet(setId).subscribe({
      next: (flashcards: FlashcardDTO[]) => {
        if (flashcards.length < 4) {
          this._errorMessage.set(this.t.translate('quiz.errors.minCards'));
          this._phase.set('error');
          return;
        }
        this._flashcards.set(flashcards);
        this._phase.set('config');
      },
      error: () => {
        this._errorMessage.set(this.t.translate('quiz.errors.loadFlashcardsFailed'));
        this._phase.set('error');
      }
    });
  }

  private finishQuiz(): void {
    const result: QuizResult = this.quizService.calculateResult(this._answers());
    this._result.set(result);
    this._gradeText.set(this.quizService.getGradeText(result.percentage));
    this._phase.set('results');
  }
}
