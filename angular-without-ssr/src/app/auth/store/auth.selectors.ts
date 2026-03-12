import { createFeatureSelector, createSelector } from '@ngrx/store';
import { AuthState } from './auth.state';

export const selectAuthState = createFeatureSelector<AuthState>('auth');

export const selectUser = createSelector(
  selectAuthState,
  (state: AuthState) => state.user
);

export const selectIsAuthenticated = createSelector(
  selectUser,
  (user) => !!user
);

export const selectAuthLoading = createSelector(
  selectAuthState,
  (state: AuthState) => state.loading
);

export const selectAuthError = createSelector(
  selectAuthState,
  (state: AuthState) => state.error
);

export const selectIsAnonymous = createSelector(
  selectUser,
  (user) => !!user?.is_anonymous
);

export const selectAuthChecked = createSelector(
  selectAuthState,
  (state: AuthState) => state.authChecked
);

export const selectUserEmail = createSelector(
  selectUser,
  (user) => user?.email
);
