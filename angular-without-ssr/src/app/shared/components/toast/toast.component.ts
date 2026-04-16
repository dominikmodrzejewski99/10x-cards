import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';
import { ToastService, ToastMessage } from '../../services/toast.service';

@Component({
  selector: 'app-toast',
  imports: [TranslocoDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-container *transloco="let t; prefix: 'shared.toast'">
    @if (toastService.messages().length > 0) {
      <div class="toast-container" role="status" aria-live="polite">
        @for (msg of toastService.messages(); track msg.id) {
          <div class="toast toast--{{ msg.severity }}">
            <div class="toast__icon">
              @switch (msg.severity) {
                @case ('success') { <i class="pi pi-check-circle" aria-hidden="true"></i> }
                @case ('error') { <i class="pi pi-times-circle" aria-hidden="true"></i> }
                @case ('warn') { <i class="pi pi-exclamation-triangle" aria-hidden="true"></i> }
              }
            </div>
            <div class="toast__content">
              @if (msg.summary) {
                <div class="toast__summary">{{ msg.summary }}</div>
              }
              <div class="toast__detail">{{ msg.detail }}</div>
            </div>
            <button type="button" class="toast__close" (click)="toastService.remove(msg.id)" [attr.aria-label]="t('close')">
              <i class="pi pi-times" aria-hidden="true"></i>
            </button>
          </div>
        }
      </div>
    }
    </ng-container>
  `,
  styleUrl: './toast.component.scss'
})
export class ToastComponent {
  readonly toastService = inject(ToastService);
}
