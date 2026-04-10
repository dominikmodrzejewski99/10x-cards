import { Injectable, inject, signal, computed, WritableSignal, Signal } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import { LanguageTestBankService } from './language-test-bank.service';
import { LanguageTestService, TestAnswer } from './language-test.service';
import { LanguageTestResultsService } from './language-test-results.service';
import { TestDefinition, TestLevel, TestQuestion } from '../../types';

@Injectable({ providedIn: 'root' })
export class LanguageTestFacadeService {
  private readonly bankService: LanguageTestBankService = inject(LanguageTestBankService);
  private readonly testService: LanguageTestService = inject(LanguageTestService);
  private readonly resultsService: LanguageTestResultsService = inject(LanguageTestResultsService);
  private readonly t: TranslocoService = inject(TranslocoService);

  private readonly _testDefinition: WritableSignal<TestDefinition | null> = signal<TestDefinition | null>(null);
  private readonly _currentIndex: WritableSignal<number> = signal<number>(0);
  private readonly _answersMap: WritableSignal<Map<number, TestAnswer>> = signal<Map<number, TestAnswer>>(new Map());
  private readonly _selectedOption: WritableSignal<number | null> = signal<number | null>(null);
  private readonly _wordFormationInput: WritableSignal<string> = signal<string>('');
  private readonly _loading: WritableSignal<boolean> = signal<boolean>(true);
  private readonly _submitting: WritableSignal<boolean> = signal<boolean>(false);
  private readonly _error: WritableSignal<string | null> = signal<string | null>(null);
  private readonly _completedResult: WritableSignal<{ level: string; route: string[]; state?: unknown } | null> =
    signal<{ level: string; route: string[]; state?: unknown } | null>(null);

  public readonly testDefinitionSignal: Signal<TestDefinition | null> = this._testDefinition.asReadonly();
  public readonly currentIndexSignal: Signal<number> = this._currentIndex.asReadonly();
  public readonly answersMapSignal: Signal<Map<number, TestAnswer>> = this._answersMap.asReadonly();
  public readonly selectedOptionSignal: Signal<number | null> = this._selectedOption.asReadonly();
  public readonly wordFormationInputSignal: Signal<string> = this._wordFormationInput.asReadonly();
  public readonly loadingSignal: Signal<boolean> = this._loading.asReadonly();
  public readonly submittingSignal: Signal<boolean> = this._submitting.asReadonly();
  public readonly errorSignal: Signal<string | null> = this._error.asReadonly();
  public readonly completedResultSignal: Signal<{ level: string; route: string[]; state?: unknown } | null> =
    this._completedResult.asReadonly();

  public readonly currentQuestionSignal: Signal<TestQuestion | null> = computed<TestQuestion | null>(() => {
    const test: TestDefinition | null = this._testDefinition();
    if (!test) return null;
    return test.questions[this._currentIndex()] ?? null;
  });

  public readonly progressSignal: Signal<number> = computed<number>(() => {
    const test: TestDefinition | null = this._testDefinition();
    if (!test) return 0;
    return Math.round((this._currentIndex() / test.questions.length) * 100);
  });

  public readonly isLastQuestionSignal: Signal<boolean> = computed<boolean>(() => {
    const test: TestDefinition | null = this._testDefinition();
    if (!test) return false;
    return this._currentIndex() === test.questions.length - 1;
  });

  public readonly isFirstQuestionSignal: Signal<boolean> = computed<boolean>(() => {
    return this._currentIndex() === 0;
  });

  public readonly canProceedSignal: Signal<boolean> = computed<boolean>(() => {
    const q: TestQuestion | null = this.currentQuestionSignal();
    if (!q) return false;
    if (q.type === 'multiple-choice-cloze') return this._selectedOption() !== null;
    if (q.type === 'word-formation') return this._wordFormationInput().trim().length > 0;
    return false;
  });

  public loadTest(level: TestLevel): void {
    this._loading.set(true);
    this._error.set(null);

    this.bankService.getTest(level).subscribe({
      next: (test: TestDefinition) => {
        this._testDefinition.set(test);
        this._loading.set(false);
      },
      error: () => {
        this._error.set(this.t.translate('languageTest.errors.loadTestFailed'));
        this._loading.set(false);
      }
    });
  }

  public selectOption(index: number): void {
    this._selectedOption.set(index);
  }

  public setWordFormationInput(value: string): void {
    this._wordFormationInput.set(value);
  }

  public next(): void {
    const q: TestQuestion | null = this.currentQuestionSignal();
    if (!q) return;

    this.saveCurrentAnswer();

    if (this.isLastQuestionSignal()) {
      this.submitTest();
      return;
    }

    this._currentIndex.update((i: number) => i + 1);
    this.restoreAnswerForCurrentIndex();
  }

  public skip(): void {
    if (this.isLastQuestionSignal()) return;

    this._currentIndex.update((i: number) => i + 1);
    this.restoreAnswerForCurrentIndex();
  }

  public previous(): void {
    if (this.isFirstQuestionSignal()) return;

    this.saveCurrentAnswer();
    this._currentIndex.update((i: number) => i - 1);
    this.restoreAnswerForCurrentIndex();
  }

  public splitByGap(text: string): { before: string; after: string } {
    const parts: string[] = text.split('___');
    return { before: parts[0] || '', after: parts[1] || '' };
  }

  public handleKeydown(key: string): boolean {
    const q: TestQuestion | null = this.currentQuestionSignal();
    if (!q || this._loading() || this._submitting()) return false;

    if (q.type === 'multiple-choice-cloze' && q.options) {
      const keyMap: Record<string, number> = { '1': 0, '2': 1, '3': 2, '4': 3 };
      const optionIndex: number | undefined = keyMap[key];
      if (optionIndex !== undefined && optionIndex < q.options.length) {
        this.selectOption(optionIndex);
        return true;
      }
    }

    if (key === 'Enter' && this.canProceedSignal()) {
      this.next();
      return true;
    }

    return false;
  }

  public reset(): void {
    this._testDefinition.set(null);
    this._currentIndex.set(0);
    this._answersMap.set(new Map());
    this._selectedOption.set(null);
    this._wordFormationInput.set('');
    this._loading.set(true);
    this._submitting.set(false);
    this._error.set(null);
    this._completedResult.set(null);
  }

  private saveCurrentAnswer(): void {
    const q: TestQuestion | null = this.currentQuestionSignal();
    if (!q) return;

    const index: number = this._currentIndex();

    if (q.type === 'multiple-choice-cloze' && this._selectedOption() !== null) {
      const answer: TestAnswer = { questionId: q.id, answer: this._selectedOption()! };
      this._answersMap.update((map: Map<number, TestAnswer>) => {
        const newMap: Map<number, TestAnswer> = new Map(map);
        newMap.set(index, answer);
        return newMap;
      });
    } else if (q.type === 'word-formation' && this._wordFormationInput().trim().length > 0) {
      const answer: TestAnswer = { questionId: q.id, answer: this._wordFormationInput().trim() };
      this._answersMap.update((map: Map<number, TestAnswer>) => {
        const newMap: Map<number, TestAnswer> = new Map(map);
        newMap.set(index, answer);
        return newMap;
      });
    }
  }

  private restoreAnswerForCurrentIndex(): void {
    const index: number = this._currentIndex();
    const existing: TestAnswer | undefined = this._answersMap().get(index);
    const q: TestQuestion | null = this.currentQuestionSignal();

    if (existing && q) {
      if (q.type === 'multiple-choice-cloze') {
        this._selectedOption.set(existing.answer as number);
        this._wordFormationInput.set('');
      } else if (q.type === 'word-formation') {
        this._wordFormationInput.set(existing.answer as string);
        this._selectedOption.set(null);
      }
    } else {
      this._selectedOption.set(null);
      this._wordFormationInput.set('');
    }
  }

  private submitTest(): void {
    const test: TestDefinition | null = this._testDefinition();
    if (!test) return;

    this._submitting.set(true);
    const answersArray: TestAnswer[] = Array.from(this._answersMap().values());
    const result = this.testService.evaluateTest(test.questions, answersArray, test.passingScore);

    this.resultsService.saveResult({
      level: test.level,
      totalScore: result.totalScore,
      maxScore: result.maxScore,
      percentage: result.percentage,
      categoryBreakdown: result.categoryBreakdown,
      wrongAnswers: result.wrongAnswers
    }).subscribe({
      next: (savedResult) => {
        this._completedResult.set({
          level: test.level,
          route: ['/language-test', test.level, 'results'],
          state: { result: savedResult }
        });
      },
      error: () => {
        this._completedResult.set({
          level: test.level,
          route: ['/language-test', test.level, 'results']
        });
      }
    });
  }
}
