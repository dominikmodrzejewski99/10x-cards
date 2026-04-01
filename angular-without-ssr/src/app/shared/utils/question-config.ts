import { signal, WritableSignal } from '@angular/core';
import { QuizQuestionType } from '../../../types';

/**
 * Shared state and logic for question config forms (quiz-config, print-test-config).
 * Use via composition: instantiate in the component and delegate to its methods.
 */
export class QuestionConfigState {
  public readonly selectedCountSignal: WritableSignal<number | 'all'>;
  public readonly writtenEnabledSignal: WritableSignal<boolean> = signal<boolean>(true);
  public readonly multipleChoiceEnabledSignal: WritableSignal<boolean> = signal<boolean>(true);
  public readonly trueFalseEnabledSignal: WritableSignal<boolean> = signal<boolean>(true);
  public readonly reversedSignal: WritableSignal<boolean> = signal<boolean>(false);

  constructor(defaultCount: number | 'all' = 10) {
    this.selectedCountSignal = signal<number | 'all'>(defaultCount);
  }

  public get isQuestionTypesValid(): boolean {
    return this.writtenEnabledSignal() || this.multipleChoiceEnabledSignal() || this.trueFalseEnabledSignal();
  }

  public collectEnabledTypes(): QuizQuestionType[] {
    const types: QuizQuestionType[] = [];
    if (this.writtenEnabledSignal()) types.push('written');
    if (this.multipleChoiceEnabledSignal()) types.push('multiple-choice');
    if (this.trueFalseEnabledSignal()) types.push('true-false');
    return types;
  }

  public onCountChange(value: number, maxCount: number): void {
    const clamped: number = Math.max(1, Math.min(value, maxCount));
    this.selectedCountSignal.set(clamped);
  }

  public toggleAll(maxCount: number, fallbackCount: number = 10): void {
    if (this.selectedCountSignal() === 'all') {
      this.selectedCountSignal.set(Math.min(fallbackCount, maxCount));
    } else {
      this.selectedCountSignal.set('all');
    }
  }
}
