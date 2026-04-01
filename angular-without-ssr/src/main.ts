import { provideZonelessChangeDetection } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import * as Sentry from '@sentry/angular';
import { environment } from './environments/environments';
import { AppComponent } from './app/app.component';
import { appConfig } from './app/app.config';

// Initialize Sentry only if user has accepted analytics cookies
const consentMatch = document.cookie.match(/(?:^|;\s*)cookie_consent=([^;]*)/);
const consentValue = consentMatch?.[1] ? decodeURIComponent(consentMatch[1]) : '';
const analyticsOk = consentValue === 'accepted' || (consentValue.includes('"analytics"') && consentValue.includes('true'));
if (environment.sentryDsn && analyticsOk) {
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
