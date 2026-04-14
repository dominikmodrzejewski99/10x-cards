import { Injectable } from '@angular/core';
import * as Sentry from '@sentry/angular';

@Injectable({ providedIn: 'root' })
export class SentryService {
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
   * Disables Sentry for the rest of the session. Called when user
   * rejects analytics cookies after initially accepting them.
   */
  public disable(): void {
    const client = Sentry.getClient();
    if (client) {
      client.getOptions().enabled = false;
    }
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
