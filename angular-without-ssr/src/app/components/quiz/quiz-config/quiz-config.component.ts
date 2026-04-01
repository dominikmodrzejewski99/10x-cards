import { TranslocoDirective } from '@jsverse/transloco';
import { Component, ChangeDetectionStrategy, input, output, InputSignal, OutputEmitterRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { QuizConfig } from '../../../../types';
import { QuestionConfigState } from '../../../shared/utils/question-config';
import { QuestionCountPickerComponent } from '../../../shared/components/question-count-picker/question-count-picker.component';
import { QuestionTypeSelectorComponent, QuestionTypeOption } from '../../../shared/components/question-type-selector/question-type-selector.component';
import { DirectionPickerComponent } from '../../../shared/components/direction-picker/direction-picker.component';

@Component({
  selector: 'app-quiz-config',
  imports: [FormsModule, TranslocoDirective, QuestionCountPickerComponent, QuestionTypeSelectorComponent, DirectionPickerComponent],
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

  public readonly config = new QuestionConfigState(10);

  public readonly questionTypeOptions: QuestionTypeOption[] = [
    { label: 'written', signal: this.config.writtenEnabledSignal },
    { label: 'multipleChoice', signal: this.config.multipleChoiceEnabledSignal },
    { label: 'trueFalse', signal: this.config.trueFalseEnabledSignal }
  ];

  public readonly countSteps: { label: string; value: number | 'all' }[] = [
    { label: '5', value: 5 },
    { label: '10', value: 10 },
    { label: '15', value: 15 },
    { label: '20', value: 20 },
    { label: 'Wszystkie', value: 'all' }
  ];

  public get availableCountOptions(): { label: string; value: number | 'all' }[] {
    const count: number = this.cardCountSignal();
    return this.countSteps.filter(
      (opt: { label: string; value: number | 'all' }) => opt.value === 'all' || (opt.value as number) < count
    );
  }

  public get isValid(): boolean {
    return this.config.isQuestionTypesValid;
  }

  public onCountChange(value: number): void {
    this.config.onCountChange(value, this.cardCountSignal());
  }

  public toggleAll(): void {
    this.config.toggleAll(this.cardCountSignal(), 10);
  }

  public onStart(): void {
    if (!this.isValid) return;

    const quizConfig: QuizConfig = {
      setId: this.setIdSignal(),
      questionCount: this.config.selectedCountSignal(),
      questionTypes: this.config.collectEnabledTypes(),
      reversed: this.config.reversedSignal()
    };

    this.startQuiz.emit(quizConfig);
  }

  public onGoBack(): void {
    this.goBack.emit();
  }
}
