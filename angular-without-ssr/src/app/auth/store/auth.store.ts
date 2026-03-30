import { computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { signalStore, withState, withComputed, withMethods, patchState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { pipe, of, TimeoutError } from 'rxjs';
import { switchMap, catchError, tap, timeout, exhaustMap } from 'rxjs/operators';
import { UserDTO } from '../../../types';
import { AuthService } from '../auth.service';
import { AuthRedirectService } from '../services/auth-redirect.service';
import { UserPreferencesService } from '../../services/user-preferences.service';
import { StreakService } from '../../shared/services/streak.service';
import { ThemeService } from '../../services/theme.service';

export interface AuthState {
  user: UserDTO | null;
  loading: boolean;
  error: string | null;
  authChecked: boolean;
  /** Incremented on registerSuccess or loginAnonymouslySuccess to trigger onboarding */
  onboardingTrigger: number;
}

const initialAuthState: AuthState = {
  user: null,
  loading: false,
  error: null,
  authChecked: false,
  onboardingTrigger: 0,
};

export const AuthStore = signalStore(
  { providedIn: 'root' },
  withState(initialAuthState),
  withComputed((store) => ({
    isAuthenticated: computed<boolean>(() => !!store.user()),
    isAnonymous: computed<boolean>(() => !!store.user()?.is_anonymous),
    userEmail: computed<string | undefined>(() => store.user()?.email),
  })),
  withMethods((store) => {
    const authService: AuthService = inject(AuthService);
    const router: Router = inject(Router);
    const authRedirectService: AuthRedirectService = inject(AuthRedirectService);
    const userPreferencesService: UserPreferencesService = inject(UserPreferencesService);
    const streakService: StreakService = inject(StreakService);
    const themeService: ThemeService = inject(ThemeService);

    return {
      clearError(): void {
        patchState(store, { error: null });
      },

      login: rxMethod<{ email: string; password: string }>(
        pipe(
          tap(() => patchState(store, { loading: true, error: null })),
          switchMap(({ email, password }) =>
            authService.login({ email, password }).pipe(
              timeout(15000),
              tap((user: UserDTO) => {
                patchState(store, { user, loading: false, error: null });
                themeService.loadTheme();
                authRedirectService.redirectToSavedUrlOrDefault('/dashboard');
              }),
              catchError((error: unknown) => {
                const message: string = error instanceof TimeoutError
                  ? 'Serwer nie odpowiada. Spróbuj ponownie później.'
                  : handleError(error);
                patchState(store, { loading: false, error: message });
                return of(null);
              })
            )
          )
        )
      ),

      register: rxMethod<{ email: string; password: string; passwordConfirmation: string }>(
        pipe(
          tap(() => patchState(store, { loading: true, error: null })),
          switchMap(({ email, password, passwordConfirmation }) => {
            if (password !== passwordConfirmation) {
              patchState(store, { loading: false, error: 'Hasła nie są zgodne' });
              return of(null);
            }

            return authService.register({ email, password }).pipe(
              tap((user: UserDTO) => {
                patchState(store, {
                  user,
                  loading: false,
                  error: null,
                  onboardingTrigger: store.onboardingTrigger() + 1,
                });
                themeService.loadTheme();
                authRedirectService.redirectToSavedUrlOrDefault('/dashboard');
              }),
              catchError((error: unknown) => {
                patchState(store, { loading: false, error: handleError(error) });
                return of(null);
              })
            );
          })
        )
      ),

      loginAnonymously: rxMethod<void>(
        pipe(
          tap(() => patchState(store, { loading: true, error: null })),
          switchMap(() =>
            authService.signInAnonymously().pipe(
              tap((user: UserDTO) => {
                patchState(store, {
                  user,
                  loading: false,
                  error: null,
                  onboardingTrigger: store.onboardingTrigger() + 1,
                });
                themeService.loadTheme();
                authRedirectService.redirectToSavedUrlOrDefault('/dashboard');
              }),
              catchError((error: unknown) => {
                patchState(store, { loading: false, error: handleError(error) });
                return of(null);
              })
            )
          )
        )
      ),

      logout: rxMethod<void>(
        pipe(
          tap(() => patchState(store, { loading: true, error: null })),
          switchMap(() =>
            authService.logout().pipe(
              tap(() => {
                patchState(store, { user: null, loading: false, error: null });
                userPreferencesService.clearCache();
                streakService.reset();
                themeService.resetTheme();
                router.navigate(['/login']);
              }),
              catchError((error: unknown) => {
                patchState(store, { loading: false, error: handleError(error) });
                return of(null);
              })
            )
          )
        )
      ),

      resetPassword: rxMethod<string>(
        pipe(
          tap(() => patchState(store, { loading: true, error: null })),
          switchMap((email: string) =>
            authService.resetPassword(email).pipe(
              tap(() => {
                patchState(store, { loading: false, error: null });
              }),
              catchError((error: unknown) => {
                patchState(store, { loading: false, error: handleError(error) });
                return of(null);
              })
            )
          )
        )
      ),

      updatePassword: rxMethod<string>(
        pipe(
          tap(() => patchState(store, { loading: true, error: null })),
          switchMap((newPassword: string) =>
            authService.updatePassword(newPassword).pipe(
              tap(() => {
                patchState(store, { loading: false, error: null });
                router.navigate(['/dashboard']);
              }),
              catchError((error: unknown) => {
                patchState(store, { loading: false, error: handleError(error) });
                return of(null);
              })
            )
          )
        )
      ),

      deleteAccount: rxMethod<void>(
        pipe(
          tap(() => patchState(store, { loading: true, error: null })),
          switchMap(() =>
            authService.deleteAccount().pipe(
              tap(() => {
                patchState(store, { user: null, loading: false, error: null });
                userPreferencesService.clearCache();
                streakService.reset();
                router.navigate(['/']);
              }),
              catchError((error: unknown) => {
                patchState(store, { loading: false, error: handleError(error) });
                return of(null);
              })
            )
          )
        )
      ),

      checkAuthState: rxMethod<void>(
        pipe(
          exhaustMap(() =>
            authService.getCurrentUser().pipe(
              timeout(10000),
              tap((user: UserDTO | null) => {
                patchState(store, { user, authChecked: true });
                if (user) { themeService.loadTheme(); }
              }),
              catchError(() => {
                patchState(store, { user: null, authChecked: true });
                return of(null);
              })
            )
          )
        )
      ),
    };
  })
);

function handleError(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (typeof error === 'object' && error !== null) {
    const err: Record<string, unknown> = error as Record<string, unknown>;
    if (typeof err['message'] === 'string') {
      return err['message'];
    }
    if (typeof err['error'] === 'object' && err['error'] !== null) {
      const innerErr: Record<string, unknown> = err['error'] as Record<string, unknown>;
      if (typeof innerErr['message'] === 'string') {
        return innerErr['message'];
      }
    }
  }

  if (typeof error === 'string') {
    return error;
  }

  return 'Wystąpił nieznany błąd. Spróbuj ponownie później.';
}
