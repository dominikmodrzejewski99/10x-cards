import { Injectable, inject } from '@angular/core';
import { SupabaseClient } from '@supabase/supabase-js';
import { Observable, from, map, catchError, throwError, of, switchMap } from 'rxjs';
import { TranslocoService } from '@jsverse/transloco';
import { LoginUserCommand, RegisterUserCommand, UserDTO } from '../../types';
import { SupabaseClientFactory } from '../services/infrastructure/supabase-client.factory';
import { LoggerService } from '../services/infrastructure/logger.service';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private logger: LoggerService = inject(LoggerService);
  private readonly t: TranslocoService = inject(TranslocoService);
  private supabase: SupabaseClient;

  constructor(private supabaseFactory: SupabaseClientFactory) {
    this.supabase = this.supabaseFactory.getClient();
  }

  /**
   * Tworzy rekord użytkownika w tabeli users
   * @param user Dane użytkownika
   * @returns Observable zawierający utworzony rekord
   */
  private createUserRecord(user: UserDTO): Observable<UserDTO> {

    return from(this.supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single()
    ).pipe(
      switchMap(response => {
        // Jeśli rekord istnieje, zwracamy użytkownika
        if (!response.error && response.data) {
          return of(user);
        }

        // Jeśli rekord nie istnieje, tworzymy go
        // Używamy funkcji RPC zamiast bezpośredniego zapisu do tabeli
        return from(this.supabase
          .rpc('create_user_record', {
            user_id: user.id,
            user_email: user.email || `anonymous+${user.id}@noreply.local`,
            user_created_at: user.created_at || new Date().toISOString(),
            user_updated_at: user.updated_at || user.created_at || new Date().toISOString()
          })
          .select()
        ).pipe(
          map(response => {
            if (response.error) {
              throw response.error;
            }
            return user;
          }),
          catchError(error => {
            this.logger.error('AuthService.createUserRecord', error);
            // Zwracamy oryginalnego użytkownika, nawet jeśli nie udało się utworzyć rekordu
            // Nie chcemy, aby to blokowało proces logowania/rejestracji
            return of(user);
          })
        );
      }),
      catchError(error => {
        this.logger.error('AuthService.createUserRecord', error);
        // Zwracamy oryginalnego użytkownika, nawet jeśli nie udało się sprawdzić rekordu
        return of(user);
      })
    );
  }

  /**
   * Rejestruje nowego użytkownika przy użyciu Supabase Auth
   */
  register(command: RegisterUserCommand): Observable<UserDTO> {
    // Prosta rejestracja bez potwierdzania email
    return from(this.supabase.auth.signUp({
      email: command.email,
      password: command.password,
      options: {
        // Ustawiamy emailRedirectTo na pustą wartość, co wyłącza wysyłanie maili potwierdzających
        emailRedirectTo: '',
        data: {
          name: command.email.split('@')[0] // Domyślna nazwa użytkownika z części lokalnej adresu email
        }
      }
    })).pipe(
      map(response => {
        if (response.error) {
          throw response.error;
        }
        if (!response.data.user) {
          throw new Error(this.t.translate('auth.errors.registrationFailed'));
        }

        return this.mapUserToDTO(response.data.user);
      }),
      switchMap(user => this.createUserRecord(user)),
      // Po utworzeniu rekordu użytkownika, automatycznie logujemy
      switchMap(user => {
        return this.login({
          email: command.email,
          password: command.password
        });
      }),
      catchError(error => {
        this.logger.error('AuthService.register', error);
        return throwError(() => this.handleAuthError(error));
      })
    );
  }

  /**
   * Loguje anonimowo — tworzy tymczasowe konto bez podawania danych
   */
  signInAnonymously(): Observable<UserDTO> {
    return from(this.supabase.auth.signInAnonymously()).pipe(
      map(response => {
        if (response.error) {
          throw response.error;
        }
        if (!response.data.user) {
          throw new Error(this.t.translate('auth.errors.anonymousAccountFailed'));
        }
        return this.mapUserToDTO(response.data.user);
      }),
      switchMap(user => this.createUserRecord(user)),
      catchError(error => {
        this.logger.error('AuthService.signInAnonymously', error);
        return throwError(() => this.handleAuthError(error));
      })
    );
  }

  /**
   * Loguje użytkownika przy użyciu Supabase Auth
   */
  login(command: LoginUserCommand): Observable<UserDTO> {
    return from(this.supabase.auth.signInWithPassword({
      email: command.email,
      password: command.password
    })).pipe(
      map(response => {
        if (response.error) {
          throw response.error;
        }
        if (!response.data.user) {
          throw new Error(this.t.translate('auth.errors.loginFailed'));
        }
        return this.mapUserToDTO(response.data.user);
      }),
      switchMap(user => this.createUserRecord(user)),
      catchError(error => {
        this.logger.error('AuthService.login', error);
        return throwError(() => this.handleAuthError(error));
      })
    );
  }

  /**
   * Wysyła email z linkiem do resetu hasła
   */
  resetPassword(email: string): Observable<void> {
    const redirectTo = `${window.location.origin}/reset-password`;
    return from(this.supabase.auth.resetPasswordForEmail(email, { redirectTo })).pipe(
      map(response => {
        if (response.error) {
          throw response.error;
        }
      }),
      catchError(error => {
        this.logger.error('AuthService.resetPassword', error);
        return throwError(() => this.handleAuthError(error));
      })
    );
  }

  /**
   * Ustawia nowe hasło (po kliknięciu linku z emaila)
   */
  updatePassword(newPassword: string): Observable<UserDTO> {
    return from(this.supabase.auth.updateUser({ password: newPassword })).pipe(
      map(response => {
        if (response.error) {
          throw response.error;
        }
        if (!response.data.user) {
          throw new Error(this.t.translate('auth.errors.updatePasswordFailed'));
        }
        return this.mapUserToDTO(response.data.user);
      }),
      catchError(error => {
        this.logger.error('AuthService.updatePassword', error);
        return throwError(() => this.handleAuthError(error));
      })
    );
  }

  /**
   * Usuwa konto użytkownika i wszystkie powiązane dane
   */
  deleteAccount(): Observable<void> {
    return from(this.supabase.rpc('delete_user_account')).pipe(
      switchMap(response => {
        if (response.error) {
          throw response.error;
        }
        return from(this.supabase.auth.signOut());
      }),
      map(response => {
        if (response.error) {
          throw response.error;
        }
      }),
      catchError(error => {
        this.logger.error('AuthService.deleteAccount', error);
        return throwError(() => this.handleAuthError(error));
      })
    );
  }

  /**
   * Wylogowuje użytkownika
   */
  logout(): Observable<void> {
    return from(this.supabase.auth.signOut()).pipe(
      map(response => {
        if (response.error) {
          throw response.error;
        }
        return;
      }),
      catchError(error => {
        this.logger.error('AuthService.logout', error);
        return throwError(() => this.handleAuthError(error));
      })
    );
  }

  /**
   * Sprawdza czy email jest już zarejestrowany
   */
  checkEmailExists(email: string): Observable<boolean> {
    return from(this.supabase.rpc('check_email_exists', { check_email: email })).pipe(
      map(response => {
        if (response.error) {
          return false;
        }
        return !!response.data;
      }),
      catchError(() => of(false))
    );
  }

  /**
   * Pobiera aktualnie zalogowanego użytkownika
   */
  getCurrentUser(): Observable<UserDTO | null> {
    return from(this.supabase.auth.getSession()).pipe(
      map(response => {
        if (response.error) {
          throw response.error;
        }
        if (!response.data.session?.user) {
          return null;
        }
        return this.mapUserToDTO(response.data.session.user);
      }),
      catchError(error => {
        this.logger.error('AuthService.getCurrentUser', error);
        return of(null);
      })
    );
  }

  /**
   * Mapuje obiekt User z Supabase na UserDTO
   */
  private mapUserToDTO(user: { id: string; email?: string; is_anonymous?: boolean; created_at: string; updated_at?: string }): UserDTO {
    return {
      id: user.id,
      email: user.email ?? '',
      is_anonymous: !!user.is_anonymous,
      created_at: user.created_at,
      updated_at: user.updated_at || user.created_at
    };
  }

  /**
   * Obsługuje błędy autentykacji i zwraca przyjazne dla użytkownika komunikaty
   */
  private handleAuthError(error: unknown): Error {
    let message = this.t.translate('auth.errors.unknownError');

    if (typeof error === 'string') {
      return new Error(this.t.translate('auth.errors.genericError'));
    }

    const err = error as { message?: string; status?: number };
    if (err.message) {
      if (err.message.includes('Email not confirmed') ||
          err.message.includes('Email verification required')) {
        return new Error(this.t.translate('auth.errors.emailNotConfirmed'));
      }

      // Sprawdzamy, czy błąd dotyczy nieprawidłowego adresu email
      if (err.message.includes('Email address') && err.message.includes('is invalid')) {
        message = this.t.translate('auth.errors.invalidEmailAddress');
      } else {
        // Mapowanie komunikatów błędów z Supabase na przyjazne dla użytkownika komunikaty
        switch (err.message) {
          case 'Invalid login credentials':
            message = this.t.translate('auth.errors.invalidCredentials');
            break;
          case 'User already registered':
            message = this.t.translate('auth.errors.userAlreadyRegistered');
            break;
          case 'Password should be at least 6 characters':
          case 'Password should be at least 6 characters.':
            message = this.t.translate('auth.errors.passwordTooShort');
            break;
          case 'New password should be different from the old password.':
          case 'New password should be different from the old password':
            message = this.t.translate('auth.errors.samePassword');
            break;
          case 'Auth session missing!':
          case 'Auth session missing':
            message = this.t.translate('auth.errors.sessionExpired');
            break;
          case 'For security purposes, you can only request this once every 60 seconds':
            message = this.t.translate('auth.errors.rateLimited');
            break;
          case 'Unable to validate email address: invalid format':
            message = this.t.translate('auth.errors.invalidEmailFormat');
            break;
          default:
            // Don't expose raw error messages from Supabase
            if (err.message.includes('fetch') || err.message.includes('network') || err.message.includes('Failed to fetch')) {
              message = this.t.translate('auth.errors.networkError');
            } else {
              message = this.t.translate('auth.errors.genericError');
            }
        }
      }
    }

    return new Error(message);
  }
}
