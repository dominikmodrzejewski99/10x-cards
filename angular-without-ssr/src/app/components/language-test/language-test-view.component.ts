import { Component, ChangeDetectionStrategy, inject, signal, computed, OnInit, OnDestroy, Signal, WritableSignal } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { LanguageTestBankService } from '../../services/language-test-bank.service';
import { LanguageTestService, TestAnswer } from '../../services/language-test.service';
import { LanguageTestResultsService } from '../../services/language-test-results.service';
import { NgxSkeletonLoaderModule } from 'ngx-skeleton-loader';
import { TestDefinition, TestLevel, TestQuestion } from '../../../types';

@Component({
  selector: 'app-language-test-view',
  imports: [FormsModule, RouterModule, NgxSkeletonLoaderModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './language-test-view.component.html',
  styleUrl: './language-test-view.component.scss',
  host: {
    '(document:keydown)': 'onKeydown($event)'
  }
})
export class LanguageTestViewComponent implements OnInit, OnDestroy {
  private route: ActivatedRoute = inject(ActivatedRoute);
  private router: Router = inject(Router);
  private bankService: LanguageTestBankService = inject(LanguageTestBankService);
  private testService: LanguageTestService = inject(LanguageTestService);
  private resultsService: LanguageTestResultsService = inject(LanguageTestResultsService);

  public testDefinitionSignal: WritableSignal<TestDefinition | null> = signal<TestDefinition | null>(null);
  public currentIndexSignal: WritableSignal<number> = signal<number>(0);
  public answersMapSignal: WritableSignal<Map<number, TestAnswer>> = signal<Map<number, TestAnswer>>(new Map());
  public selectedOptionSignal: WritableSignal<number | null> = signal<number | null>(null);
  public wordFormationInputSignal: WritableSignal<string> = signal<string>('');
  public loadingSignal: WritableSignal<boolean> = signal<boolean>(true);
  public submittingSignal: WritableSignal<boolean> = signal<boolean>(false);
  public errorSignal: WritableSignal<string | null> = signal<string | null>(null);

  public readonly currentQuestionSignal: Signal<TestQuestion | null> = computed<TestQuestion | null>(() => {
    const test: TestDefinition | null = this.testDefinitionSignal();
    if (!test) return null;
    return test.questions[this.currentIndexSignal()] ?? null;
  });

  public readonly progressSignal: Signal<number> = computed<number>(() => {
    const test: TestDefinition | null = this.testDefinitionSignal();
    if (!test) return 0;
    return Math.round(((this.currentIndexSignal()) / test.questions.length) * 100);
  });

  public readonly isLastQuestionSignal: Signal<boolean> = computed<boolean>(() => {
    const test: TestDefinition | null = this.testDefinitionSignal();
    if (!test) return false;
    return this.currentIndexSignal() === test.questions.length - 1;
  });

  public readonly isFirstQuestionSignal: Signal<boolean> = computed<boolean>(() => {
    return this.currentIndexSignal() === 0;
  });

  public readonly canProceedSignal: Signal<boolean> = computed<boolean>(() => {
    const q: TestQuestion | null = this.currentQuestionSignal();
    if (!q) return false;
    if (q.type === 'multiple-choice-cloze') return this.selectedOptionSignal() !== null;
    if (q.type === 'word-formation') return this.wordFormationInputSignal().trim().length > 0;
    return false;
  });

  public ngOnInit(): void {
    const level: string | null = this.route.snapshot.paramMap.get('level');
    if (!level || !['b1', 'b2-fce', 'c1-cae'].includes(level)) {
      this.router.navigate(['/language-test']);
      return;
    }

    this.bankService.getTest(level as TestLevel).subscribe({
      next: (test: TestDefinition) => {
        this.testDefinitionSignal.set(test);
        this.loadingSignal.set(false);
      },
      error: () => {
        this.errorSignal.set('Nie udało się załadować testu. Spróbuj ponownie.');
        this.loadingSignal.set(false);
      }
    });
  }

  public ngOnDestroy(): void {
    // Subscriptions in this component complete on their own (HTTP single-emission)
  }

  public selectOption(index: number): void {
    this.selectedOptionSignal.set(index);
  }

  public onKeydown(event: KeyboardEvent): void {
    const q: TestQuestion | null = this.currentQuestionSignal();
    if (!q || this.loadingSignal() || this.submittingSignal()) return;

    if (q.type === 'multiple-choice-cloze' && q.options) {
      const keyMap: Record<string, number> = { '1': 0, '2': 1, '3': 2, '4': 3 };
      const optionIndex: number | undefined = keyMap[event.key];
      if (optionIndex !== undefined && optionIndex < q.options.length) {
        event.preventDefault();
        this.selectOption(optionIndex);
        return;
      }
    }

    if (event.key === 'Enter' && this.canProceedSignal()) {
      event.preventDefault();
      this.next();
    }
  }

  public next(): void {
    const q: TestQuestion | null = this.currentQuestionSignal();
    if (!q) return;

    this.saveCurrentAnswer();

    if (this.isLastQuestionSignal()) {
      this.submitTest();
      return;
    }

    this.currentIndexSignal.update((i: number) => i + 1);
    this.restoreAnswerForCurrentIndex();
  }

  public skip(): void {
    if (this.isLastQuestionSignal()) return;

    this.currentIndexSignal.update((i: number) => i + 1);
    this.restoreAnswerForCurrentIndex();
  }

  public previous(): void {
    if (this.isFirstQuestionSignal()) return;

    this.saveCurrentAnswer();
    this.currentIndexSignal.update((i: number) => i - 1);
    this.restoreAnswerForCurrentIndex();
  }

  private saveCurrentAnswer(): void {
    const q: TestQuestion | null = this.currentQuestionSignal();
    if (!q) return;

    const index: number = this.currentIndexSignal();

    if (q.type === 'multiple-choice-cloze' && this.selectedOptionSignal() !== null) {
      const answer: TestAnswer = { questionId: q.id, answer: this.selectedOptionSignal()! };
      this.answersMapSignal.update((map: Map<number, TestAnswer>) => {
        const newMap: Map<number, TestAnswer> = new Map(map);
        newMap.set(index, answer);
        return newMap;
      });
    } else if (q.type === 'word-formation' && this.wordFormationInputSignal().trim().length > 0) {
      const answer: TestAnswer = { questionId: q.id, answer: this.wordFormationInputSignal().trim() };
      this.answersMapSignal.update((map: Map<number, TestAnswer>) => {
        const newMap: Map<number, TestAnswer> = new Map(map);
        newMap.set(index, answer);
        return newMap;
      });
    }
  }

  private restoreAnswerForCurrentIndex(): void {
    const index: number = this.currentIndexSignal();
    const existing: TestAnswer | undefined = this.answersMapSignal().get(index);
    const q: TestQuestion | null = this.currentQuestionSignal();

    if (existing && q) {
      if (q.type === 'multiple-choice-cloze') {
        this.selectedOptionSignal.set(existing.answer as number);
        this.wordFormationInputSignal.set('');
      } else if (q.type === 'word-formation') {
        this.wordFormationInputSignal.set(existing.answer as string);
        this.selectedOptionSignal.set(null);
      }
    } else {
      this.selectedOptionSignal.set(null);
      this.wordFormationInputSignal.set('');
    }
  }

  private submitTest(): void {
    const test: TestDefinition | null = this.testDefinitionSignal();
    if (!test) return;

    this.submittingSignal.set(true);
    const answersArray: TestAnswer[] = Array.from(this.answersMapSignal().values());
    const result = this.testService.evaluateTest(test.questions, answersArray, test.passingScore);

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
        this.router.navigate(['/language-test', test.level, 'results']);
      }
    });
  }
}
