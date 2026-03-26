import { provideZonelessChangeDetection } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import * as Sentry from '@sentry/angular';
import { environment } from './environments/environments';
import { AppComponent } from './app/app.component';
import { appConfig } from './app/app.config';

// Initialize Sentry BEFORE Angular bootstrap
if (environment.sentryDsn) {
  Sentry.init({
    dsn: environment.sentryDsn,
    sendDefaultPii: false,
    tracesSampleRate: 0.1,
    replaysSessionSampleRate: 0,
  });
}

bootstrapApplication(AppComponent, {
  ...appConfig,
  providers: [provideZonelessChangeDetection(), ...appConfig.providers],
}).catch((err) => console.error(err));
