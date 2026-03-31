import { TranslocoDirective } from '@jsverse/transloco';
import { Component, ChangeDetectionStrategy, input, output, InputSignal, OutputEmitterRef, signal, WritableSignal, computed, Signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { QuizQuestion, QuizAnswer } from '../../../../types';

@Component({
  selector: 'app-quiz-question',
  imports: [FormsModule, InputTextModule, TranslocoDirective],
  templateUrl: './quiz-question.component.html',
  styleUrls: ['./quiz-question.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:keydown)': 'onKeydown($event)'
  }
})
export class QuizQuestionComponent {
  public questionSignal: InputSignal<QuizQuestion> = input.required<QuizQuestion>({ alias: 'question' });
  public currentIndexSignal: InputSignal<number> = input.required<number>({ alias: 'currentIndex' });
  public totalQuestionsSignal: InputSignal<number> = input.required<number>({ alias: 'totalQuestions' });

  public answerSubmitted: OutputEmitterRef<QuizAnswer> = output<QuizAnswer>();
  public quitQuiz: OutputEmitterRef<void> = output<void>();

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
      questionText: question.questionText,
      timeMs: 0
    };

    this.answerSubmitted.emit(answer);

    // Reset state for next question
    this.writtenAnswerSignal.set('');
    this.selectedOptionSignal.set(null);
    this.selectedTrueFalseSignal.set(null);
    this.isAnsweredSignal.set(false);
    this.isCorrectSignal.set(null);
  }

  public onQuit(): void {
    if (confirm('Czy na pewno chcesz zakończyć quiz? Postęp nie zostanie zapisany.')) {
      this.quitQuiz.emit();
    }
  }

  public onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      if (this.isAnsweredSignal()) {
        this.onNext();
      } else if (this.questionSignal().type === 'written') {
        this.onCheckWritten();
      }
      return;
    }

    // Number keys for multiple-choice
    if (!this.isAnsweredSignal() && this.questionSignal().type === 'multiple-choice') {
      const options: string[] | undefined = this.questionSignal().options;
      if (options) {
        const keyIndex: number = parseInt(event.key, 10) - 1;
        if (keyIndex >= 0 && keyIndex < options.length) {
          this.onSelectOption(options[keyIndex]);
        }
      }
    }

    // T/F keys for true-false
    if (!this.isAnsweredSignal() && this.questionSignal().type === 'true-false') {
      if (event.key === 't' || event.key === 'T' || event.key === 'p' || event.key === 'P') {
        this.onSelectTrueFalse(true);
      } else if (event.key === 'f' || event.key === 'F' || event.key === 'n' || event.key === 'N') {
        this.onSelectTrueFalse(false);
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
