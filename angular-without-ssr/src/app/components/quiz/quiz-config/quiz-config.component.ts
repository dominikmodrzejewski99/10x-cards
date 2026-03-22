import { Component, ChangeDetectionStrategy, input, output, InputSignal, OutputEmitterRef, signal, WritableSignal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { QuizConfig, QuizQuestionType } from '../../../../types';

interface QuestionCountOption {
  label: string;
  value: number | 'all';
}

@Component({
  selector: 'app-quiz-config',
  imports: [FormsModule, ButtonModule, SelectModule],
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

  public get availableCountOptions(): QuestionCountOption[] {
    const count: number = this.cardCountSignal();
    return this.COUNT_OPTIONS.filter((opt: QuestionCountOption) =>
      opt.value === 'all' || opt.value <= count
    );
  }

  public get isValid(): boolean {
    return this.writtenEnabledSignal() || this.multipleChoiceEnabledSignal() || this.trueFalseEnabledSignal();
  }

  public onStart(): void {
    if (!this.isValid) return;

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
