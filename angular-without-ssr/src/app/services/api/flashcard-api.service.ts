import { Injectable } from '@angular/core';
import { Observable, from, map, catchError, throwError, switchMap, of, expand, reduce, forkJoin, EMPTY } from 'rxjs';
import { AppError } from '../../shared/utils/app-error';
import { FlashcardProposalDTO, FlashcardDTO, CreateFlashcardCommand, UpdateFlashcardCommand } from '../../../types';
import { SupabaseClient } from '@supabase/supabase-js';
import { SupabaseClientFactory } from '../infrastructure/supabase-client.factory';

const FLASHCARD_COLUMNS = 'id, front, back, front_image_url, back_audio_url, front_language, back_language, source, position, set_id, generation_id, user_id, created_at, updated_at';
const ALLOWED_SORT_FIELDS = ['front', 'back', 'created_at', 'updated_at', 'source', 'id', 'position'];

function sanitizeSearchParam(search: string): string {
  return search.replace(/[,()\\]/g, '');
}

@Injectable({
  providedIn: 'root'
})
export class FlashcardApiService {
  private supabase: SupabaseClient;

  constructor(private supabaseFactory: SupabaseClientFactory) {
    this.supabase = this.supabaseFactory.getClient();
  }

  /**
   * Pobiera user ID z lokalnej sesji (synchroniczny odczyt z pamięci, nie HTTP).
   * Zwraca null gdy brak sesji.
   */
  private getAuthenticatedUserId(): Observable<string> {
    return from(this.supabase.auth.getSession()).pipe(
      map(response => {
        if (response.error || !response.data.session) {
          throw new AppError(401, 'User not authenticated');
        }
        return response.data.session.user.id;
      }),
      catchError(() => throwError(() => new AppError(401, 'Session expired')))
    );
  }

  createFlashcards(flashcards: FlashcardProposalDTO[], setId: number): Observable<FlashcardDTO[]> {
    return this.getAuthenticatedUserId().pipe(
      switchMap(userId => {
        const flashcardsToInsert = flashcards.map(proposal => ({
          front: proposal.front,
          back: proposal.back,
          source: proposal.source,
          user_id: userId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          set_id: setId
        }));

        return from(this.supabase.rpc('create_user_and_flashcards', {
          user_id: userId,
          flashcards: flashcardsToInsert
        })).pipe(
          switchMap(response => {
            if (response.error) {
              if (response.error.message.includes('does not exist')) {
                return from(this.supabase.from('flashcards').insert(flashcardsToInsert).select(FLASHCARD_COLUMNS));
              }
              throw response.error;
            }
            if (response.data) {
              return of(response);
            }
            return from(this.supabase.from('flashcards').select(FLASHCARD_COLUMNS)
              .eq('user_id', userId).order('created_at', { ascending: false }).limit(flashcardsToInsert.length));
          }),
          map(response => {
            if (response.error) throw new AppError(500, `Supabase error: ${response.error.message}`);
            return response.data as FlashcardDTO[];
          }),
          catchError(error => throwError(() => error))
        );
      })
    );
  }

  getFlashcards(params: {
    limit: number;
    offset: number;
    search?: string;
    sortField?: string;
    sortOrder?: number;
    setId?: number | null;
  }): Observable<{ flashcards: FlashcardDTO[]; totalRecords: number }> {
    return this.getAuthenticatedUserId().pipe(
      switchMap(userId => {
        let query = this.supabase
          .from('flashcards')
          .select(FLASHCARD_COLUMNS, { count: 'exact' })
          .eq('user_id', userId)
          .range(params.offset, params.offset + params.limit - 1);

        if (params.setId != null) {
          query = query.eq('set_id', params.setId);
        }

        if (params.search) {
          const safeSearch = sanitizeSearchParam(params.search);
          query = query.or(`front.ilike.%${safeSearch}%,back.ilike.%${safeSearch}%`);
        }

        if (params.sortField && ALLOWED_SORT_FIELDS.includes(params.sortField)) {
          query = query.order(params.sortField, { ascending: params.sortOrder !== -1 });
        }

        return from(query).pipe(
          map(response => {
            if (response.error) throw new AppError(500, `Supabase error: ${response.error.message}`);
            return {
              flashcards: response.data as FlashcardDTO[],
              totalRecords: response.count || 0
            };
          }),
          catchError(error => throwError(() => error))
        );
      })
    );
  }

  /**
   * Pobiera wszystkie fiszki z zestawu, automatycznie paginując w partiach.
   */
  getAllFlashcardsForSet(setId: number): Observable<FlashcardDTO[]> {
    const PAGE_SIZE: number = 500;
    let currentOffset: number = 0;

    return this.getFlashcards({ limit: PAGE_SIZE, offset: 0, setId }).pipe(
      expand((response) => {
        currentOffset += response.flashcards.length;

        if (response.flashcards.length < PAGE_SIZE) {
          return EMPTY;
        }

        return this.getFlashcards({ limit: PAGE_SIZE, offset: currentOffset, setId });
      }),
      reduce((acc: FlashcardDTO[], response) => [...acc, ...response.flashcards], [] as FlashcardDTO[])
    );
  }

  createFlashcard(data: CreateFlashcardCommand): Observable<FlashcardDTO> {
    return this.getAuthenticatedUserId().pipe(
      switchMap(userId => {
        const flashcardToInsert = {
          front: data.front,
          back: data.back,
          front_image_url: data.front_image_url || null,
          back_audio_url: data.back_audio_url || null,
          front_language: data.front_language || null,
          back_language: data.back_language || null,
          source: data.source || 'manual',
          user_id: userId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          generation_id: data.generation_id || null,
          set_id: data.set_id
        };

        return from(this.supabase.rpc('create_user_and_flashcard', {
          user_id: userId,
          flashcard: flashcardToInsert
        })).pipe(
          switchMap(response => {
            if (response.error) {
              if (response.error.message.includes('does not exist')) {
                return from(this.supabase.from('flashcards').insert(flashcardToInsert).select(FLASHCARD_COLUMNS));
              }
              throw response.error;
            }
            if (response.data) {
              return of(response);
            }
            return from(this.supabase.from('flashcards').select(FLASHCARD_COLUMNS)
              .eq('user_id', userId).order('created_at', { ascending: false }).limit(1));
          }),
          map(response => {
            if (response.error) throw new AppError(500, `Supabase error: ${response.error.message}`);
            if (!response.data || response.data.length === 0) {
              throw new AppError(404, 'Flashcard not found');
            }
            return response.data[0] as FlashcardDTO;
          }),
          catchError(error => throwError(() => error))
        );
      })
    );
  }

  updateFlashcard(id: number, data: UpdateFlashcardCommand): Observable<FlashcardDTO> {
    return this.getAuthenticatedUserId().pipe(
      switchMap(userId => {
        const updates = { ...data, updated_at: new Date().toISOString() };

        return from(this.supabase
          .from('flashcards')
          .update(updates)
          .eq('id', id)
          .eq('user_id', userId)
          .select(FLASHCARD_COLUMNS)
        ).pipe(
          map(response => {
            if (response.error) throw new AppError(500, `Supabase error: ${response.error.message}`);
            if (response.data.length === 0) throw new AppError(404, 'Flashcard not found or no edit permission');
            return response.data[0] as FlashcardDTO;
          }),
          catchError(error => throwError(() => error))
        );
      })
    );
  }

  deleteFlashcard(id: number): Observable<void> {
    return this.getAuthenticatedUserId().pipe(
      switchMap(userId =>
        from(this.supabase
          .from('flashcards')
          .delete()
          .eq('id', id)
          .eq('user_id', userId)
        ).pipe(
          map(response => {
            if (response.error) throw new AppError(500, `Supabase error: ${response.error.message}`);
            return undefined;
          }),
          catchError(error => throwError(() => error))
        )
      )
    );
  }

  reorderFlashcards(updates: { id: number; position: number }[]): Observable<void> {
    return this.getAuthenticatedUserId().pipe(
      switchMap(userId => {
        const updateObservables = updates.map(item =>
          from(this.supabase
            .from('flashcards')
            .update({ position: item.position, updated_at: new Date().toISOString() })
            .eq('id', item.id)
            .eq('user_id', userId)
          ).pipe(
            map(response => {
              if (response.error) throw new AppError(500, `Supabase error: ${response.error.message}`);
            })
          )
        );
        return forkJoin(updateObservables).pipe(
          map(() => undefined),
          catchError(error => throwError(() => error))
        );
      })
    );
  }
}
