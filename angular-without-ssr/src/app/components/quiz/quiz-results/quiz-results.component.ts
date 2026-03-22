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

  public get wrongAnswers(): QuizAnswer[] {
    return this.resultSignal().answers.filter((a: QuizAnswer) => !a.isCorrect);
  }

  public get hasWrongAnswers(): boolean {
    return this.wrongAnswers.length > 0;
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
