import { TestBed } from '@angular/core/testing';
import { FlashcardApiService } from './flashcard-api.service';
import { SupabaseClientFactory } from '../infrastructure/supabase-client.factory';
import { FlashcardDTO, CreateFlashcardCommand, UpdateFlashcardCommand, FlashcardProposalDTO } from '../../../types';

interface MockQueryBuilder {
  select: jasmine.Spy;
  insert: jasmine.Spy;
  update: jasmine.Spy;
  delete: jasmine.Spy;
  eq: jasmine.Spy;
  or: jasmine.Spy;
  order: jasmine.Spy;
  range: jasmine.Spy;
  limit: jasmine.Spy;
}

interface MockSupabaseClient {
  auth: {
    getSession: jasmine.Spy;
  };
  from: jasmine.Spy;
  rpc: jasmine.Spy;
}

function createMockQueryBuilder(resolvedValue: { data: unknown; error: unknown; count?: number }): MockQueryBuilder {
  const builder: MockQueryBuilder = {
    select: jasmine.createSpy('select'),
    insert: jasmine.createSpy('insert'),
    update: jasmine.createSpy('update'),
    delete: jasmine.createSpy('delete'),
    eq: jasmine.createSpy('eq'),
    or: jasmine.createSpy('or'),
    order: jasmine.createSpy('order'),
    range: jasmine.createSpy('range'),
    limit: jasmine.createSpy('limit'),
  };
  // Each method returns the builder itself (chainable), but also acts as a thenable
  const chainable: MockQueryBuilder & PromiseLike<{ data: unknown; error: unknown; count?: number }> = {
    ...builder,
    then(
      onfulfilled?: ((value: { data: unknown; error: unknown; count?: number }) => unknown) | null,
      onrejected?: ((reason: unknown) => unknown) | null
    ): Promise<unknown> {
      return Promise.resolve(resolvedValue).then(onfulfilled, onrejected);
    }
  } as MockQueryBuilder & PromiseLike<{ data: unknown; error: unknown; count?: number }>;

  for (const key of Object.keys(builder) as Array<keyof MockQueryBuilder>) {
    (chainable[key] as jasmine.Spy).and.returnValue(chainable);
  }
  return chainable;
}

const MOCK_USER_ID = 'user-abc-123';

function createAuthenticatedSession(): Promise<{ data: { session: { user: { id: string } } }; error: null }> {
  return Promise.resolve({
    data: { session: { user: { id: MOCK_USER_ID } } },
    error: null
  });
}

function createUnauthenticatedSession(): Promise<{ data: { session: null }; error: null }> {
  return Promise.resolve({ data: { session: null }, error: null });
}

function makeMockFlashcard(overrides: Partial<FlashcardDTO> = {}): FlashcardDTO {
  return {
    id: 1,
    front: 'Question 1',
    back: 'Answer 1',
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

describe('FlashcardApiService', () => {
  let service: FlashcardApiService;
  let mockSupabase: MockSupabaseClient;

  beforeEach(() => {
    mockSupabase = {
      auth: {
        getSession: jasmine.createSpy('getSession').and.returnValue(createAuthenticatedSession())
      },
      from: jasmine.createSpy('from'),
      rpc: jasmine.createSpy('rpc')
    };

    TestBed.configureTestingModule({
      providers: [
        FlashcardApiService,
        { provide: SupabaseClientFactory, useValue: { getClient: (): MockSupabaseClient => mockSupabase } }
      ]
    });

    service = TestBed.inject(FlashcardApiService);
  });

  describe('getFlashcards', () => {
    it('should return flashcards with pagination', (done: DoneFn) => {
      const mockCards: FlashcardDTO[] = [makeMockFlashcard(), makeMockFlashcard({ id: 2, front: 'Q2' })];
      const queryBuilder: MockQueryBuilder = createMockQueryBuilder({ data: mockCards, error: null, count: 2 });
      mockSupabase.from.and.returnValue(queryBuilder);

      service.getFlashcards({ limit: 10, offset: 0 }).subscribe({
        next: (result: { flashcards: FlashcardDTO[]; totalRecords: number }) => {
          expect(result.flashcards.length).toBe(2);
          expect(result.totalRecords).toBe(2);
          expect(mockSupabase.from).toHaveBeenCalledWith('flashcards');
          expect(queryBuilder.eq).toHaveBeenCalledWith('user_id', MOCK_USER_ID);
          expect(queryBuilder.range).toHaveBeenCalledWith(0, 9);
          done();
        }
      });
    });

    it('should apply search filter', (done: DoneFn) => {
      const queryBuilder: MockQueryBuilder = createMockQueryBuilder({ data: [], error: null, count: 0 });
      mockSupabase.from.and.returnValue(queryBuilder);

      service.getFlashcards({ limit: 10, offset: 0, search: 'test' }).subscribe({
        next: () => {
          expect(queryBuilder.or).toHaveBeenCalledWith('front.ilike.%test%,back.ilike.%test%');
          done();
        }
      });
    });

    it('should apply sort field and order', (done: DoneFn) => {
      const queryBuilder: MockQueryBuilder = createMockQueryBuilder({ data: [], error: null, count: 0 });
      mockSupabase.from.and.returnValue(queryBuilder);

      service.getFlashcards({ limit: 10, offset: 0, sortField: 'front', sortOrder: -1 }).subscribe({
        next: () => {
          expect(queryBuilder.order).toHaveBeenCalledWith('front', { ascending: false });
          done();
        }
      });
    });

    it('should ignore disallowed sort fields', (done: DoneFn) => {
      const queryBuilder: MockQueryBuilder = createMockQueryBuilder({ data: [], error: null, count: 0 });
      mockSupabase.from.and.returnValue(queryBuilder);

      service.getFlashcards({ limit: 10, offset: 0, sortField: 'malicious_field', sortOrder: 1 }).subscribe({
        next: () => {
          expect(queryBuilder.order).not.toHaveBeenCalled();
          done();
        }
      });
    });

    it('should filter by setId when provided', (done: DoneFn) => {
      const queryBuilder: MockQueryBuilder = createMockQueryBuilder({ data: [], error: null, count: 0 });
      mockSupabase.from.and.returnValue(queryBuilder);

      service.getFlashcards({ limit: 10, offset: 0, setId: 5 }).subscribe({
        next: () => {
          expect(queryBuilder.eq).toHaveBeenCalledWith('set_id', 5);
          done();
        }
      });
    });

    it('should throw on Supabase error', (done: DoneFn) => {
      const queryBuilder: MockQueryBuilder = createMockQueryBuilder({
        data: null,
        error: { message: 'DB error' }
      });
      mockSupabase.from.and.returnValue(queryBuilder);

      service.getFlashcards({ limit: 10, offset: 0 }).subscribe({
        error: (err: Error) => {
          expect(err.message).toContain('DB error');
          done();
        }
      });
    });
  });

  describe('createFlashcard', () => {
    it('should create a flashcard via RPC', (done: DoneFn) => {
      const mockCard: FlashcardDTO = makeMockFlashcard();
      mockSupabase.rpc.and.returnValue(Promise.resolve({ data: [mockCard], error: null }));

      const command: CreateFlashcardCommand = {
        front: 'Question 1',
        back: 'Answer 1',
        source: 'manual',
        set_id: 10
      };

      service.createFlashcard(command).subscribe({
        next: (result: FlashcardDTO) => {
          expect(result.front).toBe('Question 1');
          expect(mockSupabase.rpc).toHaveBeenCalledWith('create_user_and_flashcard', jasmine.objectContaining({
            user_id: MOCK_USER_ID
          }));
          done();
        }
      });
    });

    it('should fall back to direct insert when RPC does not exist', (done: DoneFn) => {
      mockSupabase.rpc.and.returnValue(
        Promise.resolve({ data: null, error: { message: 'function does not exist' } })
      );
      const mockCard: FlashcardDTO = makeMockFlashcard();
      const queryBuilder: MockQueryBuilder = createMockQueryBuilder({ data: [mockCard], error: null });
      mockSupabase.from.and.returnValue(queryBuilder);

      const command: CreateFlashcardCommand = {
        front: 'Q',
        back: 'A',
        source: 'manual',
        set_id: 10
      };

      service.createFlashcard(command).subscribe({
        next: (result: FlashcardDTO) => {
          expect(result.front).toBe('Question 1');
          expect(mockSupabase.from).toHaveBeenCalledWith('flashcards');
          done();
        }
      });
    });

    it('should throw error when not authenticated', (done: DoneFn) => {
      mockSupabase.auth.getSession.and.returnValue(createUnauthenticatedSession());

      const command: CreateFlashcardCommand = {
        front: 'Q',
        back: 'A',
        source: 'manual',
        set_id: 10
      };

      service.createFlashcard(command).subscribe({
        error: (err: Error) => {
          expect(err.message).toContain('Session expired');
          done();
        }
      });
    });
  });

  describe('updateFlashcard', () => {
    it('should update a flashcard and return the updated record', (done: DoneFn) => {
      const updatedCard: FlashcardDTO = makeMockFlashcard({ front: 'Updated Q' });
      const queryBuilder: MockQueryBuilder = createMockQueryBuilder({ data: [updatedCard], error: null });
      mockSupabase.from.and.returnValue(queryBuilder);

      const updates: UpdateFlashcardCommand = { front: 'Updated Q' };

      service.updateFlashcard(1, updates).subscribe({
        next: (result: FlashcardDTO) => {
          expect(result.front).toBe('Updated Q');
          expect(queryBuilder.eq).toHaveBeenCalledWith('id', 1);
          expect(queryBuilder.eq).toHaveBeenCalledWith('user_id', MOCK_USER_ID);
          done();
        }
      });
    });

    it('should throw when flashcard not found', (done: DoneFn) => {
      const queryBuilder: MockQueryBuilder = createMockQueryBuilder({ data: [], error: null });
      mockSupabase.from.and.returnValue(queryBuilder);

      service.updateFlashcard(999, { front: 'X' }).subscribe({
        error: (err: Error) => {
          expect(err.message).toContain('Flashcard not found');
          done();
        }
      });
    });
  });

  describe('deleteFlashcard', () => {
    it('should delete a flashcard by id', (done: DoneFn) => {
      const queryBuilder: MockQueryBuilder = createMockQueryBuilder({ data: null, error: null });
      mockSupabase.from.and.returnValue(queryBuilder);

      service.deleteFlashcard(1).subscribe({
        next: (result: void) => {
          expect(result).toBeUndefined();
          expect(mockSupabase.from).toHaveBeenCalledWith('flashcards');
          expect(queryBuilder.eq).toHaveBeenCalledWith('id', 1);
          done();
        }
      });
    });

    it('should throw on Supabase error during delete', (done: DoneFn) => {
      const queryBuilder: MockQueryBuilder = createMockQueryBuilder({
        data: null,
        error: { message: 'Delete failed' }
      });
      mockSupabase.from.and.returnValue(queryBuilder);

      service.deleteFlashcard(1).subscribe({
        error: (err: Error) => {
          expect(err.message).toContain('Delete failed');
          done();
        }
      });
    });
  });

  describe('createFlashcards', () => {
    it('should create multiple flashcards via RPC', (done: DoneFn) => {
      const mockCards: FlashcardDTO[] = [
        makeMockFlashcard({ id: 1 }),
        makeMockFlashcard({ id: 2, front: 'Q2' })
      ];
      mockSupabase.rpc.and.returnValue(Promise.resolve({ data: mockCards, error: null }));

      const proposals: FlashcardProposalDTO[] = [
        { front: 'Q1', back: 'A1', source: 'ai-full' },
        { front: 'Q2', back: 'A2', source: 'ai-full' }
      ];

      service.createFlashcards(proposals, 10).subscribe({
        next: (result: FlashcardDTO[]) => {
          expect(result.length).toBe(2);
          expect(mockSupabase.rpc).toHaveBeenCalledWith('create_user_and_flashcards', jasmine.objectContaining({
            user_id: MOCK_USER_ID
          }));
          done();
        }
      });
    });

    it('should fall back to direct insert on RPC not found', (done: DoneFn) => {
      mockSupabase.rpc.and.returnValue(
        Promise.resolve({ data: null, error: { message: 'function does not exist' } })
      );
      const mockCards: FlashcardDTO[] = [makeMockFlashcard()];
      const queryBuilder: MockQueryBuilder = createMockQueryBuilder({ data: mockCards, error: null });
      mockSupabase.from.and.returnValue(queryBuilder);

      const proposals: FlashcardProposalDTO[] = [{ front: 'Q', back: 'A' }];

      service.createFlashcards(proposals, 10).subscribe({
        next: (result: FlashcardDTO[]) => {
          expect(result.length).toBe(1);
          expect(mockSupabase.from).toHaveBeenCalledWith('flashcards');
          done();
        }
      });
    });
  });
});
