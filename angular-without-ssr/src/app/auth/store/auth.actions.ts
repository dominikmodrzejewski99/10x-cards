import { createAction, props } from '@ngrx/store';
import { UserDTO } from '../../../types';

// Login actions
export const login = createAction(
  '[Auth] Login',
  props<{ email: string; password: string }>()
);

export const loginSuccess = createAction(
  '[Auth] Login Success',
  props<{ user: UserDTO }>()
);

export const loginFailure = createAction(
  '[Auth] Login Failure',
  props<{ error: string }>()
);

// Register actions
export const register = createAction(
  '[Auth] Register',
  props<{ email: string; password: string; passwordConfirmation: string }>()
);

export const registerSuccess = createAction(
  '[Auth] Register Success',
  props<{ user: UserDTO }>()
);

export const registerFailure = createAction(
  '[Auth] Register Failure',
  props<{ error: string }>()
);

// Logout action
export const logout = createAction('[Auth] Logout');
export const logoutSuccess = createAction('[Auth] Logout Success');
export const logoutFailure = createAction(
  '[Auth] Logout Failure',
  props<{ error: string }>()
);

// Check auth state action
export const checkAuthState = createAction('[Auth] Check Auth State');
export const authStateLoaded = createAction(
  '[Auth] Auth State Loaded',
  props<{ user: UserDTO | null }>()
);

// Clear error action
export const clearAuthError = createAction('[Auth] Clear Error');
