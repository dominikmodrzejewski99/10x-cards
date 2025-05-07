import { Injectable } from '@angular/core';
import { SupabaseClient } from '@supabase/supabase-js';
import { Observable, from, map, catchError, throwError, of } from 'rxjs';
import { LoginUserCommand, RegisterUserCommand, UserDTO } from '../../types';
import { SupabaseClientFactory } from '../services/supabase-client.factory';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private supabase: SupabaseClient;

  constructor(private supabaseFactory: SupabaseClientFactory) {
    this.supabase = this.supabaseFactory.createClient();
  }

  /**
   * Rejestruje nowego użytkownika przy użyciu Supabase Auth
   */
  register(command: RegisterUserCommand): Observable<UserDTO> {
    return from(this.supabase.auth.signUp({
      email: command.email,
      password: command.password
    })).pipe(
      map(response => {
        if (response.error) {
          throw response.error;
        }
        if (!response.data.user) {
          throw new Error('Nie udało się zarejestrować. Spróbuj ponownie.');
        }
        return this.mapUserToDTO(response.data.user);
      }),
      catchError(error => {
        console.error('Błąd rejestracji:', error);
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
          throw new Error('Nie udało się zalogować. Spróbuj ponownie.');
        }
        return this.mapToUserDTO(response.data.user);
      }),
      catchError(error => {
        console.error('Błąd logowania:', error);
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
        console.error('Błąd wylogowania:', error);
        return throwError(() => this.handleAuthError(error));
      })
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
        console.error('Błąd pobierania sesji:', error);
        return of(null);
      })
    );
  }

  /**
   * Resetuje hasło użytkownika
   */
  resetPassword(email: string): Observable<void> {
    return from(this.supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/set-new-password`
    })).pipe(
      map(response => {
        if (response.error) {
          throw response.error;
        }
        return;
      }),
      catchError(error => {
        console.error('Błąd resetowania hasła:', error);
        return throwError(() => this.handleAuthError(error));
      })
    );
  }

  /**
   * Ustawia nowe hasło użytkownika
   */
  setNewPassword(password: string): Observable<UserDTO> {
    return from(this.supabase.auth.updateUser({ password })).pipe(
      map(response => {
        if (response.error) {
          throw response.error;
        }
        if (!response.data.user) {
          throw new Error('Nie udało się zmienić hasła. Spróbuj ponownie.');
        }
        return this.mapUserToDTO(response.data.user);
      }),
      catchError(error => {
        console.error('Błąd zmiany hasła:', error);
        return throwError(() => this.handleAuthError(error));
      })
    );
  }

  /**
   * Mapuje obiekt User z Supabase na UserDTO
   */
  private mapUserToDTO(user: any): UserDTO {
    return {
      id: user.id,
      email: user.email,
      created_at: user.created_at,
      updated_at: user.updated_at || user.created_at
    };
  }

  /**
   * Obsługuje błędy autentykacji i zwraca przyjazne dla użytkownika komunikaty
   */
  private handleAuthError(error: any): Error {
    let message = 'Wystąpił nieznany błąd. Spróbuj ponownie później.';

    if (typeof error === 'string') {
      return new Error(error);
    }

    if (error.message) {
      // Mapowanie komunikatów błędów z Supabase na przyjazne dla użytkownika komunikaty
      switch (error.message) {
        case 'Invalid login credentials':
          message = 'Nieprawidłowy email lub hasło.';
          break;
        case 'User already registered':
          message = 'Użytkownik o podanym adresie email już istnieje.';
          break;
        case 'Email not confirmed':
          message = 'Email nie został potwierdzony. Sprawdź swoją skrzynkę pocztową.';
          break;
        case 'Password should be at least 6 characters':
          message = 'Hasło powinno mieć co najmniej 6 znaków.';
          break;
        default:
          message = error.message;
      }
    }

    return new Error(message);
  }
}
