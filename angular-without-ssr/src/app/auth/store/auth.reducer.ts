import { createReducer, on } from '@ngrx/store';
import { initialAuthState } from './auth.state';
import * as AuthActions from './auth.actions';

export const authReducer = createReducer(
  initialAuthState,
  
  // Login actions
  on(AuthActions.login, (state) => ({
    ...state,
    loading: true,
    error: null
  })),
  
  on(AuthActions.loginSuccess, (state, { user }) => ({
    ...state,
    user,
    loading: false,
    error: null
  })),
  
  on(AuthActions.loginFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error
  })),
  
  // Register actions
  on(AuthActions.register, (state) => ({
    ...state,
    loading: true,
    error: null
  })),
  
  on(AuthActions.registerSuccess, (state, { user }) => ({
    ...state,
    user,
    loading: false,
    error: null
  })),
  
  on(AuthActions.registerFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error
  })),
  
  // Logout actions
  on(AuthActions.logout, (state) => ({
    ...state,
    loading: true,
    error: null
  })),
  
  on(AuthActions.logoutSuccess, (state) => ({
    ...state,
    user: null,
    loading: false,
    error: null
  })),
  
  on(AuthActions.logoutFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error
  })),
  
  // Auth state actions
  on(AuthActions.checkAuthState, (state) => ({
    ...state,
    loading: true
  })),
  
  on(AuthActions.authStateLoaded, (state, { user }) => ({
    ...state,
    user,
    loading: false
  })),
  
  // Clear error
  on(AuthActions.clearAuthError, (state) => ({
    ...state,
    error: null
  }))
);
