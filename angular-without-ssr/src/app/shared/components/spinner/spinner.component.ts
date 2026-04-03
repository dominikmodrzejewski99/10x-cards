import { Component, ChangeDetectionStrategy, input } from '@angular/core';

@Component({
  selector: 'app-spinner',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div class="spinner" [style.width]="size()" [style.height]="size()"></div>`,
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
