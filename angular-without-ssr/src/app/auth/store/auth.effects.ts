import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { of, TimeoutError } from 'rxjs';
import { catchError, exhaustMap, map, switchMap, tap, timeout } from 'rxjs/operators';
import { Router } from '@angular/router';
import * as AuthActions from './auth.actions';
import { AuthService } from '../auth.service';
import { AuthRedirectService } from '../services/auth-redirect.service';
import { UserPreferencesService } from '../../services/user-preferences.service';
import { StreakService } from '../../shared/services/streak.service';

@Injectable()
export class AuthEffects {
  private actions$ = inject(Actions);
  private authService = inject(AuthService);
  private router = inject(Router);
  private authRedirectService = inject(AuthRedirectService);
  private userPreferencesService = inject(UserPreferencesService);
  private streakService = inject(StreakService);

  login$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AuthActions.login),
      switchMap(({ email, password }) =>
        this.authService.login({ email, password }).pipe(
          timeout(15000),
          map((user) => AuthActions.loginSuccess({ user })),
          catchError((error) => of(AuthActions.loginFailure({
            error: error instanceof TimeoutError
              ? 'Serwer nie odpowiada. Spróbuj ponownie później.'
              : this.handleError(error)
          })))
        )
      )
    )
  );

  loginSuccess$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(AuthActions.loginSuccess),
        tap(() => {
          this.authRedirectService.redirectToSavedUrlOrDefault('/dashboard');
        })
      ),
    { dispatch: false }
  );

  register$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AuthActions.register),
      switchMap(({ email, password, passwordConfirmation }) => {
        if (password !== passwordConfirmation) {
          return of(AuthActions.registerFailure({ error: 'Hasła nie są zgodne' }));
        }

        return this.authService.register({ email, password }).pipe(
          map((user) => AuthActions.registerSuccess({ user })),
          catchError((error) => of(AuthActions.registerFailure({ error: this.handleError(error) })))
        );
      })
    )
  );

  registerSuccess$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(AuthActions.registerSuccess),
        tap(() => {
          this.authRedirectService.redirectToSavedUrlOrDefault('/dashboard');
        })
      ),
    { dispatch: false }
  );

  loginAnonymously$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AuthActions.loginAnonymously),
      switchMap(() =>
        this.authService.signInAnonymously().pipe(
          map((user) => AuthActions.loginAnonymouslySuccess({ user })),
          catchError((error) => of(AuthActions.loginAnonymouslyFailure({ error: this.handleError(error) })))
        )
      )
    )
  );

  loginAnonymouslySuccess$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(AuthActions.loginAnonymouslySuccess),
        tap(() => {
          this.authRedirectService.redirectToSavedUrlOrDefault('/dashboard');
        })
      ),
    { dispatch: false }
  );

  logout$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AuthActions.logout),
      switchMap(() =>
        this.authService.logout().pipe(
          map(() => AuthActions.logoutSuccess()),
          catchError((error) => of(AuthActions.logoutFailure({ error: this.handleError(error) })))
        )
      )
    )
  );

  logoutSuccess$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(AuthActions.logoutSuccess),
        tap(() => {
          this.userPreferencesService.clearCache();
          this.streakService.reset();
          this.router.navigate(['/login']);
        })
      ),
    { dispatch: false }
  );

  checkAuthState$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AuthActions.checkAuthState),
      exhaustMap(() =>
        this.authService.getCurrentUser().pipe(
          timeout(10000),
          map((user) => AuthActions.authStateLoaded({ user })),
          catchError(() => of(AuthActions.authStateLoaded({ user: null })))
        )
      )
    )
  );

  private handleError(error: any): string {
    if (error.message) {
      return error.message;
    }

    if (error.error?.message) {
      return error.error.message;
    }

    if (typeof error === 'string') {
      return error;
    }

    return 'Wystąpił nieznany błąd. Spróbuj ponownie później.';
  }
}
