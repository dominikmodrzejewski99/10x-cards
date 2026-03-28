import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { StreakService } from './streak.service';
import { UserPreferencesService } from '../../services/user-preferences.service';
import { UserPreferencesDTO } from '../../../types';

function createMockPrefs(overrides: Partial<UserPreferencesDTO> = {}): UserPreferencesDTO {
  return {
    id: 1,
    user_id: 'user-123',
    theme: 'light',
    onboarding_completed: true,
    current_streak: 5,
    longest_streak: 10,
    last_study_date: new Date().toISOString().slice(0, 10), // today
    total_sessions: 50,
    total_cards_reviewed: 300,
    pomodoro_work_duration: 25,
    pomodoro_break_duration: 5,
    pomodoro_long_break_duration: 15,
    pomodoro_sessions_before_long_break: 4,
    pomodoro_sound_enabled: true,
    pomodoro_notifications_enabled: true,
    pomodoro_focus_reminder_dismissed: false,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-03-24T00:00:00Z',
    ...overrides
  };
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function yesterdayStr(): string {
  const d: Date = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

describe('StreakService', () => {
  let service: StreakService;
  let preferencesServiceSpy: jasmine.SpyObj<UserPreferencesService>;

  beforeEach(() => {
    preferencesServiceSpy = jasmine.createSpyObj<UserPreferencesService>(
      'UserPreferencesService',
      ['getPreferences', 'recordStudySession']
    );

    TestBed.configureTestingModule({
      providers: [
        StreakService,
        { provide: UserPreferencesService, useValue: preferencesServiceSpy }
      ]
    });
    service = TestBed.inject(StreakService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should have initial values of 0/null', () => {
    expect(service.currentStreak()).toBe(0);
    expect(service.longestStreak()).toBe(0);
    expect(service.totalSessions()).toBe(0);
    expect(service.totalCardsReviewed()).toBe(0);
    expect(service.studiedToday()).toBe(false);
  });

  describe('loadFromDb', () => {
    it('should load preferences and update signals', () => {
      const prefs: UserPreferencesDTO = createMockPrefs({ last_study_date: todayStr() });
      preferencesServiceSpy.getPreferences.and.returnValue(of(prefs));

      service.loadFromDb();

      expect(service.currentStreak()).toBe(5);
      expect(service.longestStreak()).toBe(10);
      expect(service.totalSessions()).toBe(50);
      expect(service.totalCardsReviewed()).toBe(300);
      expect(service.studiedToday()).toBe(true);
    });

    it('should only load once even if called multiple times', () => {
      preferencesServiceSpy.getPreferences.and.returnValue(of(createMockPrefs()));

      service.loadFromDb();
      service.loadFromDb();

      expect(preferencesServiceSpy.getPreferences).toHaveBeenCalledTimes(1);
    });

    it('should reset streak to 0 if last study was more than 1 day ago', () => {
      const oldDate: string = '2026-01-01';
      const prefs: UserPreferencesDTO = createMockPrefs({
        current_streak: 5,
        last_study_date: oldDate
      });
      preferencesServiceSpy.getPreferences.and.returnValue(of(prefs));

      service.loadFromDb();

      expect(service.currentStreak()).toBe(0);
    });

    it('should keep streak if last study was yesterday', () => {
      const prefs: UserPreferencesDTO = createMockPrefs({
        current_streak: 5,
        last_study_date: yesterdayStr()
      });
      preferencesServiceSpy.getPreferences.and.returnValue(of(prefs));

      service.loadFromDb();

      expect(service.currentStreak()).toBe(5);
    });

    it('should keep streak if last study was today', () => {
      const prefs: UserPreferencesDTO = createMockPrefs({
        current_streak: 3,
        last_study_date: todayStr()
      });
      preferencesServiceSpy.getPreferences.and.returnValue(of(prefs));

      service.loadFromDb();

      expect(service.currentStreak()).toBe(3);
    });

    it('should return 0 streak when last_study_date is null', () => {
      const prefs: UserPreferencesDTO = createMockPrefs({
        current_streak: 5,
        last_study_date: null
      });
      preferencesServiceSpy.getPreferences.and.returnValue(of(prefs));

      service.loadFromDb();

      expect(service.currentStreak()).toBe(0);
    });
  });

  describe('recordSession', () => {
    it('should call recordStudySession and update signals', () => {
      const updatedPrefs: UserPreferencesDTO = createMockPrefs({
        current_streak: 6,
        total_sessions: 51,
        total_cards_reviewed: 310,
        last_study_date: todayStr()
      });
      preferencesServiceSpy.recordStudySession.and.returnValue(of(updatedPrefs));

      service.recordSession(10);

      expect(preferencesServiceSpy.recordStudySession).toHaveBeenCalledWith(10);
      expect(service.currentStreak()).toBe(6);
      expect(service.totalSessions()).toBe(51);
      expect(service.totalCardsReviewed()).toBe(310);
    });
  });

  describe('reset', () => {
    it('should reset all signals to initial values', () => {
      const prefs: UserPreferencesDTO = createMockPrefs({ last_study_date: todayStr() });
      preferencesServiceSpy.getPreferences.and.returnValue(of(prefs));
      service.loadFromDb();

      service.reset();

      expect(service.currentStreak()).toBe(0);
      expect(service.longestStreak()).toBe(0);
      expect(service.totalSessions()).toBe(0);
      expect(service.totalCardsReviewed()).toBe(0);
      expect(service.studiedToday()).toBe(false);
    });

    it('should allow loadFromDb to be called again after reset', () => {
      preferencesServiceSpy.getPreferences.and.returnValue(of(createMockPrefs()));

      service.loadFromDb();
      service.reset();
      service.loadFromDb();

      expect(preferencesServiceSpy.getPreferences).toHaveBeenCalledTimes(2);
    });
  });

  describe('studiedToday', () => {
    it('should return false when last_study_date is null', () => {
      preferencesServiceSpy.getPreferences.and.returnValue(
        of(createMockPrefs({ last_study_date: null }))
      );
      service.loadFromDb();

      expect(service.studiedToday()).toBe(false);
    });

    it('should return true when last_study_date is today', () => {
      preferencesServiceSpy.getPreferences.and.returnValue(
        of(createMockPrefs({ last_study_date: todayStr() }))
      );
      service.loadFromDb();

      expect(service.studiedToday()).toBe(true);
    });

    it('should return false when last_study_date is yesterday', () => {
      preferencesServiceSpy.getPreferences.and.returnValue(
        of(createMockPrefs({ last_study_date: yesterdayStr() }))
      );
      service.loadFromDb();

      expect(service.studiedToday()).toBe(false);
    });
  });
});
