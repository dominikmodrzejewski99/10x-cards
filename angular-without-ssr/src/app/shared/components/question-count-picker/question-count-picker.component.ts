import { TranslocoDirective } from '@jsverse/transloco';
import { Component, ChangeDetectionStrategy, input, output, InputSignal, OutputEmitterRef } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-question-count-picker',
  imports: [FormsModule, TranslocoDirective],
  template: `
    <ng-container *transloco="let t; prefix: translationPrefix()">
      <label class="cfg-label">{{ t('questionCount') }}</label>
      <div class="cfg-count-row">
        <input
          type="number"
          class="cfg-count-input"
          [ngModel]="selectedCount() === 'all' ? cardCount() : selectedCount()"
          (ngModelChange)="countChange.emit($event)"
          [min]="1"
          [max]="cardCount()"
          [disabled]="selectedCount() === 'all'" />
        <label class="cfg-check-item cfg-all-toggle">
          <input
            type="checkbox"
            class="cfg-check-input"
            [checked]="selectedCount() === 'all'"
            (change)="toggleAll.emit()" />
          <span class="cfg-check-text">{{ t('all') }}</span>
        </label>
      </div>
    </ng-container>
  `,
  styleUrls: ['./question-count-picker.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class QuestionCountPickerComponent {
  public cardCount: InputSignal<number> = input.required<number>();
  public selectedCount: InputSignal<number | 'all'> = input.required<number | 'all'>();
  public translationPrefix: InputSignal<string> = input.required<string>();
  public countChange: OutputEmitterRef<number> = output<number>();
  public toggleAll: OutputEmitterRef<void> = output<void>();
}
