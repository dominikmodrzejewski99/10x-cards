import { TranslocoDirective } from '@jsverse/transloco';
import { Component, ChangeDetectionStrategy, input, output, InputSignal, OutputEmitterRef, signal, WritableSignal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { QuizConfig, QuizQuestionType } from '../../../../types';

@Component({
  selector: 'app-quiz-config',
  imports: [FormsModule, TranslocoDirective],
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
    return this.writtenEnabledSignal() || this.multipleChoiceEnabledSignal() || this.trueFalseEnabledSignal();
  }

  public onCountChange(value: number): void {
    const clamped: number = Math.max(1, Math.min(value, this.cardCountSignal()));
    this.selectedCountSignal.set(clamped);
  }

  public toggleAll(): void {
    if (this.selectedCountSignal() === 'all') {
      this.selectedCountSignal.set(this.cardCountSignal());
    } else {
      this.selectedCountSignal.set('all');
    }
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
