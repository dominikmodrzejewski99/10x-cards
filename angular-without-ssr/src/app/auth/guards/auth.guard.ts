import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { map, take } from 'rxjs/operators';
import { selectIsAuthenticated } from '../store/auth.selectors';
import { AuthRedirectService } from '../services/auth-redirect.service';

export const authGuard: CanActivateFn = (route, state) => {
  const store = inject(Store);
  const router = inject(Router);
  const authRedirectService = inject(AuthRedirectService);

  return store.select(selectIsAuthenticated).pipe(
    take(1),
    map(isAuthenticated => {
      if (isAuthenticated) {
        return true;
      }

      // Zapisz URL, do którego użytkownik próbował uzyskać dostęp
      authRedirectService.setRedirectUrl(state.url);

      // Przekierowanie do strony logowania
      return router.createUrlTree(['/login']);
    })
  );
};
