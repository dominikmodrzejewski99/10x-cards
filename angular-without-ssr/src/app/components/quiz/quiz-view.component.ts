import { Component, OnInit, OnDestroy, inject, signal, WritableSignal, ChangeDetectionStrategy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { NgxSkeletonLoaderModule } from 'ngx-skeleton-loader';
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
  imports: [ButtonModule, NgxSkeletonLoaderModule, QuizConfigComponent, QuizQuestionComponent, QuizResultsComponent],
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
  private questionStartTime: number = 0;

  public get currentQuestionSignal(): QuizQuestion | null {
    const questions: QuizQuestion[] = this.questionsSignal();
    const index: number = this.currentIndexSignal();
    return questions[index] ?? null;
  }

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
    this.questionStartTime = Date.now();
    this.phaseSignal.set('test');
  }

  public onAnswerSubmitted(answer: QuizAnswer): void {
    const now: number = Date.now();
    const timeMs: number = now - this.questionStartTime;
    this.questionStartTime = now;

    const timedAnswer: QuizAnswer = { ...answer, timeMs };
    this.answersSignal.update((answers: QuizAnswer[]) => [...answers, timedAnswer]);

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

    if (wrongFlashcards.length === 0) return;

    // Generate questions from wrong flashcards, using full pool for distractors
    const config: QuizConfig = { ...this.lastConfig, questionCount: 'all' };

    // If fewer than 4 wrong cards, still use full flashcard pool for distractor generation
    const pool: FlashcardDTO[] = wrongFlashcards.length >= 4 ? wrongFlashcards : this.flashcardsSignal();
    const questions: QuizQuestion[] = wrongFlashcards.map((card: FlashcardDTO, index: number) => {
      // Re-use quiz service's internal logic by generating a single-card config
      const singleConfig: QuizConfig = { ...config, questionCount: 1 };
      const generated: QuizQuestion[] = this.quizService.generateQuestions([card], singleConfig);
      // Rebuild with full pool for multiple-choice distractors if needed
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

    this.questionsSignal.set(questions);
    this.currentIndexSignal.set(0);
    this.answersSignal.set([]);
    this.resultSignal.set(null);
    this.questionStartTime = Date.now();
    this.phaseSignal.set('test');
  }

  public onRetryStarred(questionIds: number[]): void {
    if (!this.lastConfig) return;

    const starredFlashcards: FlashcardDTO[] = questionIds
      .map((id: number) => {
        const question: QuizQuestion | undefined = this.questionsSignal().find((q: QuizQuestion) => q.id === id);
        return question?.sourceFlashcard;
      })
      .filter((f: FlashcardDTO | undefined): f is FlashcardDTO => !!f);

    if (starredFlashcards.length === 0) return;

    const config: QuizConfig = { ...this.lastConfig, questionCount: 'all' };
    const pool: FlashcardDTO[] = starredFlashcards.length >= 4 ? starredFlashcards : this.flashcardsSignal();
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

    this.questionsSignal.set(questions);
    this.currentIndexSignal.set(0);
    this.answersSignal.set([]);
    this.resultSignal.set(null);
    this.questionStartTime = Date.now();
    this.phaseSignal.set('test');
  }

  public onGoBack(): void {
    this.router.navigate(['/sets', this.setIdSignal()]);
  }

  public onGoBackFromConfig(): void {
    this.router.navigate(['/sets', this.setIdSignal()]);
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
