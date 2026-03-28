import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { ReviewApiService } from './review-api.service';
import { SupabaseClientFactory } from './supabase-client.factory';
import { ConnectivityService } from './connectivity.service';
import { OfflineQueueService } from './offline-queue.service';
import { FlashcardDTO, FlashcardReviewDTO, StudyCardDTO } from '../../types';
import { Sm2Result } from './spaced-repetition.service';

interface MockQueryBuilder {
  select: jasmine.Spy;
  eq: jasmine.Spy;
  order: jasmine.Spy;
  gt: jasmine.Spy;
  limit: jasmine.Spy;
  upsert: jasmine.Spy;
}

interface MockSupabaseClient {
  auth: {
    getSession: jasmine.Spy;
  };
  from: jasmine.Spy;
}

const MOCK_USER_ID = 'user-review-789';

function createMockQueryBuilder(resolvedValue: { data: unknown; error: unknown; count?: number | null }): MockQueryBuilder {
  const builder: MockQueryBuilder = {
    select: jasmine.createSpy('select'),
    eq: jasmine.createSpy('eq'),
    order: jasmine.createSpy('order'),
    gt: jasmine.createSpy('gt'),
    limit: jasmine.createSpy('limit'),
    upsert: jasmine.createSpy('upsert'),
  };

  const chainable: MockQueryBuilder & PromiseLike<{ data: unknown; error: unknown; count?: number | null }> = {
    ...builder,
    then(
      onfulfilled?: ((value: { data: unknown; error: unknown; count?: number | null }) => unknown) | null,
      onrejected?: ((reason: unknown) => unknown) | null
    ): Promise<unknown> {
      return Promise.resolve(resolvedValue).then(onfulfilled, onrejected);
    }
  } as MockQueryBuilder & PromiseLike<{ data: unknown; error: unknown; count?: number | null }>;

  for (const key of Object.keys(builder) as Array<keyof MockQueryBuilder>) {
    (chainable[key] as jasmine.Spy).and.returnValue(chainable);
  }
  return chainable;
}

function makeMockFlashcard(overrides: Partial<FlashcardDTO> = {}): FlashcardDTO {
  return {
    id: 1,
    front: 'Q1',
    back: 'A1',
    front_image_url: null,
    back_audio_url: null,
    front_language: null,
    back_language: null,
    source: 'manual',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    user_id: MOCK_USER_ID,
    generation_id: null,
    set_id: 10,
    position: 0,
    ...overrides
  };
}

function makeMockReview(overrides: Partial<FlashcardReviewDTO> = {}): FlashcardReviewDTO {
  return {
    id: 1,
    flashcard_id: 1,
    user_id: MOCK_USER_ID,
    ease_factor: 2.5,
    interval: 1,
    repetitions: 1,
    next_review_date: '2026-01-01T00:00:00Z',
    last_reviewed_at: '2026-01-01T00:00:00Z',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides
  };
}

describe('ReviewApiService', () => {
  let service: ReviewApiService;
  let mockSupabase: MockSupabaseClient;
  let mockConnectivity: { onlineSignal: ReturnType<typeof signal<boolean>> };
  let mockOfflineQueue: { enqueue: jasmine.Spy; processQueue: jasmine.Spy; pendingCountSignal: ReturnType<typeof signal<number>> };

  beforeEach(() => {
    mockSupabase = {
      auth: {
        getSession: jasmine.createSpy('getSession').and.returnValue(
          Promise.resolve({
            data: { session: { user: { id: MOCK_USER_ID } } },
            error: null
          })
        )
      },
      from: jasmine.createSpy('from')
    };

    mockConnectivity = {
      onlineSignal: signal<boolean>(true)
    };

    mockOfflineQueue = {
      enqueue: jasmine.createSpy('enqueue').and.returnValue(Promise.resolve()),
      processQueue: jasmine.createSpy('processQueue').and.returnValue(Promise.resolve()),
      pendingCountSignal: signal<number>(0)
    };

    TestBed.configureTestingModule({
      providers: [
        ReviewApiService,
        { provide: SupabaseClientFactory, useValue: { getClient: (): MockSupabaseClient => mockSupabase } },
        { provide: ConnectivityService, useValue: mockConnectivity },
        { provide: OfflineQueueService, useValue: mockOfflineQueue }
      ]
    });

    service = TestBed.inject(ReviewApiService);
  });

  describe('getDueCards', () => {
    it('should return cards that are due for review (no review record)', (done: DoneFn) => {
      const rawRows: Array<FlashcardDTO & { flashcard_reviews: FlashcardReviewDTO[] }> = [
        { ...makeMockFlashcard(), flashcard_reviews: [] }
      ];
      const queryBuilder: MockQueryBuilder = createMockQueryBuilder({ data: rawRows, error: null });
      mockSupabase.from.and.returnValue(queryBuilder);

      service.getDueCards().subscribe({
        next: (cards: StudyCardDTO[]) => {
          expect(cards.length).toBe(1);
          expect(cards[0].review).toBeNull();
          expect(cards[0].flashcard.front).toBe('Q1');
          done();
        }
      });
    });

    it('should return cards with past next_review_date', (done: DoneFn) => {
      const pastDate: string = '2020-01-01T00:00:00Z';
      const rawRows: Array<FlashcardDTO & { flashcard_reviews: FlashcardReviewDTO[] }> = [
        { ...makeMockFlashcard(), flashcard_reviews: [makeMockReview({ next_review_date: pastDate })] }
      ];
      const queryBuilder: MockQueryBuilder = createMockQueryBuilder({ data: rawRows, error: null });
      mockSupabase.from.and.returnValue(queryBuilder);

      service.getDueCards().subscribe({
        next: (cards: StudyCardDTO[]) => {
          expect(cards.length).toBe(1);
          expect(cards[0].review).not.toBeNull();
          done();
        }
      });
    });

    it('should filter out cards with future next_review_date', (done: DoneFn) => {
      const futureDate: string = '2099-12-31T00:00:00Z';
      const rawRows: Array<FlashcardDTO & { flashcard_reviews: FlashcardReviewDTO[] }> = [
        { ...makeMockFlashcard(), flashcard_reviews: [makeMockReview({ next_review_date: futureDate })] }
      ];
      const queryBuilder: MockQueryBuilder = createMockQueryBuilder({ data: rawRows, error: null });
      mockSupabase.from.and.returnValue(queryBuilder);

      service.getDueCards().subscribe({
        next: (cards: StudyCardDTO[]) => {
          expect(cards.length).toBe(0);
          done();
        }
      });
    });

    it('should filter by setId when provided', (done: DoneFn) => {
      const queryBuilder: MockQueryBuilder = createMockQueryBuilder({ data: [], error: null });
      mockSupabase.from.and.returnValue(queryBuilder);

      service.getDueCards(5).subscribe({
        next: () => {
          expect(queryBuilder.eq).toHaveBeenCalledWith('set_id', 5);
          done();
        }
      });
    });

    it('should throw error when user is not authenticated', (done: DoneFn) => {
      mockSupabase.auth.getSession.and.returnValue(
        Promise.resolve({ data: { session: null }, error: null })
      );

      service.getDueCards().subscribe({
        error: (err: Error) => {
          expect(err.message).toContain('nie jest zalogowany');
          done();
        }
      });
    });

    it('should throw on Supabase error', (done: DoneFn) => {
      const queryBuilder: MockQueryBuilder = createMockQueryBuilder({
        data: null,
        error: { message: 'Query failed' }
      });
      mockSupabase.from.and.returnValue(queryBuilder);

      service.getDueCards().subscribe({
        error: (err: Error) => {
          expect(err.message).toContain('Query failed');
          done();
        }
      });
    });
  });

  describe('saveReview', () => {
    const sm2Result: Sm2Result = {
      ease_factor: 2.6,
      interval: 6,
      repetitions: 2,
      next_review_date: '2026-01-07T00:00:00Z'
    };

    it('should save a review and return the result when online', (done: DoneFn) => {
      const savedReview: FlashcardReviewDTO = makeMockReview({ interval: 6, repetitions: 2 });
      const queryBuilder: MockQueryBuilder = createMockQueryBuilder({ data: [savedReview], error: null });
      mockSupabase.from.and.returnValue(queryBuilder);

      service.saveReview(1, sm2Result).subscribe({
        next: (result: FlashcardReviewDTO) => {
          expect(result.interval).toBe(6);
          expect(result.repetitions).toBe(2);
          expect(mockSupabase.from).toHaveBeenCalledWith('flashcard_reviews');
          expect(queryBuilder.upsert).toHaveBeenCalled();
          expect(mockOfflineQueue.enqueue).not.toHaveBeenCalled();
          done();
        }
      });
    });

    it('should enqueue to offline queue when already offline', (done: DoneFn) => {
      mockConnectivity.onlineSignal.set(false);

      service.saveReview(1, sm2Result).subscribe({
        next: (result: FlashcardReviewDTO) => {
          expect(result.id).toBe(-1);
          expect(result.flashcard_id).toBe(1);
          expect(result.ease_factor).toBe(2.6);
          expect(mockOfflineQueue.enqueue).toHaveBeenCalledWith(1, MOCK_USER_ID, sm2Result);
          expect(mockSupabase.from).not.toHaveBeenCalled();
          done();
        }
      });
    });

    it('should fall back to offline queue on network error', (done: DoneFn) => {
      const queryBuilder: MockQueryBuilder = createMockQueryBuilder({
        data: null,
        error: { message: 'Network error' }
      });
      mockSupabase.from.and.returnValue(queryBuilder);

      service.saveReview(1, sm2Result).subscribe({
        next: (result: FlashcardReviewDTO) => {
          expect(result.id).toBe(-1);
          expect(mockOfflineQueue.enqueue).toHaveBeenCalledWith(1, MOCK_USER_ID, sm2Result);
          done();
        }
      });
    });

    it('should throw when no data returned after upsert', (done: DoneFn) => {
      const queryBuilder: MockQueryBuilder = createMockQueryBuilder({ data: [], error: null });
      mockSupabase.from.and.returnValue(queryBuilder);

      service.saveReview(1, sm2Result).subscribe({
        next: (result: FlashcardReviewDTO) => {
          // Falls back to offline queue because the "no data" error triggers catchError
          expect(result.id).toBe(-1);
          expect(mockOfflineQueue.enqueue).toHaveBeenCalled();
          done();
        }
      });
    });

    it('should throw when user is not authenticated', (done: DoneFn) => {
      mockSupabase.auth.getSession.and.returnValue(
        Promise.resolve({ data: { session: null }, error: null })
      );

      service.saveReview(1, sm2Result).subscribe({
        error: (err: Error) => {
          expect(err.message).toContain('nie jest zalogowany');
          done();
        }
      });
    });
  });

  describe('getNextReviewDate', () => {
    it('should return the next review date', (done: DoneFn) => {
      const futureDate: string = '2026-03-25T10:00:00Z';
      const queryBuilder: MockQueryBuilder = createMockQueryBuilder({
        data: [{ next_review_date: futureDate }],
        error: null
      });
      mockSupabase.from.and.returnValue(queryBuilder);

      service.getNextReviewDate().subscribe({
        next: (date: string | null) => {
          expect(date).toBe(futureDate);
          done();
        }
      });
    });

    it('should return null when no upcoming reviews', (done: DoneFn) => {
      const queryBuilder: MockQueryBuilder = createMockQueryBuilder({ data: [], error: null });
      mockSupabase.from.and.returnValue(queryBuilder);

      service.getNextReviewDate().subscribe({
        next: (date: string | null) => {
          expect(date).toBeNull();
          done();
        }
      });
    });

    it('should return null when user is not authenticated', (done: DoneFn) => {
      mockSupabase.auth.getSession.and.returnValue(
        Promise.resolve({ data: { session: null }, error: null })
      );

      service.getNextReviewDate().subscribe({
        next: (date: string | null) => {
          expect(date).toBeNull();
          done();
        }
      });
    });

    it('should return null on Supabase error', (done: DoneFn) => {
      const queryBuilder: MockQueryBuilder = createMockQueryBuilder({
        data: null,
        error: { message: 'Error' }
      });
      mockSupabase.from.and.returnValue(queryBuilder);

      service.getNextReviewDate().subscribe({
        next: (date: string | null) => {
          expect(date).toBeNull();
          done();
        }
      });
    });
  });
});
