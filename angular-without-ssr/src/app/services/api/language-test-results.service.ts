import { Injectable, inject } from '@angular/core';
import { Observable, from, switchMap, map, catchError, throwError } from 'rxjs';
import { SupabaseClient } from '@supabase/supabase-js';
import { SupabaseClientFactory } from '../infrastructure/supabase-client.factory';
import { LanguageTestResultDTO, TestLevel, CategoryBreakdown, WrongAnswer } from '../../../types';

@Injectable({
  providedIn: 'root'
})
export class LanguageTestResultsService {
  private supabase: SupabaseClient = inject(SupabaseClientFactory).getClient();

  private getCurrentUserId(): Observable<string> {
    return from(this.supabase.auth.getSession()).pipe(
      map(response => {
        if (response.error || !response.data.session?.user?.id) {
          throw new Error('User not authenticated');
        }
        return response.data.session.user.id;
      })
    );
  }

  saveResult(data: {
    level: TestLevel;
    totalScore: number;
    maxScore: number;
    percentage: number;
    categoryBreakdown: CategoryBreakdown;
    wrongAnswers: WrongAnswer[];
  }): Observable<LanguageTestResultDTO> {
    return this.getCurrentUserId().pipe(
      switchMap(userId =>
        from(
          this.supabase
            .from('language_test_results')
            .insert({
              user_id: userId,
              level: data.level,
              total_score: data.totalScore,
              max_score: data.maxScore,
              percentage: data.percentage,
              category_breakdown: data.categoryBreakdown,
              wrong_answers: data.wrongAnswers,
              completed_at: new Date().toISOString(),
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .select()
            .single()
        ).pipe(
          map(response => {
            if (response.error) throw new Error(response.error.message);
            return response.data as LanguageTestResultDTO;
          })
        )
      ),
      catchError(error => throwError(() => error))
    );
  }

  getLatestResult(level?: TestLevel): Observable<LanguageTestResultDTO | null> {
    return this.getCurrentUserId().pipe(
      switchMap(userId => {
        let query = this.supabase
          .from('language_test_results')
          .select('*')
          .eq('user_id', userId)
          .order('completed_at', { ascending: false })
          .limit(1);

        if (level) {
          query = query.eq('level', level);
        }

        return from(query).pipe(
          map(response => {
            if (response.error) throw new Error(response.error.message);
            return response.data.length > 0 ? response.data[0] as LanguageTestResultDTO : null;
          })
        );
      }),
      catchError(error => throwError(() => error))
    );
  }

  updateGeneratedSetId(resultId: number, setId: number): Observable<void> {
    return from(
      this.supabase
        .from('language_test_results')
        .update({ generated_set_id: setId, updated_at: new Date().toISOString() })
        .eq('id', resultId)
    ).pipe(
      map(response => {
        if (response.error) throw new Error(response.error.message);
      }),
      catchError(error => throwError(() => error))
    );
  }
}
