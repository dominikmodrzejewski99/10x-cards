import { Component, ChangeDetectionStrategy, input, output, InputSignal, OutputEmitterRef, signal, WritableSignal, computed, Signal } from '@angular/core';
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

  public wrongExpandedSignal: WritableSignal<boolean> = signal<boolean>(false);
  public allAnswersExpandedSignal: WritableSignal<boolean> = signal<boolean>(false);

  public readonly wrongAnswersSignal: Signal<QuizAnswer[]> = computed<QuizAnswer[]>(() =>
    this.resultSignal().answers.filter((a: QuizAnswer) => !a.isCorrect)
  );

  public readonly correctAnswersSignal: Signal<QuizAnswer[]> = computed<QuizAnswer[]>(() =>
    this.resultSignal().answers.filter((a: QuizAnswer) => a.isCorrect)
  );

  public readonly hasWrongAnswersSignal: Signal<boolean> = computed<boolean>(() =>
    this.wrongAnswersSignal().length > 0
  );

  public readonly correctCountSignal: Signal<number> = computed<number>(() =>
    this.resultSignal().correctCount
  );

  public readonly incorrectCountSignal: Signal<number> = computed<number>(() =>
    this.resultSignal().totalQuestions - this.resultSignal().correctCount
  );

  public readonly scoreColorSignal: Signal<string> = computed<string>(() => {
    const pct: number = this.resultSignal().percentage;
    if (pct >= 90) return '#23b26d';
    if (pct >= 70) return '#4255ff';
    if (pct >= 50) return '#f5a623';
    return '#ff6240';
  });

  public readonly ringDashSignal: Signal<string> = computed<string>(() => {
    const pct: number = this.resultSignal().percentage;
    const circumference: number = 2 * Math.PI * 54;
    const filled: number = (pct / 100) * circumference;
    return `${filled} ${circumference}`;
  });

  public readonly totalTimeTextSignal: Signal<string> = computed<string>(() => {
    const ms: number = this.resultSignal().totalTimeMs;
    const totalSeconds: number = Math.floor(ms / 1000);
    const minutes: number = Math.floor(totalSeconds / 60);
    const seconds: number = totalSeconds % 60;
    if (minutes === 0) return `${seconds} sek.`;
    return `${minutes} min. ${seconds} sek.`;
  });

  public readonly slowestAnswersSignal: Signal<QuizAnswer[]> = computed<QuizAnswer[]>(() => {
    const answers: QuizAnswer[] = [...this.resultSignal().answers];
    return answers
      .sort((a: QuizAnswer, b: QuizAnswer) => b.timeMs - a.timeMs)
      .slice(0, 3);
  });

  public readonly sortedAnswersSignal: Signal<QuizAnswer[]> = computed<QuizAnswer[]>(() =>
    this.resultSignal().answers
  );

  public toggleWrongExpanded(): void {
    this.wrongExpandedSignal.update((v: boolean) => !v);
  }

  public toggleAllAnswersExpanded(): void {
    this.allAnswersExpandedSignal.update((v: boolean) => !v);
  }

  public formatTimeMs(ms: number): string {
    const seconds: number = Math.round(ms / 100) / 10;
    return `${seconds} sek.`;
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
