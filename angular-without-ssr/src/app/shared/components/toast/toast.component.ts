import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { ToastService, ToastMessage } from '../../services/toast.service';

@Component({
  selector: 'app-toast',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (toastService.messages().length > 0) {
      <div class="toast-container" role="status" aria-live="polite">
        @for (msg of toastService.messages(); track msg.id) {
          <div class="toast toast--{{ msg.severity }}">
            <div class="toast__icon">
              @switch (msg.severity) {
                @case ('success') { <i class="pi pi-check-circle"></i> }
                @case ('error') { <i class="pi pi-times-circle"></i> }
                @case ('warn') { <i class="pi pi-exclamation-triangle"></i> }
              }
            </div>
            <div class="toast__content">
              @if (msg.summary) {
                <div class="toast__summary">{{ msg.summary }}</div>
              }
              <div class="toast__detail">{{ msg.detail }}</div>
            </div>
            <button class="toast__close" (click)="toastService.remove(msg.id)" aria-label="Zamknij">
              <i class="pi pi-times"></i>
            </button>
          </div>
        }
      </div>
    }
  `,
  styleUrl: './toast.component.scss'
})
export class ToastComponent {
  readonly toastService = inject(ToastService);
}
