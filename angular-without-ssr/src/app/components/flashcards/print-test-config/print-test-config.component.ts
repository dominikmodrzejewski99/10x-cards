import { TranslocoDirective } from '@jsverse/transloco';
import { Component, ChangeDetectionStrategy, input, output, InputSignal, OutputEmitterRef, signal, WritableSignal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PrintTestConfig } from '../../../services/domain/print-test.service';
import { QuestionConfigState } from '../../../shared/utils/question-config';
import { QuestionCountPickerComponent } from '../../../shared/components/question-count-picker/question-count-picker.component';
import { QuestionTypeSelectorComponent, QuestionTypeOption } from '../../../shared/components/question-type-selector/question-type-selector.component';
import { DirectionPickerComponent } from '../../../shared/components/direction-picker/direction-picker.component';

@Component({
  selector: 'app-print-test-config',
  imports: [FormsModule, TranslocoDirective, QuestionCountPickerComponent, QuestionTypeSelectorComponent, DirectionPickerComponent],
  templateUrl: './print-test-config.component.html',
  styleUrls: ['./print-test-config.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PrintTestConfigComponent {
  public setNameSignal: InputSignal<string> = input.required<string>({ alias: 'setName' });
  public cardCountSignal: InputSignal<number> = input.required<number>({ alias: 'cardCount' });

  public print: OutputEmitterRef<PrintTestConfig> = output<PrintTestConfig>();
  public close: OutputEmitterRef<void> = output<void>();

  public readonly config = new QuestionConfigState(20);
  public titleSignal: WritableSignal<string> = signal<string>('');
  public matchingEnabledSignal: WritableSignal<boolean> = signal<boolean>(true);
  public includeAnswerKeySignal: WritableSignal<boolean> = signal<boolean>(true);

  public readonly questionTypeOptions: QuestionTypeOption[] = [
    { label: 'written', signal: this.config.writtenEnabledSignal },
    { label: 'multipleChoice', signal: this.config.multipleChoiceEnabledSignal },
    { label: 'trueFalse', signal: this.config.trueFalseEnabledSignal },
    { label: 'matching', signal: this.matchingEnabledSignal }
  ];

  public get isValid(): boolean {
    return this.config.isQuestionTypesValid || this.matchingEnabledSignal();
  }

  public onCountChange(value: number): void {
    this.config.onCountChange(value, this.cardCountSignal());
  }

  public toggleAll(): void {
    this.config.toggleAll(this.cardCountSignal(), 20);
  }

  public onPrint(): void {
    if (!this.isValid) return;

    const printConfig: PrintTestConfig = {
      title: this.titleSignal() || this.setNameSignal(),
      questionCount: this.config.selectedCountSignal(),
      questionTypes: this.config.collectEnabledTypes(),
      includeMatching: this.matchingEnabledSignal(),
      reversed: this.config.reversedSignal(),
      includeAnswerKey: this.includeAnswerKeySignal()
    };

    this.print.emit(printConfig);
  }

  public onClose(): void {
    this.close.emit();
  }
}
