import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { combineLatest, first } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { selectIsAuthenticated, selectAuthChecked } from '../store/auth.selectors';
import * as AuthActions from '../store/auth.actions';

export const nonAuthGuard: CanActivateFn = (route, state) => {
  const store = inject(Store);
  const router = inject(Router);

  store.dispatch(AuthActions.checkAuthState());

  return combineLatest([
    store.select(selectIsAuthenticated),
    store.select(selectAuthChecked)
  ]).pipe(
    filter(([_, authChecked]) => authChecked),
    first(),
    map(([isAuthenticated]) => {
      if (!isAuthenticated) {
        return true;
      }
      return router.createUrlTree(['/dashboard']);
    })
  );
};
