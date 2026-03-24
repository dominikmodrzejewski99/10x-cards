import { Injectable, inject } from '@angular/core';
import { Observable, from, map, catchError, throwError, switchMap } from 'rxjs';
import { FlashcardSetDTO, CreateFlashcardSetCommand, UpdateFlashcardSetCommand } from '../../types';
import { SupabaseClient } from '@supabase/supabase-js';
import { SupabaseClientFactory } from './supabase-client.factory';

@Injectable({
  providedIn: 'root'
})
export class FlashcardSetApiService {
  private supabase: SupabaseClient = inject(SupabaseClientFactory).getClient();

  private getCurrentUserId(): Observable<string> {
    return from(this.supabase.auth.getSession()).pipe(
      map(response => {
        const userId = response.data.session?.user?.id;
        if (!userId) throw new Error('Użytkownik nie jest zalogowany');
        return userId;
      })
    );
  }

  getSets(): Observable<FlashcardSetDTO[]> {
    return this.getCurrentUserId().pipe(
      switchMap(userId =>
        from(
          this.supabase
            .from('flashcard_sets')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
        ).pipe(
          map(response => {
            if (response.error) throw new Error(response.error.message);
            return response.data as FlashcardSetDTO[];
          })
        )
      ),
      catchError(error => throwError(() => error))
    );
  }

  getSet(id: number): Observable<FlashcardSetDTO> {
    return this.getCurrentUserId().pipe(
      switchMap(userId =>
        from(
          this.supabase
            .from('flashcard_sets')
            .select('*')
            .eq('id', id)
            .eq('user_id', userId)
            .single()
        ).pipe(
          map(response => {
            if (response.error) throw new Error(response.error.message);
            return response.data as FlashcardSetDTO;
          })
        )
      ),
      catchError(error => throwError(() => error))
    );
  }

  createSet(data: CreateFlashcardSetCommand): Observable<FlashcardSetDTO> {
    return this.getCurrentUserId().pipe(
      switchMap(userId =>
        from(
          this.supabase
            .from('flashcard_sets')
            .insert({
              name: data.name,
              description: data.description ?? null,
              user_id: userId,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .select()
            .single()
        ).pipe(
          map(response => {
            if (response.error) throw new Error(response.error.message);
            return response.data as FlashcardSetDTO;
          })
        )
      ),
      catchError(error => throwError(() => error))
    );
  }

  updateSet(id: number, data: UpdateFlashcardSetCommand): Observable<FlashcardSetDTO> {
    return this.getCurrentUserId().pipe(
      switchMap(userId =>
        from(
          this.supabase
            .from('flashcard_sets')
            .update({ ...data, updated_at: new Date().toISOString() })
            .eq('id', id)
            .eq('user_id', userId)
            .select()
            .single()
        ).pipe(
          map(response => {
            if (response.error) throw new Error(response.error.message);
            return response.data as FlashcardSetDTO;
          })
        )
      ),
      catchError(error => throwError(() => error))
    );
  }

  deleteSet(id: number): Observable<void> {
    return this.getCurrentUserId().pipe(
      switchMap(userId =>
        from(
          this.supabase
            .from('flashcard_sets')
            .delete()
            .eq('id', id)
            .eq('user_id', userId)
        ).pipe(
          map(response => {
            if (response.error) throw new Error(response.error.message);
          })
        )
      ),
      catchError(error => throwError(() => error))
    );
  }

  getSetsWithCardCount(): Observable<{ set: FlashcardSetDTO; cardCount: number }[]> {
    return this.getCurrentUserId().pipe(
      switchMap(userId =>
        from(
          this.supabase
            .from('flashcard_sets')
            .select('*, flashcards(count)')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
        ).pipe(
          map(response => {
            if (response.error) throw new Error(response.error.message);
            interface SetWithCount extends FlashcardSetDTO {
              flashcards: { count: number }[];
            }
            return (response.data as SetWithCount[]).map((row: SetWithCount) => ({
              set: { id: row.id, name: row.name, description: row.description, user_id: row.user_id, created_at: row.created_at, updated_at: row.updated_at } as FlashcardSetDTO,
              cardCount: row.flashcards?.[0]?.count ?? 0
            }));
          })
        )
      ),
      catchError(error => throwError(() => error))
    );
  }

  getSetCardCount(setId: number): Observable<number> {
    return this.getCurrentUserId().pipe(
      switchMap(userId =>
        from(
          this.supabase
            .from('flashcards')
            .select('*', { count: 'exact', head: true })
            .eq('set_id', setId)
            .eq('user_id', userId)
        ).pipe(
          map(response => {
            if (response.error) throw new Error(response.error.message);
            return response.count ?? 0;
          })
        )
      ),
      catchError(error => throwError(() => error))
    );
  }
}
