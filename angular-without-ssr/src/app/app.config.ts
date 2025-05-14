import { ApplicationConfig, isDevMode } from '@angular/core';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { providePrimeNG } from 'primeng/config';
import { provideRouter, withEnabledBlockingInitialNavigation } from '@angular/router';
import { provideHttpClient, withInterceptors, withFetch } from '@angular/common/http';
import { routes } from './app.routes';
import { definePreset } from '@primeng/themes';
import Aura from '@primeng/themes/aura';
import { authInterceptor } from './services/auth.interceptor';
import { provideStore } from '@ngrx/store';
import { provideEffects } from '@ngrx/effects';
import { provideStoreDevtools } from '@ngrx/store-devtools';
import { authReducer } from './auth/store/auth.reducer';
import { AuthEffects } from './auth/store/auth.effects';

// Definiujemy własny preset bazujący na Aura z jasnymi kolorami dla dialogów i toastów
const LightThemePreset = definePreset(Aura, {
    components: {
        dialog: {
            colorScheme: {
                light: {
                    root: {
                        background: '#ffffff'
                    },
                    header: {
                        background: '#f8fafc',
                        color: '#334155'
                    },
                    content: {
                        background: '#ffffff',
                        color: '#374151'
                    },
                    footer: {
                        background: '#f8fafc'
                    }
                },
                dark: {
                    root: {
                        background: '#ffffff'
                    },
                    header: {
                        background: '#f8fafc',
                        color: '#334155'
                    },
                    content: {
                        background: '#ffffff',
                        color: '#374151'
                    },
                    footer: {
                        background: '#f8fafc'
                    }
                }
            }
        },
        toast: {
            colorScheme: {
                light: {
                    root: {
                        background: '#ffffff'
                    },
                    message: {
                        background: '#ffffff',
                        color: '#374151'
                    },
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
                    root: {
                        background: '#ffffff'
                    },
                    message: {
                        background: '#ffffff',
                        color: '#374151'
                    },
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
        provideAnimationsAsync(),
        provideRouter(routes, withEnabledBlockingInitialNavigation()),
        provideHttpClient(
            withInterceptors([authInterceptor]),
            withFetch()
        ),
        provideStore({ auth: authReducer }),
        provideEffects([AuthEffects]),
        provideStoreDevtools({ maxAge: 25, logOnly: !isDevMode() }),

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
            }
        })
    ]
};
