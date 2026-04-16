import { Component, ChangeDetectionStrategy, input } from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';

@Component({
  selector: 'app-spinner',
  imports: [TranslocoDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<ng-container *transloco="let t; prefix: 'shared.spinner'"><div class="spinner" role="status" [attr.aria-label]="t('loading')" [style.width]="size()" [style.height]="size()"></div></ng-container>`,
  styles: [`
    :host { display: inline-flex; }
    .spinner {
      border: 3px solid var(--app-border, #E2E8F0);
      border-top-color: var(--app-primary, #3b4cca);
      border-radius: 50%;
      animation: spin 0.7s linear infinite;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `]
})
export class SpinnerComponent {
  size = input<string>('40px');
}
