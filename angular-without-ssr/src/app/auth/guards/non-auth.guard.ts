import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { toObservable } from '@angular/core/rxjs-interop';
import { first } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { AuthStore } from '../store';

export const nonAuthGuard: CanActivateFn = () => {
  const authStore = inject(AuthStore);
  const router: Router = inject(Router);

  authStore.checkAuthState();

  return toObservable(authStore.authChecked).pipe(
    filter((checked: boolean) => checked),
    first(),
    map(() => {
      if (!authStore.isAuthenticated() || authStore.isAnonymous()) {
        return true;
      }
      return router.createUrlTree(['/dashboard']);
    })
  );
};
