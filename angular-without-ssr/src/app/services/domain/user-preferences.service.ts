import { Injectable, inject } from '@angular/core';
import { Observable, from, map, switchMap, throwError, catchError, of, shareReplay } from 'rxjs';
import { AppError } from '../../shared/utils/app-error';
import { SupabaseClient } from '@supabase/supabase-js';
import { SupabaseClientFactory } from '../infrastructure/supabase-client.factory';
import { LoggerService } from '../infrastructure/logger.service';
import { UserPreferencesDTO } from '../../../types';

@Injectable({ providedIn: 'root' })
export class UserPreferencesService {
  private supabase: SupabaseClient = inject(SupabaseClientFactory).getClient();
  private logger: LoggerService = inject(LoggerService);
  private cache$: Observable<UserPreferencesDTO> | null = null;

  private getCurrentUserId(): Observable<string> {
    return from(this.supabase.auth.getSession()).pipe(
      map(response => {
        const userId = response.data.session?.user?.id;
        if (!userId) throw new AppError(401, 'User not authenticated');
        return userId;
      })
    );
  }

  getPreferences(): Observable<UserPreferencesDTO> {
    if (this.cache$) return this.cache$;

    this.cache$ = this.getCurrentUserId().pipe(
      switchMap(userId =>
        from(
          this.supabase
            .from('user_preferences')
            .select('*')
            .eq('user_id', userId)
            .maybeSingle()
        ).pipe(
          switchMap(response => {
            if (response.error || !response.data) {
              return of(this.defaultPrefs(userId));
            }
            return of(response.data as UserPreferencesDTO);
          })
        )
      ),
      shareReplay(1)
    );

    return this.cache$;
  }

  updatePreferences(updates: Partial<Pick<UserPreferencesDTO,
  | 'theme'
  | 'language'
  | 'onboarding_completed'
  | 'pomodoro_work_duration'
  | 'pomodoro_break_duration'
  | 'pomodoro_long_break_duration'
  | 'pomodoro_sessions_before_long_break'
  | 'pomodoro_sound_enabled'
  | 'pomodoro_notifications_enabled'
  | 'pomodoro_focus_reminder_dismissed'
  | 'dismissed_dialogs'
>>): Observable<UserPreferencesDTO> {
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
            this.logger.error('UserPreferencesService.updatePreferences', error);
            if (error.message?.includes('foreign key constraint')) {
              return of(this.defaultPrefs(userId));
            }
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
            this.logger.error('UserPreferencesService.recordStudySession', error);
            return throwError(() => error);
          })
        )
      )
    );
  }

  isDialogDismissed(dialogKey: string): Observable<boolean> {
    return this.getPreferences().pipe(
      map(prefs => (prefs.dismissed_dialogs ?? []).includes(dialogKey))
    );
  }

  dismissDialog(dialogKey: string): Observable<UserPreferencesDTO> {
    return this.getPreferences().pipe(
      switchMap(prefs => {
        const current = prefs.dismissed_dialogs ?? [];
        if (current.includes(dialogKey)) return of(prefs);
        return this.updatePreferences({ dismissed_dialogs: [...current, dialogKey] });
      })
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
      theme: 'light',
      language: 'pl',
      onboarding_completed: false,
      current_streak: 0,
      longest_streak: 0,
      last_study_date: null,
      total_sessions: 0,
      total_cards_reviewed: 0,
      pomodoro_work_duration: 25,
      pomodoro_break_duration: 5,
      pomodoro_long_break_duration: 15,
      pomodoro_sessions_before_long_break: 4,
      pomodoro_sound_enabled: true,
      pomodoro_notifications_enabled: true,
      pomodoro_focus_reminder_dismissed: false,
      dismissed_dialogs: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  }
}
