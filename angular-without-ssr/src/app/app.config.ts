import { ApplicationConfig, ErrorHandler, APP_INITIALIZER, isDevMode } from '@angular/core';
import { Router } from '@angular/router';
import * as Sentry from '@sentry/angular';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideServiceWorker } from '@angular/service-worker';
import { providePrimeNG } from 'primeng/config';
import { provideRouter, withEnabledBlockingInitialNavigation } from '@angular/router';
import { provideHttpClient, withInterceptors, withFetch } from '@angular/common/http';
import { MessageService } from 'primeng/api';
import { routes } from './app.routes';
import { definePreset } from '@primeuix/themes';
import Aura from '@primeuix/themes/aura';
import { authInterceptor } from './services/auth.interceptor';
import { GlobalErrorHandler } from './services/global-error-handler';

// Definiujemy własny preset bazujący na Aura z jasnymi kolorami dla dialogów i toastów
const LightThemePreset = definePreset(Aura, {
    components: {
        dialog: {
            colorScheme: {
                light: {
                    root: {
                        background: '#ffffff',
                        color: '#374151'
                    }
                },
                dark: {
                    root: {
                        background: '#ffffff',
                        color: '#374151'
                    }
                }
            }
        },
        toast: {
            colorScheme: {
                light: {
                    success: {
                        background: '#f0f8f0',
                        color: '#2c5f2d',
                        detailColor: '#2c5f2d'
                    },
                    info: {
                        background: '#e8f4fd',
                        color: '#234e70',
                        detailColor: '#234e70'
                    },
                    warn: {
                        background: '#fff8e6',
                        color: '#664d03',
                        detailColor: '#664d03'
                    },
                    error: {
                        background: '#feeceb',
                        color: '#5f2120',
                        detailColor: '#5f2120'
                    }
                },
                dark: {
                    success: {
                        background: '#f0f8f0',
                        color: '#2c5f2d',
                        detailColor: '#2c5f2d'
                    },
                    info: {
                        background: '#e8f4fd',
                        color: '#234e70',
                        detailColor: '#234e70'
                    },
                    warn: {
                        background: '#fff8e6',
                        color: '#664d03',
                        detailColor: '#664d03'
                    },
                    error: {
                        background: '#feeceb',
                        color: '#5f2120',
                        detailColor: '#5f2120'
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
