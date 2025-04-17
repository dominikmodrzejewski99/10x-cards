import { ApplicationConfig } from '@angular/core';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { providePrimeNG } from 'primeng/config';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { routes } from './app.routes';
import Aura from '@primeng/themes/aura';
import { authInterceptor } from './services/auth.interceptor';

export const appConfig: ApplicationConfig = {
    providers: [
        provideAnimationsAsync(),
        provideRouter(routes),
        provideHttpClient(
            withInterceptors([authInterceptor])
        ),
        providePrimeNG({
            theme: {
                preset: Aura
            }
        })
    ]
};
