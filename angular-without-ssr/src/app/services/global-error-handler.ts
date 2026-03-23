import { ErrorHandler, Injectable, NgZone, inject } from '@angular/core';
import { MessageService } from 'primeng/api';

@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  private messageService = inject(MessageService);
  private ngZone = inject(NgZone);

  handleError(error: unknown): void {
    const message = this.extractMessage(error);

    // Don't show toast for known non-critical errors
    if (this.isIgnorable(message)) {
      console.warn('[GlobalErrorHandler] Ignored:', message);
      return;
    }

    console.error('[GlobalErrorHandler]', error);

    // Show toast in Angular zone to trigger change detection
    this.ngZone.run(() => {
      this.messageService.add({
        severity: 'error',
        summary: 'Wystąpił błąd',
        detail: message,
        life: 6000,
      });
    });
  }

  private extractMessage(error: unknown): string {
    if (error instanceof Error) {
      // Unwrap Angular wrapper errors
      if (error.message?.includes('NG0')) {
        return 'Wystąpił nieoczekiwany błąd aplikacji. Odśwież stronę.';
      }
      return error.message || 'Nieznany błąd';
    }

    if (typeof error === 'string') {
      return error;
    }

    if (typeof error === 'object' && error !== null) {
      const err = error as Record<string, unknown>;
      if (typeof err['message'] === 'string') return err['message'];
      if (typeof err['rejection'] === 'object' && err['rejection'] !== null) {
        const rejection = err['rejection'] as Record<string, unknown>;
        if (typeof rejection['message'] === 'string') return rejection['message'];
      }
    }

    return 'Wystąpił nieoczekiwany błąd. Spróbuj odświeżyć stronę.';
  }

  private isIgnorable(message: string): boolean {
    const ignoredPatterns = [
      'ResizeObserver loop',
      'Loading chunk',
      'ChunkLoadError',
      'Network Error',
      'AbortError',
      'cancelled',
    ];
    return ignoredPatterns.some(p => message.includes(p));
  }
}
