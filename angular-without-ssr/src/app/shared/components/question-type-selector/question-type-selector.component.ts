import { TranslocoDirective } from '@jsverse/transloco';
import { Component, ChangeDetectionStrategy, input, InputSignal } from '@angular/core';
import { WritableSignal } from '@angular/core';

export interface QuestionTypeOption {
  label: string;
  signal: WritableSignal<boolean>;
}

@Component({
  selector: 'app-question-type-selector',
  imports: [TranslocoDirective],
  template: `
    <ng-container *transloco="let t; prefix: translationPrefix()">
      <label class="cfg-label">{{ t('questionTypes') }}</label>
      <div class="cfg-check-group">
        @for (option of options(); track option.label) {
          <label class="cfg-check-item">
            <input
              type="checkbox"
              class="cfg-check-input"
              [checked]="option.signal()"
              (change)="option.signal.set(!option.signal())" />
            <span class="cfg-check-text">{{ t(option.label) }}</span>
          </label>
        }
      </div>
      @if (showError()) {
        <small class="cfg-error" role="alert">{{ t('validationError') }}</small>
      }
    </ng-container>
  `,
  styleUrls: ['./question-type-selector.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class QuestionTypeSelectorComponent {
  public options: InputSignal<QuestionTypeOption[]> = input.required<QuestionTypeOption[]>();
  public showError: InputSignal<boolean> = input<boolean>(false);
  public translationPrefix: InputSignal<string> = input.required<string>();
}
