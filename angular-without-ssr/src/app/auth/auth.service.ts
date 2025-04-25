import { Injectable } from '@angular/core';
import { SupabaseClient } from '@supabase/supabase-js';
import { BehaviorSubject, Observable, from, map, tap } from 'rxjs';
import { LoginUserCommand, RegisterUserCommand, UserDTO } from '../../types';
import { Router } from '@angular/router';
import { SupabaseClientFactory } from '../services/supabase-client.factory';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private supabase: SupabaseClient;
  private currentUserSubject = new BehaviorSubject<UserDTO | null>(null);
  currentUser$ = this.currentUserSubject.asObservable();

  constructor(
    private router: Router,
    private supabaseFactory: SupabaseClientFactory
  ) {
    this.supabase = this.supabaseFactory.createClient();
    this.loadUser();
  }

  private async loadUser() {
    const { data } = await this.supabase.auth.getSession();
    if (data.session?.user) {
      this.currentUserSubject.next(this.mapToUserDTO(data.session.user));
    }
  }

  register(command: RegisterUserCommand): Observable<UserDTO> {
    return from(this.supabase.auth.signUp({
      email: command.email,
      password: command.password
    })).pipe(
      map(({ data }) => {
        if (data.user) {
          return this.mapToUserDTO(data.user);
        }
        throw new Error('Rejestracja nie powiodła się');
      }),
      tap(user => {
        this.currentUserSubject.next(user);
        this.router.navigate(['/']);
      })
    );
  }

  login(command: LoginUserCommand): Observable<UserDTO> {
    return from(this.supabase.auth.signInWithPassword({
      email: command.email,
      password: command.password
    })).pipe(
      map(({ data }) => {
        if (data.user) {
          return this.mapToUserDTO(data.user);
        }
        throw new Error('Logowanie nie powiodło się');
      }),
      tap(user => {
        this.currentUserSubject.next(user);
        this.router.navigate(['/']);
      })
    );
  }

  logout(): Observable<void> {
    return from(this.supabase.auth.signOut()).pipe(
      map(() => void 0),
      tap(() => {
        this.currentUserSubject.next(null);
        this.router.navigate(['/login']);
      })
    );
  }

  isAuthenticated(): boolean {
    return !!this.currentUserSubject.value;
  }

  private mapToUserDTO(user: any): UserDTO {
    return {
      id: user.id,
      email: user.email,
      created_at: user.created_at,
      updated_at: user.updated_at || user.created_at
    };
  }
}
