import { Injectable } from '@angular/core';
import { SupabaseClient } from '@supabase/supabase-js';
import { Observable, from, map, catchError, throwError, of, switchMap } from 'rxjs';
import { LoginUserCommand, RegisterUserCommand, UserDTO } from '../../types';
import { SupabaseClientFactory } from '../services/supabase-client.factory';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
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
    console.log('Tworzenie rekordu użytkownika w tabeli users:', user);

    // Najpierw sprawdźmy, czy rekord użytkownika już istnieje
    return from(this.supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single()
    ).pipe(
      switchMap(response => {
        console.log('Odpowiedź z Supabase (sprawdzenie użytkownika):', response);

        // Jeśli rekord istnieje, zwracamy użytkownika
        if (!response.error && response.data) {
          console.log('Rekord użytkownika już istnieje:', response.data);
          return of(user);
        }

        console.log('Rekord użytkownika nie istnieje. Tworzenie nowego rekordu...');

        // Jeśli rekord nie istnieje, tworzymy go
        // Używamy funkcji RPC zamiast bezpośredniego zapisu do tabeli
        return from(this.supabase
          .rpc('create_user_record', {
            user_id: user.id,
            user_email: user.email || 'user@example.com',
            user_created_at: user.created_at || new Date().toISOString(),
            user_updated_at: user.updated_at || user.created_at || new Date().toISOString()
          })
          .select()
        ).pipe(
          map(response => {
            console.log('Odpowiedź z Supabase (createUserRecord):', response);
            if (response.error) {
              console.error('Błąd podczas tworzenia rekordu użytkownika:', response.error);
              throw response.error;
            }
            console.log('Rekord użytkownika utworzony pomyślnie:', response.data);
            return user;
          }),
          catchError(error => {
            console.error('Błąd podczas tworzenia rekordu użytkownika:', error);
            // Zwracamy oryginalnego użytkownika, nawet jeśli nie udało się utworzyć rekordu
            // Nie chcemy, aby to blokowało proces logowania/rejestracji
            return of(user);
          })
        );
      }),
      catchError(error => {
        console.error('Błąd podczas sprawdzania rekordu użytkownika:', error);
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
          throw new Error('Nie udało się zarejestrować. Spróbuj ponownie.');
        }

        console.log('Użytkownik zarejestrowany pomyślnie:', response.data.user);

        return this.mapUserToDTO(response.data.user);
      }),
      switchMap(user => this.createUserRecord(user)),
      // Po utworzeniu rekordu użytkownika, automatycznie logujemy
      switchMap(user => {
        console.log('Automatyczne logowanie po rejestracji...');
        return this.login({
          email: command.email,
          password: command.password
        });
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
        return this.mapUserToDTO(response.data.user);
      }),
      switchMap(user => this.createUserRecord(user)),
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

    console.log('Szczegóły błędu autentykacji:', error);

    if (error.message) {
      // Ignorujemy błąd potwierdzenia email - użytkownik może się zalogować bez potwierdzania
      if (error.message.includes('Email not confirmed') ||
          error.message.includes('Email verification required')) {
        console.log('Ignorowanie błędu potwierdzenia email');
        return new Error('');
      }

      // Sprawdzamy, czy błąd dotyczy nieprawidłowego adresu email
      if (error.message.includes('Email address') && error.message.includes('is invalid')) {
        message = 'Podany adres email jest nieprawidłowy. Użyj poprawnego adresu email.';
      } else {
        // Mapowanie komunikatów błędów z Supabase na przyjazne dla użytkownika komunikaty
        switch (error.message) {
          case 'Invalid login credentials':
            message = 'Nieprawidłowy email lub hasło.';
            break;
          case 'User already registered':
            message = 'Użytkownik o podanym adresie email już istnieje. Spróbuj się zalogować.';
            break;
          case 'Password should be at least 6 characters':
            message = 'Hasło powinno mieć co najmniej 6 znaków.';
            break;
          default:
            message = error.message;
        }
      }
    }

    return new Error(message);
  }
}
