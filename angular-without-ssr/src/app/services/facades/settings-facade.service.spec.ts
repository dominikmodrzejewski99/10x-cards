import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { SettingsFacadeService } from './settings-facade.service';
import { UserPreferencesService } from '../domain/user-preferences.service';
import { PomodoroService } from '../domain/pomodoro.service';
import { ThemeService } from '../domain/theme.service';
import { LanguageService } from '../domain/language.service';
import { signal } from '@angular/core';

describe('SettingsFacadeService', () => {
  let facade: SettingsFacadeService;
  let prefsMock: jasmine.SpyObj<UserPreferencesService>;
  let pomodoroMock: jasmine.SpyObj<PomodoroService>;
  let themeMock: jasmine.SpyObj<ThemeService>;
  let languageMock: jasmine.SpyObj<LanguageService>;

  const mockPrefs = {
    pomodoro_work_duration: 30,
    pomodoro_break_duration: 10,
    pomodoro_long_break_duration: 20,
    pomodoro_sessions_before_long_break: 3,
    pomodoro_sound_enabled: false,
    pomodoro_notifications_enabled: false,
  };

  beforeEach(() => {
    prefsMock = jasmine.createSpyObj('UserPreferencesService', ['getPreferences', 'updatePreferences']);
    prefsMock.getPreferences.and.returnValue(of(mockPrefs as any));
    prefsMock.updatePreferences.and.returnValue(of(mockPrefs as any));

    pomodoroMock = jasmine.createSpyObj('PomodoroService', ['reloadSettings']);

    themeMock = jasmine.createSpyObj('ThemeService', ['setTheme'], {
      theme: signal('light' as const),
    });

    languageMock = jasmine.createSpyObj('LanguageService', ['setLanguage'], {
      language: signal('pl' as const),
    });

    TestBed.configureTestingModule({
      providers: [
        SettingsFacadeService,
        { provide: UserPreferencesService, useValue: prefsMock },
        { provide: PomodoroService, useValue: pomodoroMock },
        { provide: ThemeService, useValue: themeMock },
        { provide: LanguageService, useValue: languageMock },
      ],
    });

    facade = TestBed.inject(SettingsFacadeService);
  });

  describe('init', () => {
    it('should load preferences and populate all signals', () => {
      facade.init();

      expect(prefsMock.getPreferences).toHaveBeenCalled();
      expect(facade.workDurationSignal()).toBe(30);
      expect(facade.breakDurationSignal()).toBe(10);
      expect(facade.longBreakDurationSignal()).toBe(20);
      expect(facade.sessionsBeforeLongBreakSignal()).toBe(3);
      expect(facade.soundEnabledSignal()).toBeFalse();
      expect(facade.notificationsEnabledSignal()).toBeFalse();
    });
  });

  describe('setters', () => {
    it('should set work duration', () => {
      facade.setWorkDuration(45);
      expect(facade.workDurationSignal()).toBe(45);
    });

    it('should set break duration', () => {
      facade.setBreakDuration(8);
      expect(facade.breakDurationSignal()).toBe(8);
    });

    it('should set long break duration', () => {
      facade.setLongBreakDuration(25);
      expect(facade.longBreakDurationSignal()).toBe(25);
    });

    it('should set sessions before long break', () => {
      facade.setSessionsBeforeLongBreak(6);
      expect(facade.sessionsBeforeLongBreakSignal()).toBe(6);
    });

    it('should set sound enabled', () => {
      facade.setSoundEnabled(false);
      expect(facade.soundEnabledSignal()).toBeFalse();
    });

    it('should set notifications enabled', () => {
      facade.setNotificationsEnabled(false);
      expect(facade.notificationsEnabledSignal()).toBeFalse();
    });
  });

  describe('setTheme', () => {
    it('should delegate to themeService', () => {
      facade.setTheme('dark');
      expect(themeMock.setTheme).toHaveBeenCalledWith('dark');
    });
  });

  describe('setLanguage', () => {
    it('should delegate to languageService', () => {
      facade.setLanguage('en');
      expect(languageMock.setLanguage).toHaveBeenCalledWith('en');
    });
  });

  describe('themeSignal and languageSignal', () => {
    it('should expose theme from themeService', () => {
      expect(facade.themeSignal()).toBe('light');
    });

    it('should expose language from languageService', () => {
      expect(facade.languageSignal()).toBe('pl');
    });
  });

  describe('save', () => {
    it('should clamp work duration to min 1', () => {
      facade.setWorkDuration(0);
      facade.save();
      expect(facade.workDurationSignal()).toBe(1);
    });

    it('should clamp work duration to max 120', () => {
      facade.setWorkDuration(200);
      facade.save();
      expect(facade.workDurationSignal()).toBe(120);
    });

    it('should clamp break duration to min 1', () => {
      facade.setBreakDuration(0);
      facade.save();
      expect(facade.breakDurationSignal()).toBe(1);
    });

    it('should clamp break duration to max 60', () => {
      facade.setBreakDuration(100);
      facade.save();
      expect(facade.breakDurationSignal()).toBe(60);
    });

    it('should clamp long break duration to min 1', () => {
      facade.setLongBreakDuration(0);
      facade.save();
      expect(facade.longBreakDurationSignal()).toBe(1);
    });

    it('should clamp long break duration to max 60', () => {
      facade.setLongBreakDuration(100);
      facade.save();
      expect(facade.longBreakDurationSignal()).toBe(60);
    });

    it('should clamp sessions before long break to min 1', () => {
      facade.setSessionsBeforeLongBreak(0);
      facade.save();
      expect(facade.sessionsBeforeLongBreakSignal()).toBe(1);
    });

    it('should clamp sessions before long break to max 10', () => {
      facade.setSessionsBeforeLongBreak(20);
      facade.save();
      expect(facade.sessionsBeforeLongBreakSignal()).toBe(10);
    });

    it('should save preferences and reload pomodoro settings on success', () => {
      facade.init();
      facade.setWorkDuration(40);
      facade.save();

      expect(prefsMock.updatePreferences).toHaveBeenCalledWith(
        jasmine.objectContaining({ pomodoro_work_duration: 40 }),
      );
      expect(pomodoroMock.reloadSettings).toHaveBeenCalled();
      expect(facade.isSavingSignal()).toBeFalse();
      expect(facade.savedSignal()).toBeTrue();
    });

    it('should set isSaving to true during save', () => {
      // Use a delayed observable to capture intermediate state
      let isSavingDuringSave = false;
      prefsMock.updatePreferences.and.callFake(() => {
        isSavingDuringSave = facade.isSavingSignal();
        return of(mockPrefs as any);
      });

      facade.save();

      expect(isSavingDuringSave).toBeTrue();
    });

    it('should clear saved indicator after 2 seconds', fakeAsync(() => {
      facade.save();

      expect(facade.savedSignal()).toBeTrue();

      tick(2000);

      expect(facade.savedSignal()).toBeFalse();
    }));

    it('should clear previous saved timer on re-save', fakeAsync(() => {
      facade.save();
      expect(facade.savedSignal()).toBeTrue();

      tick(1000);
      facade.save();
      expect(facade.savedSignal()).toBeTrue();

      tick(1500);
      // Original timer would have fired at 2000ms, but we re-saved at 1000ms
      // So saved should still be true at 2500ms total (1500ms after re-save)
      expect(facade.savedSignal()).toBeTrue();

      tick(500);
      // Now 2000ms after re-save, timer fires
      expect(facade.savedSignal()).toBeFalse();
    }));

    it('should set isSaving to false on error', () => {
      prefsMock.updatePreferences.and.returnValue(throwError(() => new Error('fail')));

      facade.save();

      expect(facade.isSavingSignal()).toBeFalse();
      expect(facade.savedSignal()).toBeFalse();
    });
  });
});
