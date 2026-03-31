import { ApplicationConfig, ErrorHandler, APP_INITIALIZER, isDevMode } from '@angular/core';
import { Router } from '@angular/router';
import * as Sentry from '@sentry/angular';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideServiceWorker } from '@angular/service-worker';
import { providePrimeNG } from 'primeng/config';
import { provideRouter, withEnabledBlockingInitialNavigation } from '@angular/router';
import { provideHttpClient, withInterceptors, withFetch } from '@angular/common/http';
import { provideTransloco } from '@jsverse/transloco';
import { MessageService } from 'primeng/api';
import { routes } from './app.routes';
import { definePreset } from '@primeuix/themes';
import Aura from '@primeuix/themes/aura';
import { authInterceptor } from './services/auth.interceptor';
import { GlobalErrorHandler } from './services/global-error-handler';
import { TranslocoHttpLoader } from './transloco-loader';

// Definiujemy własny preset bazujący na Aura z jasnymi kolorami dla dialogów i toastów
const LightThemePreset = definePreset(Aura, {
    components: {
        dialog: {
            colorScheme: {
                light: {
                    root: {
                        background: 'var(--app-white)',
                        color: 'var(--app-text)'
                    }
                },
                dark: {
                    root: {
                        background: 'var(--app-white)',
                        color: 'var(--app-text)'
                    }
                }
            }
        },
        toast: {
            colorScheme: {
                light: {
                    success: {
                        background: 'var(--app-success-light)',
                        color: 'var(--app-success)',
                        detailColor: 'var(--app-success)'
                    },
                    info: {
                        background: 'var(--app-primary-light)',
                        color: 'var(--app-primary)',
                        detailColor: 'var(--app-primary)'
                    },
                    warn: {
                        background: 'var(--app-warning-light)',
                        color: 'var(--app-yellow)',
                        detailColor: 'var(--app-yellow)'
                    },
                    error: {
                        background: 'var(--app-danger-light)',
                        color: 'var(--app-error)',
                        detailColor: 'var(--app-error)'
                    }
                },
                dark: {
                    success: {
                        background: 'var(--app-success-light)',
                        color: 'var(--app-success)',
                        detailColor: 'var(--app-success)'
                    },
                    info: {
                        background: 'var(--app-primary-light)',
                        color: 'var(--app-primary)',
                        detailColor: 'var(--app-primary)'
                    },
                    warn: {
                        background: 'var(--app-warning-light)',
                        color: 'var(--app-yellow)',
                        detailColor: 'var(--app-yellow)'
                    },
                    error: {
                        background: 'var(--app-danger-light)',
                        color: 'var(--app-error)',
                        detailColor: 'var(--app-error)'
                    }
                }
            }
        }
    }
});

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
        MessageService,
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
                availableLangs: ['pl', 'en'],
                defaultLang: typeof navigator !== 'undefined' && navigator.language?.startsWith('en') ? 'en' : 'pl',
                reRenderOnLangChange: true,
                prodMode: !isDevMode(),
                fallbackLang: 'pl',
            },
            loader: TranslocoHttpLoader,
        }),
        providePrimeNG({
            theme: {
                preset: LightThemePreset,
                options: {
                    darkModeSelector: 'none'
                }
            },
            ripple: true,
            inputStyle: 'filled',
            // Dodatkowe opcje dla lepszej kompatybilności bez SSR
            zIndex: {
                modal: 1100,        // dialog, sidebar
                overlay: 1000,      // dropdown, overlaypanel
                menu: 1000,         // overlay menus
                tooltip: 1100       // tooltip
            },
        })
    ]
};
