import { TestBed } from '@angular/core/testing';
import { LanguageService } from './language.service';
import { UserPreferencesService } from './user-preferences.service';
import { TranslocoService } from '@jsverse/transloco';
import { of } from 'rxjs';
import { UserPreferencesDTO } from '../../types';

function createMockPreferences(overrides: Partial<UserPreferencesDTO> = {}): UserPreferencesDTO {
  return {
    id: 1,
    user_id: 'user-123',
    theme: 'light',
    language: 'pl',
    onboarding_completed: false,
    current_streak: 0,
    longest_streak: 0,
    last_study_date: null,
    total_sessions: 0,
    total_cards_reviewed: 0,
    pomodoro_work_duration: 25,
    pomodoro_break_duration: 5,
    pomodoro_long_break_duration: 15,
    pomodoro_sessions_before_long_break: 4,
    pomodoro_sound_enabled: true,
    pomodoro_notifications_enabled: true,
    pomodoro_focus_reminder_dismissed: false,
    dismissed_dialogs: [],
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-03-31T00:00:00Z',
    ...overrides,
  };
}

describe('LanguageService', () => {
  let service: LanguageService;
  let prefsServiceSpy: jasmine.SpyObj<UserPreferencesService>;
  let translocoServiceSpy: jasmine.SpyObj<TranslocoService>;

  beforeEach(() => {
    localStorage.removeItem('memlo-lang');

    prefsServiceSpy = jasmine.createSpyObj<UserPreferencesService>('UserPreferencesService', [
      'getPreferences',
      'updatePreferences',
    ]);
    prefsServiceSpy.getPreferences.and.returnValue(of(createMockPreferences()));
    prefsServiceSpy.updatePreferences.and.returnValue(of(createMockPreferences()));

    translocoServiceSpy = jasmine.createSpyObj<TranslocoService>('TranslocoService', [
      'setActiveLang',
    ]);

    TestBed.configureTestingModule({
      providers: [
        LanguageService,
        { provide: UserPreferencesService, useValue: prefsServiceSpy },
        { provide: TranslocoService, useValue: translocoServiceSpy },
      ],
    });

    service = TestBed.inject(LanguageService);
  });

  afterEach(() => {
    localStorage.removeItem('memlo-lang');
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('loadLanguage', () => {
    it('should load language from DB preferences', () => {
      prefsServiceSpy.getPreferences.and.returnValue(of(createMockPreferences({ language: 'en' })));

      service.loadLanguage();

      expect(prefsServiceSpy.getPreferences).toHaveBeenCalled();
      expect(service.language()).toBe('en');
      expect(translocoServiceSpy.setActiveLang).toHaveBeenCalledWith('en');
    });

    it('should set document lang attribute', () => {
      prefsServiceSpy.getPreferences.and.returnValue(of(createMockPreferences({ language: 'en' })));

      service.loadLanguage();

      expect(document.documentElement.lang).toBe('en');
    });

    it('should persist language to localStorage', () => {
      prefsServiceSpy.getPreferences.and.returnValue(of(createMockPreferences({ language: 'en' })));

      service.loadLanguage();

      expect(localStorage.getItem('memlo-lang')).toBe('en');
    });
  });

  describe('setLanguage', () => {
    it('should update signal, Transloco, and persist to DB', () => {
      service.setLanguage('en');

      expect(service.language()).toBe('en');
      expect(translocoServiceSpy.setActiveLang).toHaveBeenCalledWith('en');
      expect(prefsServiceSpy.updatePreferences).toHaveBeenCalledWith({ language: 'en' });
    });

    it('should update localStorage', () => {
      service.setLanguage('en');

      expect(localStorage.getItem('memlo-lang')).toBe('en');
    });
  });

  describe('resetLanguage', () => {
    it('should reset to default language', () => {
      service.setLanguage('en');

      service.resetLanguage();

      expect(translocoServiceSpy.setActiveLang).toHaveBeenCalled();
      expect(service.language()).toBeTruthy();
    });
  });

  describe('resolveDefault', () => {
    it('should use localStorage value when available', () => {
      localStorage.setItem('memlo-lang', 'en');

      // resetLanguage calls resolveDefault internally
      service.resetLanguage();

      expect(service.language()).toBe('en');
    });
  });
});
