import { Component, ChangeDetectionStrategy, inject, signal, computed, OnInit } from '@angular/core';
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
        this.router.navigate(['/language-test', test.level, 'results']);
      }
    });
  }
}
