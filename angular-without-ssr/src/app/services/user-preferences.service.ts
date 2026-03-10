import { Injectable, inject } from '@angular/core';
import { Observable, from, map, switchMap, throwError, catchError, of, tap, shareReplay } from 'rxjs';
import { SupabaseClient } from '@supabase/supabase-js';
import { SupabaseClientFactory } from './supabase-client.factory';
import { UserPreferencesDTO } from '../../types';

@Injectable({ providedIn: 'root' })
export class UserPreferencesService {
  private supabase: SupabaseClient = inject(SupabaseClientFactory).getClient();
  private cache$: Observable<UserPreferencesDTO> | null = null;

  private getCurrentUserId(): Observable<string> {
    return from(this.supabase.auth.getSession()).pipe(
      map(response => {
        const userId = response.data.session?.user?.id;
        if (!userId) throw new Error('Użytkownik nie jest zalogowany');
        return userId;
      })
    );
  }

  getPreferences(): Observable<UserPreferencesDTO> {
    if (this.cache$) return this.cache$;

    this.cache$ = this.getCurrentUserId().pipe(
      switchMap(userId =>
        from(this.supabase.rpc('get_or_create_preferences', { p_user_id: userId })).pipe(
          switchMap(response => {
            if (response.error) {
              // Fallback: try direct query if RPC not deployed yet
              return from(
                this.supabase
                  .from('user_preferences')
                  .select('*')
                  .eq('user_id', userId)
                  .maybeSingle()
              ).pipe(
                switchMap(fallback => {
                  if (fallback.error || !fallback.data) {
                    // Table might not exist yet, return defaults
                    return of(this.defaultPrefs(userId));
                  }
                  return of(fallback.data as UserPreferencesDTO);
                })
              );
            }
            return of(response.data as UserPreferencesDTO);
          })
        )
      ),
      shareReplay(1)
    );

    return this.cache$;
  }

  updatePreferences(updates: Partial<Pick<UserPreferencesDTO, 'onboarding_completed'>>): Observable<UserPreferencesDTO> {
    this.cache$ = null; // Invalidate cache

    return this.getCurrentUserId().pipe(
      switchMap(userId =>
        from(
          this.supabase
            .from('user_preferences')
            .upsert(
              { user_id: userId, ...updates, updated_at: new Date().toISOString() },
              { onConflict: 'user_id' }
            )
            .select()
            .single()
        ).pipe(
          map(response => {
            if (response.error) throw new Error(response.error.message);
            return response.data as UserPreferencesDTO;
          }),
          catchError(error => {
            console.error('Failed to update preferences:', error);
            return throwError(() => error);
          })
        )
      )
    );
  }

  setOnboardingCompleted(): Observable<UserPreferencesDTO> {
    return this.updatePreferences({ onboarding_completed: true });
  }

  recordStudySession(cardsReviewed: number): Observable<UserPreferencesDTO> {
    this.cache$ = null;

    return this.getCurrentUserId().pipe(
      switchMap(userId =>
        from(this.supabase.rpc('record_study_session', {
          p_user_id: userId,
          p_cards_reviewed: cardsReviewed
        })).pipe(
          map(response => {
            if (response.error) throw new Error(response.error.message);
            return response.data as UserPreferencesDTO;
          }),
          catchError(error => {
            console.error('Failed to record study session:', error);
            return throwError(() => error);
          })
        )
      )
    );
  }

  /** Reset cache when user logs out or changes */
  clearCache(): void {
    this.cache$ = null;
  }

  private defaultPrefs(userId: string): UserPreferencesDTO {
    return {
      id: 0,
      user_id: userId,
      theme: 'light',  // kept for DB compatibility
      onboarding_completed: false,
      current_streak: 0,
      longest_streak: 0,
      last_study_date: null,
      total_sessions: 0,
      total_cards_reviewed: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  }
}
