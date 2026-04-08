import { TestBed } from '@angular/core/testing';
import { FlashcardSetApiService, SET_CONSTRAINTS } from './flashcard-set-api.service';
import { SupabaseClientFactory } from './supabase-client.factory';
import { FlashcardSetDTO, CreateFlashcardSetCommand, UpdateFlashcardSetCommand } from '../../types';

interface MockQueryBuilder {
  select: jasmine.Spy;
  insert: jasmine.Spy;
  update: jasmine.Spy;
  delete: jasmine.Spy;
  eq: jasmine.Spy;
  order: jasmine.Spy;
  single: jasmine.Spy;
}

interface MockSupabaseClient {
  auth: {
    getSession: jasmine.Spy;
  };
  from: jasmine.Spy;
}

const MOCK_USER_ID = 'user-set-456';

function createMockQueryBuilder(resolvedValue: { data: unknown; error: unknown; count?: number | null }): MockQueryBuilder {
  const builder: MockQueryBuilder = {
    select: jasmine.createSpy('select'),
    insert: jasmine.createSpy('insert'),
    update: jasmine.createSpy('update'),
    delete: jasmine.createSpy('delete'),
    eq: jasmine.createSpy('eq'),
    order: jasmine.createSpy('order'),
    single: jasmine.createSpy('single'),
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

function createAuthenticatedSession(): Promise<{ data: { session: { user: { id: string } } }; error: null }> {
  return Promise.resolve({
    data: { session: { user: { id: MOCK_USER_ID } } },
    error: null
  });
}

function makeMockSet(overrides: Partial<FlashcardSetDTO> = {}): FlashcardSetDTO {
  return {
    id: 1,
    user_id: MOCK_USER_ID,
    name: 'Test Set',
    description: 'A test set',
    tags: [],
    is_public: false,
    copy_count: 0,
    published_at: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides
  };
}

describe('FlashcardSetApiService', () => {
  let service: FlashcardSetApiService;
  let mockSupabase: MockSupabaseClient;

  beforeEach(() => {
    mockSupabase = {
      auth: {
        getSession: jasmine.createSpy('getSession').and.returnValue(createAuthenticatedSession())
      },
      from: jasmine.createSpy('from')
    };

    TestBed.configureTestingModule({
      providers: [
        FlashcardSetApiService,
        { provide: SupabaseClientFactory, useValue: { getClient: (): MockSupabaseClient => mockSupabase } }
      ]
    });

    service = TestBed.inject(FlashcardSetApiService);
  });

  describe('getSets', () => {
    it('should return all sets for the user', (done: DoneFn) => {
      const mockSets: FlashcardSetDTO[] = [makeMockSet(), makeMockSet({ id: 2, name: 'Set 2' })];
      const queryBuilder: MockQueryBuilder = createMockQueryBuilder({ data: mockSets, error: null });
      mockSupabase.from.and.returnValue(queryBuilder);

      service.getSets().subscribe({
        next: (result: FlashcardSetDTO[]) => {
          expect(result.length).toBe(2);
          expect(result[0].name).toBe('Test Set');
          expect(mockSupabase.from).toHaveBeenCalledWith('flashcard_sets');
          expect(queryBuilder.eq).toHaveBeenCalledWith('user_id', MOCK_USER_ID);
          done();
        }
      });
    });

    it('should throw on Supabase error', (done: DoneFn) => {
      const queryBuilder: MockQueryBuilder = createMockQueryBuilder({ data: null, error: { message: 'DB fail' } });
      mockSupabase.from.and.returnValue(queryBuilder);

      service.getSets().subscribe({
        error: (err: Error) => {
          expect(err.message).toContain('DB fail');
          done();
        }
      });
    });
  });

  describe('getSet', () => {
    it('should return a single set by id', (done: DoneFn) => {
      const mockSet: FlashcardSetDTO = makeMockSet();
      const queryBuilder: MockQueryBuilder = createMockQueryBuilder({ data: mockSet, error: null });
      mockSupabase.from.and.returnValue(queryBuilder);

      service.getSet(1).subscribe({
        next: (result: FlashcardSetDTO) => {
          expect(result.id).toBe(1);
          expect(result.name).toBe('Test Set');
          expect(queryBuilder.eq).toHaveBeenCalledWith('id', 1);
          expect(queryBuilder.single).toHaveBeenCalled();
          done();
        }
      });
    });

    it('should throw when set not found', (done: DoneFn) => {
      const queryBuilder: MockQueryBuilder = createMockQueryBuilder({
        data: null,
        error: { message: 'Row not found' }
      });
      mockSupabase.from.and.returnValue(queryBuilder);

      service.getSet(999).subscribe({
        error: (err: Error) => {
          expect(err.message).toContain('Row not found');
          done();
        }
      });
    });
  });

  describe('createSet', () => {
    it('should create a set and return it', (done: DoneFn) => {
      const createdSet: FlashcardSetDTO = makeMockSet({ name: 'New Set' });
      const queryBuilder: MockQueryBuilder = createMockQueryBuilder({ data: createdSet, error: null });
      mockSupabase.from.and.returnValue(queryBuilder);

      const command: CreateFlashcardSetCommand = { name: 'New Set', description: 'desc' };

      service.createSet(command).subscribe({
        next: (result: FlashcardSetDTO) => {
          expect(result.name).toBe('New Set');
          expect(mockSupabase.from).toHaveBeenCalledWith('flashcard_sets');
          expect(queryBuilder.insert).toHaveBeenCalled();
          done();
        }
      });
    });

    it('should handle null description', (done: DoneFn) => {
      const createdSet: FlashcardSetDTO = makeMockSet({ description: null });
      const queryBuilder: MockQueryBuilder = createMockQueryBuilder({ data: createdSet, error: null });
      mockSupabase.from.and.returnValue(queryBuilder);

      const command: CreateFlashcardSetCommand = { name: 'No Desc' };

      service.createSet(command).subscribe({
        next: (result: FlashcardSetDTO) => {
          expect(result.description).toBeNull();
          done();
        }
      });
    });
  });

  describe('updateSet', () => {
    it('should update a set and return it', (done: DoneFn) => {
      const updatedSet: FlashcardSetDTO = makeMockSet({ name: 'Updated' });
      const queryBuilder: MockQueryBuilder = createMockQueryBuilder({ data: updatedSet, error: null });
      mockSupabase.from.and.returnValue(queryBuilder);

      const command: UpdateFlashcardSetCommand = { name: 'Updated' };

      service.updateSet(1, command).subscribe({
        next: (result: FlashcardSetDTO) => {
          expect(result.name).toBe('Updated');
          expect(queryBuilder.eq).toHaveBeenCalledWith('id', 1);
          expect(queryBuilder.eq).toHaveBeenCalledWith('user_id', MOCK_USER_ID);
          done();
        }
      });
    });
  });

  describe('deleteSet', () => {
    it('should delete a set by id', (done: DoneFn) => {
      const queryBuilder: MockQueryBuilder = createMockQueryBuilder({ data: null, error: null });
      mockSupabase.from.and.returnValue(queryBuilder);

      service.deleteSet(1).subscribe({
        next: () => {
          expect(mockSupabase.from).toHaveBeenCalledWith('flashcard_sets');
          expect(queryBuilder.eq).toHaveBeenCalledWith('id', 1);
          expect(queryBuilder.eq).toHaveBeenCalledWith('user_id', MOCK_USER_ID);
          done();
        }
      });
    });

    it('should throw on Supabase error', (done: DoneFn) => {
      const queryBuilder: MockQueryBuilder = createMockQueryBuilder({
        data: null,
        error: { message: 'Cannot delete' }
      });
      mockSupabase.from.and.returnValue(queryBuilder);

      service.deleteSet(1).subscribe({
        error: (err: Error) => {
          expect(err.message).toContain('Cannot delete');
          done();
        }
      });
    });
  });

  describe('getSetsWithCardCount', () => {
    it('should return sets with their card counts', (done: DoneFn) => {
      interface SetWithFlashcards extends FlashcardSetDTO {
        flashcards: { count: number }[];
      }
      const rawData: SetWithFlashcards[] = [
        { ...makeMockSet(), flashcards: [{ count: 5 }] },
        { ...makeMockSet({ id: 2, name: 'Set 2' }), flashcards: [{ count: 0 }] }
      ];
      const queryBuilder: MockQueryBuilder = createMockQueryBuilder({ data: rawData, error: null });
      mockSupabase.from.and.returnValue(queryBuilder);

      service.getSetsWithCardCount().subscribe({
        next: (result: { set: FlashcardSetDTO; cardCount: number }[]) => {
          expect(result.length).toBe(2);
          expect(result[0].cardCount).toBe(5);
          expect(result[1].cardCount).toBe(0);
          expect(result[0].set.name).toBe('Test Set');
          done();
        }
      });
    });

    it('should default cardCount to 0 when flashcards relation is empty', (done: DoneFn) => {
      interface SetWithEmptyFlashcards extends FlashcardSetDTO {
        flashcards: never[];
      }
      const rawData: SetWithEmptyFlashcards[] = [
        { ...makeMockSet(), flashcards: [] }
      ];
      const queryBuilder: MockQueryBuilder = createMockQueryBuilder({ data: rawData, error: null });
      mockSupabase.from.and.returnValue(queryBuilder);

      service.getSetsWithCardCount().subscribe({
        next: (result: { set: FlashcardSetDTO; cardCount: number }[]) => {
          expect(result[0].cardCount).toBe(0);
          done();
        }
      });
    });
  });

  describe('validation', () => {
    it('should reject empty name on create', () => {
      expect(() => service.createSet({ name: '   ' })).toThrowError(/pusta/);
    });

    it('should reject name exceeding max length on create', () => {
      expect(() => service.createSet({ name: 'a'.repeat(SET_CONSTRAINTS.NAME_MAX + 1) }))
        .toThrowError(/max/);
    });

    it('should reject description exceeding max length on create', () => {
      expect(() => service.createSet({ name: 'OK', description: 'x'.repeat(SET_CONSTRAINTS.DESCRIPTION_MAX + 1) }))
        .toThrowError(/max/);
    });

    it('should reject more than max tags on create', () => {
      const tooManyTags = Array.from({ length: SET_CONSTRAINTS.TAGS_MAX_COUNT + 1 }, (_, i) => `tag${i}`);
      expect(() => service.createSet({ name: 'OK', tags: tooManyTags }))
        .toThrowError(/tag/i);
    });

    it('should reject blank tag on create', () => {
      expect(() => service.createSet({ name: 'OK', tags: ['good', '  '] }))
        .toThrowError(/pusty/);
    });

    it('should reject tag exceeding max length on create', () => {
      expect(() => service.createSet({ name: 'OK', tags: ['a'.repeat(SET_CONSTRAINTS.TAG_MAX_LENGTH + 1)] }))
        .toThrowError(/max/);
    });

    it('should reject empty name on update', () => {
      expect(() => service.updateSet(1, { name: '' })).toThrowError(/pusta/);
    });

    it('should allow valid data on create', (done: DoneFn) => {
      const createdSet: FlashcardSetDTO = makeMockSet({ name: 'Valid' });
      const queryBuilder: MockQueryBuilder = createMockQueryBuilder({ data: createdSet, error: null });
      mockSupabase.from.and.returnValue(queryBuilder);

      service.createSet({ name: 'Valid', tags: ['a', 'b'] }).subscribe({
        next: (result: FlashcardSetDTO) => {
          expect(result.name).toBe('Valid');
          done();
        }
      });
    });

    it('should allow partial update without name', (done: DoneFn) => {
      const updatedSet: FlashcardSetDTO = makeMockSet({ description: 'new desc' });
      const queryBuilder: MockQueryBuilder = createMockQueryBuilder({ data: updatedSet, error: null });
      mockSupabase.from.and.returnValue(queryBuilder);

      service.updateSet(1, { description: 'new desc' }).subscribe({
        next: (result: FlashcardSetDTO) => {
          expect(result.description).toBe('new desc');
          done();
        }
      });
    });
  });

  describe('getSetCardCount', () => {
    it('should return the card count for a set', (done: DoneFn) => {
      const queryBuilder: MockQueryBuilder = createMockQueryBuilder({ data: null, error: null, count: 42 });
      mockSupabase.from.and.returnValue(queryBuilder);

      service.getSetCardCount(10).subscribe({
        next: (count: number) => {
          expect(count).toBe(42);
          expect(mockSupabase.from).toHaveBeenCalledWith('flashcards');
          expect(queryBuilder.eq).toHaveBeenCalledWith('set_id', 10);
          done();
        }
      });
    });

    it('should return 0 when count is null', (done: DoneFn) => {
      const queryBuilder: MockQueryBuilder = createMockQueryBuilder({ data: null, error: null, count: null });
      mockSupabase.from.and.returnValue(queryBuilder);

      service.getSetCardCount(10).subscribe({
        next: (count: number) => {
          expect(count).toBe(0);
          done();
        }
      });
    });
  });
});
