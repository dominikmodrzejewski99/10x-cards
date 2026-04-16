import { Injectable } from '@angular/core';
import { Observable, from, map, switchMap, catchError, throwError } from 'rxjs';
import { AppError } from '../../shared/utils/app-error';
import { SupabaseClient } from '@supabase/supabase-js';
import { SupabaseClientFactory } from '../infrastructure/supabase-client.factory';
import { CreateFeedbackCommand, FeedbackDTO } from '../../../types';

@Injectable({
  providedIn: 'root'
})
export class FeedbackApiService {
  private supabase: SupabaseClient;

  constructor(private supabaseFactory: SupabaseClientFactory) {
    this.supabase = this.supabaseFactory.getClient();
  }

  private getAuthenticatedUserId(): Observable<string> {
    return from(this.supabase.auth.getSession()).pipe(
      map(response => {
        if (response.error || !response.data.session) {
          throw new AppError(401, 'User not authenticated');
        }
        return response.data.session.user.id;
      })
    );
  }

  submitFeedback(command: CreateFeedbackCommand): Observable<FeedbackDTO> {
    return this.getAuthenticatedUserId().pipe(
      switchMap(userId => {
        return from(
          this.supabase
            .from('feedback')
            .insert({
              user_id: userId,
              type: command.type,
              title: command.title.trim(),
              description: command.description.trim(),
            })
            .select('id, user_id, type, title, description, created_at')
            .single()
        ).pipe(
          map(response => {
            if (response.error) {
              throw new AppError(500, `Save error: ${response.error.message}`);
            }
            return response.data as FeedbackDTO;
          })
        );
      }),
      catchError(error => throwError(() => error))
    );
  }
}
