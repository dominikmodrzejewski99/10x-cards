import { Injectable, inject } from '@angular/core';
import { Observable, from, map, switchMap, throwError, catchError, of } from 'rxjs';
import { SupabaseClient } from '@supabase/supabase-js';
import { SupabaseClientFactory } from './supabase-client.factory';
import { FlashcardDTO, FlashcardReviewDTO, StudyCardDTO } from '../../types';
import { Sm2Result } from './spaced-repetition.service';

@Injectable({
  providedIn: 'root'
})
export class ReviewApiService {
  private supabase: SupabaseClient = inject(SupabaseClientFactory).getClient();

  public getDueCards(): Observable<StudyCardDTO[]> {
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
            .order('created_at', { ascending: true })
        ).pipe(
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
            console.error('Błąd podczas pobierania kart do powtórki:', error);
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
          }),
          catchError((error: unknown) => {
            console.error('Błąd podczas zapisywania recenzji:', error);
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
