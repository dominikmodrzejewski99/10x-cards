import { Injectable, inject } from '@angular/core';
import { Observable, from, map, switchMap, throwError, catchError, of } from 'rxjs';
import { SupabaseClient } from '@supabase/supabase-js';
import { SupabaseClientFactory } from './supabase-client.factory';
import { ConnectivityService } from './connectivity.service';
import { OfflineQueueService } from './offline-queue.service';
import { LoggerService } from './logger.service';
import { FlashcardDTO, FlashcardReviewDTO, StudyCardDTO } from '../../types';
import { Sm2Result } from './spaced-repetition.service';

@Injectable({
  providedIn: 'root'
})
export class ReviewApiService {
  private supabase: SupabaseClient = inject(SupabaseClientFactory).getClient();
  private connectivity: ConnectivityService = inject(ConnectivityService);
  private offlineQueue: OfflineQueueService = inject(OfflineQueueService);
  private logger: LoggerService = inject(LoggerService);

  public getDueCards(setId?: number | null): Observable<StudyCardDTO[]> {
    return this.getCurrentUserId().pipe(
      switchMap((userId: string | null) => {
        if (!userId) {
          return throwError(() => new Error('Użytkownik nie jest zalogowany'));
        }

        let query = this.supabase
          .from('flashcards')
          .select(`
            *,
            flashcard_reviews!left(
              id,
              ease_factor,
              interval,
              repetitions,
              next_review_date,
              last_reviewed_at,
              created_at,
              updated_at,
              user_id,
              flashcard_id
            )
          `)
          .eq('user_id', userId)
          .order('created_at', { ascending: true });

        if (setId) {
          query = query.eq('set_id', setId);
        }

        return from(query).pipe(
          map((response: { data: unknown; error: unknown }) => {
            if (response.error) {
              throw new Error(`Błąd Supabase: ${(response.error as { message: string }).message}`);
            }

            const now: Date = new Date();
            const rows: Array<FlashcardDTO & { flashcard_reviews: FlashcardReviewDTO[] }> =
              (response.data ?? []) as Array<FlashcardDTO & { flashcard_reviews: FlashcardReviewDTO[] }>;

            return rows
              .map((row: FlashcardDTO & { flashcard_reviews: FlashcardReviewDTO[] }): StudyCardDTO => {
                const { flashcard_reviews, ...flashcard } = row;
                const review: FlashcardReviewDTO | null =
                  flashcard_reviews && flashcard_reviews.length > 0 ? flashcard_reviews[0] : null;
                return { flashcard, review };
              })
              .filter((card: StudyCardDTO): boolean => {
                if (!card.review) return true;
                return new Date(card.review.next_review_date) <= now;
              });
          }),
          catchError((error: unknown) => {
            this.logger.error('ReviewApiService.getDueCards', error);
            return throwError(() => error);
          })
        );
      })
    );
  }

  public saveReview(flashcardId: number, reviewData: Sm2Result): Observable<FlashcardReviewDTO> {
    return this.getCurrentUserId().pipe(
      switchMap((userId: string | null) => {
        if (!userId) {
          return throwError(() => new Error('Użytkownik nie jest zalogowany'));
        }

        // If already offline, skip network call and queue immediately
        if (!this.connectivity.onlineSignal()) {
          return from(this.offlineQueue.enqueue(flashcardId, userId, reviewData)).pipe(
            map(() => this.buildSyntheticReview(flashcardId, userId, reviewData))
          );
        }

        // Try network, fall back to queue on failure
        return this.doSupabaseUpsert(flashcardId, userId, reviewData).pipe(
          catchError((error: unknown) => {
            this.logger.warn('ReviewApiService.saveReview', 'Sieć niedostępna, zapisuję w kolejce offline');
            return from(this.offlineQueue.enqueue(flashcardId, userId, reviewData)).pipe(
              map(() => this.buildSyntheticReview(flashcardId, userId, reviewData))
            );
          })
        );
      })
    );
  }

  /**
   * Returns all user cards with their review data (unfiltered).
   * Used by dashboard to compute real card status breakdown.
   */
  public getAllCardsWithReviews(): Observable<StudyCardDTO[]> {
    return this.getCurrentUserId().pipe(
      switchMap((userId: string | null) => {
        if (!userId) {
          return throwError(() => new Error('Użytkownik nie jest zalogowany'));
        }

        return from(
          this.supabase
            .from('flashcards')
            .select(`
              *,
              flashcard_reviews!left(
                id, ease_factor, interval, repetitions,
                next_review_date, last_reviewed_at,
                created_at, updated_at, user_id, flashcard_id
              )
            `)
            .eq('user_id', userId)
        ).pipe(
          map((response: { data: unknown; error: unknown }) => {
            if (response.error) {
              throw new Error(`Błąd Supabase: ${(response.error as { message: string }).message}`);
            }

            const rows = (response.data ?? []) as Array<FlashcardDTO & { flashcard_reviews: FlashcardReviewDTO[] }>;

            return rows.map((row): StudyCardDTO => {
              const { flashcard_reviews, ...flashcard } = row;
              const review = flashcard_reviews?.length > 0 ? flashcard_reviews[0] : null;
              return { flashcard, review };
            });
          }),
          catchError((error: unknown) => {
            this.logger.error('ReviewApiService.getAllCardsWithReviews', error);
            return throwError(() => error);
          })
        );
      })
    );
  }

  public getNextReviewDate(): Observable<string | null> {
    return this.getCurrentUserId().pipe(
      switchMap((userId: string | null) => {
        if (!userId) {
          return of(null);
        }

        return from(
          this.supabase
            .from('flashcard_reviews')
            .select('next_review_date')
            .eq('user_id', userId)
            .gt('next_review_date', new Date().toISOString())
            .order('next_review_date', { ascending: true })
            .limit(1)
        ).pipe(
          map((response: { data: unknown; error: unknown }) => {
            if (response.error) return null;
            const data: Array<{ next_review_date: string }> =
              response.data as Array<{ next_review_date: string }>;
            return data.length > 0 ? data[0].next_review_date : null;
          }),
          catchError(() => of(null))
        );
      })
    );
  }

  private doSupabaseUpsert(flashcardId: number, userId: string, reviewData: Sm2Result): Observable<FlashcardReviewDTO> {
    const upsertData: Record<string, unknown> = {
      flashcard_id: flashcardId,
      user_id: userId,
      ease_factor: reviewData.ease_factor,
      interval: reviewData.interval,
      repetitions: reviewData.repetitions,
      next_review_date: reviewData.next_review_date,
      last_reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    return from(
      this.supabase
        .from('flashcard_reviews')
        .upsert(upsertData, { onConflict: 'flashcard_id,user_id' })
        .select()
    ).pipe(
      map((response: { data: unknown; error: unknown }) => {
        if (response.error) {
          throw new Error(`Błąd Supabase: ${(response.error as { message: string }).message}`);
        }
        const data: FlashcardReviewDTO[] = (response.data ?? []) as FlashcardReviewDTO[];
        if (!data[0]) {
          throw new Error('Brak zwróconych danych po zapisie recenzji');
        }
        return data[0];
      })
    );
  }

  private buildSyntheticReview(flashcardId: number, userId: string, reviewData: Sm2Result): FlashcardReviewDTO {
    const now: string = new Date().toISOString();
    return {
      id: -1,
      flashcard_id: flashcardId,
      user_id: userId,
      ease_factor: reviewData.ease_factor,
      interval: reviewData.interval,
      repetitions: reviewData.repetitions,
      next_review_date: reviewData.next_review_date,
      last_reviewed_at: now,
      created_at: now,
      updated_at: now
    };
  }

  private getCurrentUserId(): Observable<string | null> {
    return from(this.supabase.auth.getSession()).pipe(
      map((response: { data: { session: { user: { id: string } } | null }; error: unknown }) => {
        if (response.error) return null;
        return response.data.session?.user?.id || null;
      }),
      catchError(() => of(null))
    );
  }
}
