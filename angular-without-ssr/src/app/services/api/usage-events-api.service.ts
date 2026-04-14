import { Injectable, inject } from '@angular/core';
import { Observable, from, map, of, catchError } from 'rxjs';
import { SupabaseClient } from '@supabase/supabase-js';
import { SupabaseClientFactory } from '../infrastructure/supabase-client.factory';
import { LoggerService } from '../infrastructure/logger.service';

/**
 * Records usage events for the partner program. One saved review =
 * one call to record_usage_event. Attribution (author_id, set_id) is
 * resolved server-side; the client cannot forge them.
 *
 * Fire-and-forget: failures never block the study flow. A missed event
 * is acceptable (partner loses 1 grosz); a broken learning session is not.
 */
@Injectable({ providedIn: 'root' })
export class UsageEventsApiService {
  private supabase: SupabaseClient = inject(SupabaseClientFactory).getClient();
  private logger: LoggerService = inject(LoggerService);

  public recordReview(flashcardId: number, sessionId: string | null): Observable<number | null> {
    return from(
      this.supabase.rpc('record_usage_event', {
        p_flashcard_id: flashcardId,
        p_client_session_id: sessionId
      })
    ).pipe(
      map((response: { data: unknown; error: unknown }) => {
        if (response.error) {
          this.logger.warn('UsageEventsApiService.recordReview', 'RPC returned error, event lost');
          return null;
        }
        return response.data as number | null;
      }),
      catchError((error: unknown) => {
        this.logger.warn('UsageEventsApiService.recordReview', 'Network error, event lost');
        return of(null);
      })
    );
  }
}
