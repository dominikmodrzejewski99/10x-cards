import { ApplicationConfig, ErrorHandler, APP_INITIALIZER, isDevMode } from '@angular/core';
import { Router } from '@angular/router';
import * as Sentry from '@sentry/angular';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideServiceWorker } from '@angular/service-worker';
import { provideRouter, withEnabledBlockingInitialNavigation } from '@angular/router';
import { provideHttpClient, withInterceptors, withFetch } from '@angular/common/http';
import { provideTransloco } from '@jsverse/transloco';
import { routes } from './app.routes';
import { authInterceptor } from './services/auth.interceptor';
import { GlobalErrorHandler } from './services/global-error-handler';
import { TranslocoHttpLoader } from './transloco-loader';

export const appConfig: ApplicationConfig = {
    providers: [
        {
            provide: ErrorHandler,
            useValue: Sentry.createErrorHandler({
                showDialog: false,
            }),
        },
        {
            provide: Sentry.TraceService,
            deps: [Router],
        },
        {
            provide: APP_INITIALIZER,
            useFactory: () => () => {},
            deps: [Sentry.TraceService],
            multi: true,
        },
        provideAnimationsAsync(),
        provideRouter(routes, withEnabledBlockingInitialNavigation()),
        provideHttpClient(
            withInterceptors([authInterceptor]),
            withFetch()
        ),
        provideServiceWorker('ngsw-worker.js', {
            enabled: !isDevMode(),
            registrationStrategy: 'registerWhenStable:30000'
        }),
        provideTransloco({
            config: {
                availableLangs: ['pl', 'en', 'de', 'es', 'fr', 'uk'],
                defaultLang: typeof navigator !== 'undefined' && navigator.language?.startsWith('en') ? 'en' : 'pl',
                reRenderOnLangChange: true,
                prodMode: !isDevMode(),
                fallbackLang: 'pl',
            },
            loader: TranslocoHttpLoader,
        }),
    ]
};
