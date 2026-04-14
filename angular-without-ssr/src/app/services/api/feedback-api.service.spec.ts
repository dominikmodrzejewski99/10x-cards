import { TestBed } from '@angular/core/testing';
import { FeedbackApiService } from './feedback-api.service';
import { SupabaseClientFactory } from '../infrastructure/supabase-client.factory';
import { CreateFeedbackCommand } from '../../../types';

describe('FeedbackApiService', () => {
  let service: FeedbackApiService;
  let mockSupabaseClient: any;
  let mockSupabaseFactory: jasmine.SpyObj<SupabaseClientFactory>;

  const mockUserId = 'user-123';
  const mockSession = {
    data: { session: { user: { id: mockUserId } } },
    error: null
  };

  beforeEach(() => {
    mockSupabaseClient = {
      auth: {
        getSession: jasmine.createSpy('getSession').and.returnValue(Promise.resolve(mockSession))
      },
      from: jasmine.createSpy('from').and.returnValue({
        insert: jasmine.createSpy('insert').and.returnValue({
          select: jasmine.createSpy('select').and.returnValue({
            single: jasmine.createSpy('single').and.returnValue(Promise.resolve({
              data: {
                id: 1,
                user_id: mockUserId,
                type: 'bug',
                title: 'Test bug',
                description: 'Test description for a bug report',
                created_at: '2026-04-02T00:00:00Z'
              },
              error: null
            }))
          })
        })
      })
    };

    mockSupabaseFactory = jasmine.createSpyObj('SupabaseClientFactory', ['getClient']);
    mockSupabaseFactory.getClient.and.returnValue(mockSupabaseClient);

    TestBed.configureTestingModule({
      providers: [
        FeedbackApiService,
        { provide: SupabaseClientFactory, useValue: mockSupabaseFactory }
      ]
    });

    service = TestBed.inject(FeedbackApiService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should submit feedback successfully', (done: DoneFn) => {
    const command: CreateFeedbackCommand = {
      type: 'bug',
      title: 'Test bug',
      description: 'Test description for a bug report'
    };

    service.submitFeedback(command).subscribe({
      next: (result) => {
        expect(result.id).toBe(1);
        expect(result.type).toBe('bug');
        expect(result.title).toBe('Test bug');
        expect(mockSupabaseClient.from).toHaveBeenCalledWith('feedback');
        done();
      },
      error: done.fail
    });
  });

  it('should throw error when user is not authenticated', (done: DoneFn) => {
    mockSupabaseClient.auth.getSession.and.returnValue(
      Promise.resolve({ data: { session: null }, error: null })
    );

    const command: CreateFeedbackCommand = {
      type: 'idea',
      title: 'Test idea',
      description: 'Test description for an idea report'
    };

    service.submitFeedback(command).subscribe({
      next: () => done.fail('Should have thrown'),
      error: (err) => {
        expect(err.message).toContain('nie jest zalogowany');
        done();
      }
    });
  });

  it('should handle Supabase insert error', (done: DoneFn) => {
    mockSupabaseClient.from.and.returnValue({
      insert: jasmine.createSpy('insert').and.returnValue({
        select: jasmine.createSpy('select').and.returnValue({
          single: jasmine.createSpy('single').and.returnValue(Promise.resolve({
            data: null,
            error: { message: 'Insert failed' }
          }))
        })
      })
    });

    const command: CreateFeedbackCommand = {
      type: 'bug',
      title: 'Test bug',
      description: 'Test description for a bug report'
    };

    service.submitFeedback(command).subscribe({
      next: () => done.fail('Should have thrown'),
      error: (err) => {
        expect(err.message).toContain('Insert failed');
        done();
      }
    });
  });
});
