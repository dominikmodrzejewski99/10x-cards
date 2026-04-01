import { TranslocoDirective } from '@jsverse/transloco';
import { Component, ChangeDetectionStrategy, input, InputSignal } from '@angular/core';
import { WritableSignal } from '@angular/core';

@Component({
  selector: 'app-direction-picker',
  imports: [TranslocoDirective],
  template: `
    <ng-container *transloco="let t; prefix: translationPrefix()">
      <label class="cfg-label">{{ t('direction') }}</label>
      <div class="cfg-check-group">
        <label class="cfg-check-item">
          <input
            type="radio"
            [name]="'direction-' + instanceId()"
            class="cfg-check-input"
            [checked]="!reversed()()"
            (change)="reversed().set(false)" />
          <span class="cfg-check-text">{{ t('frontToBack') }}</span>
        </label>
        <label class="cfg-check-item">
          <input
            type="radio"
            [name]="'direction-' + instanceId()"
            class="cfg-check-input"
            [checked]="reversed()()"
            (change)="reversed().set(true)" />
          <span class="cfg-check-text">{{ t('backToFront') }}</span>
        </label>
      </div>
    </ng-container>
  `,
  styleUrls: ['./direction-picker.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DirectionPickerComponent {
  public reversed: InputSignal<WritableSignal<boolean>> = input.required<WritableSignal<boolean>>();
  public translationPrefix: InputSignal<string> = input.required<string>();
  public instanceId: InputSignal<string> = input<string>('default');
}
