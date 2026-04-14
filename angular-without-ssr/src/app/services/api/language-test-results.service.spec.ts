import { TestBed } from '@angular/core/testing';
import { LanguageTestResultsService } from './language-test-results.service';
import { SupabaseClientFactory } from '../infrastructure/supabase-client.factory';
import { LanguageTestResultDTO, TestLevel, CategoryBreakdown, WrongAnswer } from '../../../types';

interface SupabaseQueryBuilder {
  select: jasmine.Spy;
  eq: jasmine.Spy;
  insert: jasmine.Spy;
  update: jasmine.Spy;
  single: jasmine.Spy;
  order: jasmine.Spy;
  limit: jasmine.Spy;
}

interface SupabaseClientMock {
  auth: {
    getSession: jasmine.Spy;
  };
  from: jasmine.Spy;
}

function createMockResult(overrides: Partial<LanguageTestResultDTO> = {}): LanguageTestResultDTO {
  return {
    id: 1,
    user_id: 'user-123',
    level: 'b2-fce',
    total_score: 25,
    max_score: 30,
    percentage: 83.33,
    category_breakdown: { grammar: { correct: 10, total: 12 } },
    wrong_answers: [],
    generated_set_id: null,
    completed_at: '2026-03-23T12:00:00Z',
    created_at: '2026-03-23T12:00:00Z',
    updated_at: '2026-03-23T12:00:00Z',
    ...overrides
  };
}

describe('LanguageTestResultsService', () => {
  let service: LanguageTestResultsService;
  let supabaseMock: SupabaseClientMock;
  let queryBuilder: SupabaseQueryBuilder;

  const TEST_USER_ID: string = 'user-123';

  beforeEach(() => {
    queryBuilder = {
      select: jasmine.createSpy('select'),
      eq: jasmine.createSpy('eq'),
      insert: jasmine.createSpy('insert'),
      update: jasmine.createSpy('update'),
      single: jasmine.createSpy('single'),
      order: jasmine.createSpy('order'),
      limit: jasmine.createSpy('limit')
    };

    queryBuilder.select.and.returnValue(queryBuilder);
    queryBuilder.eq.and.returnValue(queryBuilder);
    queryBuilder.insert.and.returnValue(queryBuilder);
    queryBuilder.update.and.returnValue(queryBuilder);
    queryBuilder.order.and.returnValue(queryBuilder);
    queryBuilder.limit.and.returnValue(queryBuilder);

    supabaseMock = {
      auth: {
        getSession: jasmine.createSpy('getSession')
      },
      from: jasmine.createSpy('from').and.returnValue(queryBuilder)
    };

    const factoryMock: jasmine.SpyObj<SupabaseClientFactory> = jasmine.createSpyObj('SupabaseClientFactory', ['getClient']);
    factoryMock.getClient.and.returnValue(supabaseMock as unknown as ReturnType<SupabaseClientFactory['getClient']>);

    TestBed.configureTestingModule({
      providers: [
        LanguageTestResultsService,
        { provide: SupabaseClientFactory, useValue: factoryMock }
      ]
    });
    service = TestBed.inject(LanguageTestResultsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('saveResult', () => {
    it('should insert a result and return the saved data', (done: DoneFn) => {
      const mockResult: LanguageTestResultDTO = createMockResult();
      supabaseMock.auth.getSession.and.resolveTo({
        data: { session: { user: { id: TEST_USER_ID } } },
        error: null
      });
      queryBuilder.single.and.resolveTo({ data: mockResult, error: null });

      const input: {
        level: TestLevel;
        totalScore: number;
        maxScore: number;
        percentage: number;
        categoryBreakdown: CategoryBreakdown;
        wrongAnswers: WrongAnswer[];
      } = {
        level: 'b2-fce',
        totalScore: 25,
        maxScore: 30,
        percentage: 83.33,
        categoryBreakdown: { grammar: { correct: 10, total: 12 } },
        wrongAnswers: []
      };

      service.saveResult(input).subscribe({
        next: (result: LanguageTestResultDTO) => {
          expect(result).toEqual(mockResult);
          expect(supabaseMock.from).toHaveBeenCalledWith('language_test_results');
          done();
        },
        error: done.fail
      });
    });

    it('should throw when insert returns an error', (done: DoneFn) => {
      supabaseMock.auth.getSession.and.resolveTo({
        data: { session: { user: { id: TEST_USER_ID } } },
        error: null
      });
      queryBuilder.single.and.resolveTo({ data: null, error: { message: 'Insert failed' } });

      service.saveResult({
        level: 'b1',
        totalScore: 0,
        maxScore: 30,
        percentage: 0,
        categoryBreakdown: {},
        wrongAnswers: []
      }).subscribe({
        next: () => done.fail('Expected error'),
        error: (err: Error) => {
          expect(err.message).toBe('Insert failed');
          done();
        }
      });
    });

    it('should throw when user is not authenticated', (done: DoneFn) => {
      supabaseMock.auth.getSession.and.resolveTo({
        data: { session: null },
        error: null
      });

      service.saveResult({
        level: 'b1',
        totalScore: 0,
        maxScore: 30,
        percentage: 0,
        categoryBreakdown: {},
        wrongAnswers: []
      }).subscribe({
        next: () => done.fail('Expected error'),
        error: (err: Error) => {
          expect(err.message).toContain('not authenticated');
          done();
        }
      });
    });

    it('should throw when getSession returns an error', (done: DoneFn) => {
      supabaseMock.auth.getSession.and.resolveTo({
        data: { session: null },
        error: { message: 'Auth error' }
      });

      service.saveResult({
        level: 'b1',
        totalScore: 0,
        maxScore: 30,
        percentage: 0,
        categoryBreakdown: {},
        wrongAnswers: []
      }).subscribe({
        next: () => done.fail('Expected error'),
        error: (err: Error) => {
          expect(err.message).toContain('not authenticated');
          done();
        }
      });
    });
  });

  describe('getLatestResult', () => {
    it('should return the latest result without level filter', (done: DoneFn) => {
      const mockResult: LanguageTestResultDTO = createMockResult();
      supabaseMock.auth.getSession.and.resolveTo({
        data: { session: { user: { id: TEST_USER_ID } } },
        error: null
      });
      // limit returns the final promise for this chain
      queryBuilder.limit.and.resolveTo({ data: [mockResult], error: null });

      service.getLatestResult().subscribe({
        next: (result: LanguageTestResultDTO | null) => {
          expect(result).toEqual(mockResult);
          done();
        },
        error: done.fail
      });
    });

    it('should apply level filter when provided', (done: DoneFn) => {
      supabaseMock.auth.getSession.and.resolveTo({
        data: { session: { user: { id: TEST_USER_ID } } },
        error: null
      });
      // When level is provided, chain is: select -> eq(user_id) -> order -> limit -> eq(level)
      // limit must return queryBuilder (for chaining), and the final eq (for level) must resolve
      queryBuilder.limit.and.returnValue(queryBuilder);
      queryBuilder.eq.and.callFake((_col: string, _val: string) => {
        if (_col === 'level') {
          return Promise.resolve({ data: [], error: null });
        }
        return queryBuilder;
      });

      service.getLatestResult('c1-cae').subscribe({
        next: (result: LanguageTestResultDTO | null) => {
          expect(result).toBeNull();
          // eq should be called for user_id AND level
          expect(queryBuilder.eq).toHaveBeenCalledWith('user_id', TEST_USER_ID);
          expect(queryBuilder.eq).toHaveBeenCalledWith('level', 'c1-cae');
          done();
        },
        error: done.fail
      });
    });

    it('should return null when no results found', (done: DoneFn) => {
      supabaseMock.auth.getSession.and.resolveTo({
        data: { session: { user: { id: TEST_USER_ID } } },
        error: null
      });
      queryBuilder.limit.and.resolveTo({ data: [], error: null });

      service.getLatestResult().subscribe({
        next: (result: LanguageTestResultDTO | null) => {
          expect(result).toBeNull();
          done();
        },
        error: done.fail
      });
    });

    it('should throw when query returns error', (done: DoneFn) => {
      supabaseMock.auth.getSession.and.resolveTo({
        data: { session: { user: { id: TEST_USER_ID } } },
        error: null
      });
      queryBuilder.limit.and.resolveTo({ data: null, error: { message: 'Query failed' } });

      service.getLatestResult().subscribe({
        next: () => done.fail('Expected error'),
        error: (err: Error) => {
          expect(err.message).toBe('Query failed');
          done();
        }
      });
    });
  });

  describe('updateGeneratedSetId', () => {
    it('should update the generated_set_id on a result', (done: DoneFn) => {
      queryBuilder.eq.and.resolveTo({ data: null, error: null });

      service.updateGeneratedSetId(1, 42).subscribe({
        next: () => {
          expect(supabaseMock.from).toHaveBeenCalledWith('language_test_results');
          expect(queryBuilder.update).toHaveBeenCalled();
          done();
        },
        error: done.fail
      });
    });

    it('should throw when update returns error', (done: DoneFn) => {
      queryBuilder.eq.and.resolveTo({ data: null, error: { message: 'Update failed' } });

      service.updateGeneratedSetId(1, 42).subscribe({
        next: () => done.fail('Expected error'),
        error: (err: Error) => {
          expect(err.message).toBe('Update failed');
          done();
        }
      });
    });
  });
});
