import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { toObservable } from '@angular/core/rxjs-interop';
import { first } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { AuthRedirectService } from '../services/auth-redirect.service';
import { AuthStore } from '../store';

export const authGuard: CanActivateFn = (route, state) => {
  const authStore = inject(AuthStore);
  const router: Router = inject(Router);
  const authRedirectService: AuthRedirectService = inject(AuthRedirectService);

  authStore.checkAuthState();

  return toObservable(authStore.authChecked).pipe(
    filter((checked: boolean) => checked),
    first(),
    map(() => {
      if (authStore.isAuthenticated()) {
        return true;
      }

      authRedirectService.setRedirectUrl(state.url);
      return router.createUrlTree(['/login']);
    })
  );
};
