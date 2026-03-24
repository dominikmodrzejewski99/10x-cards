import { Injectable } from '@angular/core';
import * as Sentry from '@sentry/angular';
import { environment } from '../../environments/environments.default';

@Injectable({ providedIn: 'root' })
export class SentryService {
  /**
   * Initializes Sentry error tracking.
   * Should be called once before Angular bootstrap.
   * No-op when sentryDsn is empty (local dev).
   */
  public static init(): void {
    const dsn: string = environment.sentryDsn;

    if (!dsn) {
      return;
    }

    Sentry.init({
      dsn,
      environment: environment.production ? 'production' : 'development',
      sendDefaultPii: true,
      tracesSampleRate: 0.1,
      replaysSessionSampleRate: 0,
    });
  }

  /**
   * Captures an exception in Sentry if it has been initialized.
   */
  public captureException(error: unknown): void {
    if (!Sentry.isInitialized()) {
      return;
    }

    Sentry.captureException(error);
  }

  /**
   * Adds a breadcrumb to the Sentry trail for debugging context.
   */
  public addBreadcrumb(category: string, message: string, level: Sentry.SeverityLevel): void {
    if (!Sentry.isInitialized()) {
      return;
    }

    Sentry.addBreadcrumb({
      category,
      message,
      level,
    });
  }
}
