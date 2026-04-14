import { ErrorHandler, Injectable, NgZone, inject } from '@angular/core';
import { ToastService } from '../../shared/services/toast.service';
import { SentryService } from './sentry.service';

@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  private toastService: ToastService = inject(ToastService);
  private ngZone: NgZone = inject(NgZone);
  private sentryService: SentryService = inject(SentryService);

  public handleError(error: unknown): void {
    const message: string = this.extractMessage(error);

    // Don't show toast for known non-critical errors
    if (this.isIgnorable(message)) {
      console.warn('[GlobalErrorHandler] Ignored:', message);
      return;
    }

    console.error('[GlobalErrorHandler]', error);

    // Capture error in Sentry (no-op if DSN is empty)
    this.sentryService.captureException(error);

    // Show toast in Angular zone to trigger change detection
    this.ngZone.run(() => {
      this.toastService.add({
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
      const err: Record<string, unknown> = error as Record<string, unknown>;
      if (typeof err['message'] === 'string') return err['message'];
      if (typeof err['rejection'] === 'object' && err['rejection'] !== null) {
        const rejection: Record<string, unknown> = err['rejection'] as Record<string, unknown>;
        if (typeof rejection['message'] === 'string') return rejection['message'];
      }
    }

    return 'Wystąpił nieoczekiwany błąd. Spróbuj odświeżyć stronę.';
  }

  private isIgnorable(message: string): boolean {
    const ignoredPatterns: string[] = [
      'ResizeObserver loop',
      'Loading chunk',
      'ChunkLoadError',
      'Network Error',
      'AbortError',
      'cancelled',
    ];
    return ignoredPatterns.some((p: string) => message.includes(p));
  }
}
