import { ApplicationConfig, isDevMode } from '@angular/core';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { providePrimeNG } from 'primeng/config';
import { provideRouter, withEnabledBlockingInitialNavigation } from '@angular/router';
import { provideHttpClient, withInterceptors, withFetch } from '@angular/common/http';
import { routes } from './app.routes';
import Aura from '@primeng/themes/aura';
import { authInterceptor } from './services/auth.interceptor';

export const appConfig: ApplicationConfig = {
    providers: [
        provideAnimationsAsync(),
        provideRouter(routes, withEnabledBlockingInitialNavigation()),
        provideHttpClient(
            withInterceptors([authInterceptor]),
            withFetch()
        ),

        providePrimeNG({
            theme: {
                preset: Aura
            },
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
