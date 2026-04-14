import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { toObservable } from '@angular/core/rxjs-interop';
import { first } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { AuthStore } from '../store';

/**
 * Blocks anonymous (unregistered) users from accessing sensitive features
 * like partner program, friends, settings, and feedback.
 * Must be used AFTER authGuard (which ensures authentication).
 */
export const registeredGuard: CanActivateFn = () => {
  const authStore = inject(AuthStore);
  const router: Router = inject(Router);

  return toObservable(authStore.authChecked).pipe(
    filter((checked: boolean) => checked),
    first(),
    map(() => {
      if (!authStore.isAnonymous()) {
        return true;
      }
      return router.createUrlTree(['/dashboard']);
    })
  );
};
