import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { of } from 'rxjs';
import { catchError, map, switchMap, tap } from 'rxjs/operators';
import { Router } from '@angular/router';
import * as AuthActions from './auth.actions';
import { AuthService } from '../auth.service';
import { AuthRedirectService } from '../services/auth-redirect.service';

@Injectable()
export class AuthEffects {
  private actions$ = inject(Actions);
  private authService = inject(AuthService);
  private router = inject(Router);
  private authRedirectService = inject(AuthRedirectService);

  login$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AuthActions.login),
      switchMap(({ email, password }) =>
        this.authService.login({ email, password }).pipe(
          map((user) => AuthActions.loginSuccess({ user })),
          catchError((error) => of(AuthActions.loginFailure({ error: this.handleError(error) })))
        )
      )
    )
  );

  loginSuccess$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(AuthActions.loginSuccess),
        tap(() => {
          // Przekieruj do zapisanego URL-a lub do strony generowania fiszek
          this.authRedirectService.redirectToSavedUrlOrDefault('/generate');
        })
      ),
    { dispatch: false }
  );

  register$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AuthActions.register),
      switchMap(({ email, password, passwordConfirmation }) => {
        // Sprawdzamy, czy hasła są zgodne
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
          // Przekieruj do zapisanego URL-a lub do strony generowania fiszek
          this.authRedirectService.redirectToSavedUrlOrDefault('/generate');
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
        tap(() => this.router.navigate(['/login']))
      ),
    { dispatch: false }
  );

  checkAuthState$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AuthActions.checkAuthState),
      switchMap(() =>
        this.authService.getCurrentUser().pipe(
          map((user) => AuthActions.authStateLoaded({ user })),
          catchError(() => of(AuthActions.authStateLoaded({ user: null })))
        )
      )
    )
  );

  authStateLoaded$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(AuthActions.authStateLoaded),
        tap(({ user }) => {
          console.log('authStateLoaded: Stan użytkownika zaladowany', !!user, 'URL:', this.router.url);
          // Jeśli użytkownik jest zalogowany i jesteśmy na stronie głównej, logowania lub rejestracji, przekieruj do /generate
          if (user && (this.router.url === '/' || this.router.url === '/login' || this.router.url === '/register')) {
            console.log('authStateLoaded: Przekierowanie zalogowanego użytkownika do /generate');
            this.router.navigate(['/generate']);
          }
        })
      ),
    { dispatch: false }
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
