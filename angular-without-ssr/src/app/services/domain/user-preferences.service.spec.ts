import { TestBed } from '@angular/core/testing';
import { UserPreferencesService } from './user-preferences.service';
import { SupabaseClientFactory } from '../infrastructure/supabase-client.factory';
import { UserPreferencesDTO } from '../../../types';

interface SupabaseQueryBuilder {
  select: jasmine.Spy;
  eq: jasmine.Spy;
  maybeSingle: jasmine.Spy;
  upsert: jasmine.Spy;
  single: jasmine.Spy;
}

interface SupabaseClientMock {
  auth: {
    getSession: jasmine.Spy;
  };
  from: jasmine.Spy;
  rpc: jasmine.Spy;
}

function createMockPreferences(userId: string): UserPreferencesDTO {
  return {
    id: 1,
    user_id: userId,
    theme: 'light',
    language: 'pl',
    onboarding_completed: false,
    current_streak: 3,
    longest_streak: 10,
    last_study_date: '2026-03-23',
    total_sessions: 25,
    total_cards_reviewed: 150,
    pomodoro_work_duration: 25,
    pomodoro_break_duration: 5,
    pomodoro_long_break_duration: 15,
    pomodoro_sessions_before_long_break: 4,
    pomodoro_sound_enabled: true,
    pomodoro_notifications_enabled: true,
    pomodoro_focus_reminder_dismissed: false,
    dismissed_dialogs: [],
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-03-23T00:00:00Z'
  };
}

describe('UserPreferencesService', () => {
  let service: UserPreferencesService;
  let supabaseMock: SupabaseClientMock;
  let queryBuilder: SupabaseQueryBuilder;

  const TEST_USER_ID: string = 'user-123';

  beforeEach(() => {
    queryBuilder = {
      select: jasmine.createSpy('select'),
      eq: jasmine.createSpy('eq'),
      maybeSingle: jasmine.createSpy('maybeSingle'),
      upsert: jasmine.createSpy('upsert'),
      single: jasmine.createSpy('single')
    };

    // Chain returns
    queryBuilder.select.and.returnValue(queryBuilder);
    queryBuilder.eq.and.returnValue(queryBuilder);
    queryBuilder.upsert.and.returnValue(queryBuilder);

    supabaseMock = {
      auth: {
        getSession: jasmine.createSpy('getSession')
      },
      from: jasmine.createSpy('from').and.returnValue(queryBuilder),
      rpc: jasmine.createSpy('rpc')
    };

    const factoryMock: jasmine.SpyObj<SupabaseClientFactory> = jasmine.createSpyObj('SupabaseClientFactory', ['getClient']);
    factoryMock.getClient.and.returnValue(supabaseMock as unknown as ReturnType<SupabaseClientFactory['getClient']>);

    TestBed.configureTestingModule({
      providers: [
        UserPreferencesService,
        { provide: SupabaseClientFactory, useValue: factoryMock }
      ]
    });
    service = TestBed.inject(UserPreferencesService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getPreferences', () => {
    it('should return preferences from Supabase', (done: DoneFn) => {
      const mockPrefs: UserPreferencesDTO = createMockPreferences(TEST_USER_ID);
      supabaseMock.auth.getSession.and.resolveTo({
        data: { session: { user: { id: TEST_USER_ID } } },
        error: null
      });
      queryBuilder.maybeSingle.and.resolveTo({ data: mockPrefs, error: null });

      service.getPreferences().subscribe({
        next: (prefs: UserPreferencesDTO) => {
          expect(prefs).toEqual(mockPrefs);
          done();
        },
        error: done.fail
      });
    });

    it('should return default preferences when no data found', (done: DoneFn) => {
      supabaseMock.auth.getSession.and.resolveTo({
        data: { session: { user: { id: TEST_USER_ID } } },
        error: null
      });
      queryBuilder.maybeSingle.and.resolveTo({ data: null, error: null });

      service.getPreferences().subscribe({
        next: (prefs: UserPreferencesDTO) => {
          expect(prefs.user_id).toBe(TEST_USER_ID);
          expect(prefs.onboarding_completed).toBe(false);
          expect(prefs.current_streak).toBe(0);
          expect(prefs.id).toBe(0);
          done();
        },
        error: done.fail
      });
    });

    it('should return default preferences when Supabase returns error', (done: DoneFn) => {
      supabaseMock.auth.getSession.and.resolveTo({
        data: { session: { user: { id: TEST_USER_ID } } },
        error: null
      });
      queryBuilder.maybeSingle.and.resolveTo({ data: null, error: { message: 'DB error' } });

      service.getPreferences().subscribe({
        next: (prefs: UserPreferencesDTO) => {
          expect(prefs.user_id).toBe(TEST_USER_ID);
          expect(prefs.id).toBe(0);
          done();
        },
        error: done.fail
      });
    });

    it('should cache the result and return same observable on second call', (done: DoneFn) => {
      const mockPrefs: UserPreferencesDTO = createMockPreferences(TEST_USER_ID);
      supabaseMock.auth.getSession.and.resolveTo({
        data: { session: { user: { id: TEST_USER_ID } } },
        error: null
      });
      queryBuilder.maybeSingle.and.resolveTo({ data: mockPrefs, error: null });

      const first$  = service.getPreferences();
      const second$ = service.getPreferences();

      expect(first$).toBe(second$);
      first$.subscribe({
        next: () => done(),
        error: done.fail
      });
    });

    it('should throw when user is not logged in', (done: DoneFn) => {
      supabaseMock.auth.getSession.and.resolveTo({
        data: { session: null },
        error: null
      });

      service.getPreferences().subscribe({
        next: () => done.fail('Expected error'),
        error: (err: Error) => {
          expect(err.message).toContain('nie jest zalogowany');
          done();
        }
      });
    });
  });

  describe('updatePreferences', () => {
    it('should upsert preferences and return updated data', (done: DoneFn) => {
      const updatedPrefs: UserPreferencesDTO = { ...createMockPreferences(TEST_USER_ID), onboarding_completed: true };
      supabaseMock.auth.getSession.and.resolveTo({
        data: { session: { user: { id: TEST_USER_ID } } },
        error: null
      });
      queryBuilder.single.and.resolveTo({ data: updatedPrefs, error: null });

      service.updatePreferences({ onboarding_completed: true }).subscribe({
        next: (prefs: UserPreferencesDTO) => {
          expect(prefs.onboarding_completed).toBe(true);
          expect(supabaseMock.from).toHaveBeenCalledWith('user_preferences');
          done();
        },
        error: done.fail
      });
    });

    it('should invalidate cache on update', () => {
      supabaseMock.auth.getSession.and.resolveTo({
        data: { session: { user: { id: TEST_USER_ID } } },
        error: null
      });
      queryBuilder.maybeSingle.and.resolveTo({ data: createMockPreferences(TEST_USER_ID), error: null });

      // Populate cache
      service.getPreferences().subscribe();

      queryBuilder.single.and.resolveTo({ data: createMockPreferences(TEST_USER_ID), error: null });
      // Update should invalidate cache
      service.updatePreferences({ onboarding_completed: true }).subscribe();

      // Next getPreferences call should create a new observable (not cached)
      const obs1 = service.getPreferences();
      service.clearCache();
      const obs2 = service.getPreferences();
      expect(obs1).not.toBe(obs2);
    });

    it('should return default prefs on foreign key constraint error', (done: DoneFn) => {
      supabaseMock.auth.getSession.and.resolveTo({
        data: { session: { user: { id: TEST_USER_ID } } },
        error: null
      });
      queryBuilder.single.and.resolveTo({
        data: null,
        error: { message: 'foreign key constraint violation' }
      });

      service.updatePreferences({ onboarding_completed: true }).subscribe({
        next: (prefs: UserPreferencesDTO) => {
          expect(prefs.user_id).toBe(TEST_USER_ID);
          expect(prefs.id).toBe(0);
          done();
        },
        error: done.fail
      });
    });

    it('should propagate non-FK errors', (done: DoneFn) => {
      supabaseMock.auth.getSession.and.resolveTo({
        data: { session: { user: { id: TEST_USER_ID } } },
        error: null
      });
      queryBuilder.single.and.resolveTo({
        data: null,
        error: { message: 'some other error' }
      });

      service.updatePreferences({ onboarding_completed: true }).subscribe({
        next: () => done.fail('Expected error'),
        error: (err: Error) => {
          expect(err.message).toBe('some other error');
          done();
        }
      });
    });
  });

  describe('setOnboardingCompleted', () => {
    it('should call updatePreferences with onboarding_completed true', (done: DoneFn) => {
      const updatedPrefs: UserPreferencesDTO = { ...createMockPreferences(TEST_USER_ID), onboarding_completed: true };
      supabaseMock.auth.getSession.and.resolveTo({
        data: { session: { user: { id: TEST_USER_ID } } },
        error: null
      });
      queryBuilder.single.and.resolveTo({ data: updatedPrefs, error: null });

      service.setOnboardingCompleted().subscribe({
        next: (prefs: UserPreferencesDTO) => {
          expect(prefs.onboarding_completed).toBe(true);
          done();
        },
        error: done.fail
      });
    });
  });

  describe('recordStudySession', () => {
    it('should call rpc and return updated preferences', (done: DoneFn) => {
      const updatedPrefs: UserPreferencesDTO = { ...createMockPreferences(TEST_USER_ID), total_sessions: 26 };
      supabaseMock.auth.getSession.and.resolveTo({
        data: { session: { user: { id: TEST_USER_ID } } },
        error: null
      });
      supabaseMock.rpc.and.resolveTo({ data: updatedPrefs, error: null });

      service.recordStudySession(10).subscribe({
        next: (prefs: UserPreferencesDTO) => {
          expect(prefs.total_sessions).toBe(26);
          expect(supabaseMock.rpc).toHaveBeenCalledWith('record_study_session', {
            p_user_id: TEST_USER_ID,
            p_cards_reviewed: 10
          });
          done();
        },
        error: done.fail
      });
    });

    it('should propagate rpc errors', (done: DoneFn) => {
      supabaseMock.auth.getSession.and.resolveTo({
        data: { session: { user: { id: TEST_USER_ID } } },
        error: null
      });
      supabaseMock.rpc.and.resolveTo({ data: null, error: { message: 'RPC failed' } });

      service.recordStudySession(5).subscribe({
        next: () => done.fail('Expected error'),
        error: (err: Error) => {
          expect(err.message).toBe('RPC failed');
          done();
        }
      });
    });
  });

  describe('clearCache', () => {
    it('should clear the cached observable', () => {
      supabaseMock.auth.getSession.and.resolveTo({
        data: { session: { user: { id: TEST_USER_ID } } },
        error: null
      });
      queryBuilder.maybeSingle.and.resolveTo({ data: createMockPreferences(TEST_USER_ID), error: null });

      const first$ = service.getPreferences();
      service.clearCache();
      const second$ = service.getPreferences();

      expect(first$).not.toBe(second$);
    });
  });
});
