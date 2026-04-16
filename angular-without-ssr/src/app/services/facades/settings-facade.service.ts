import { Injectable, inject, signal, Signal } from '@angular/core';
import { UserPreferencesService } from '../domain/user-preferences.service';
import { PomodoroService } from '../domain/pomodoro.service';
import { ThemeService, Theme } from '../domain/theme.service';
import { LanguageService } from '../domain/language.service';
import { LoggerService } from '../infrastructure/logger.service';
import { AppLanguage } from '../../../types';

@Injectable({ providedIn: 'root' })
export class SettingsFacadeService {
  private readonly prefsService: UserPreferencesService = inject(UserPreferencesService);
  private readonly pomodoroService: PomodoroService = inject(PomodoroService);
  private readonly themeService: ThemeService = inject(ThemeService);
  private readonly languageService: LanguageService = inject(LanguageService);
  private readonly logger: LoggerService = inject(LoggerService);

  private readonly _workDuration = signal<number>(25);
  private readonly _breakDuration = signal<number>(5);
  private readonly _longBreakDuration = signal<number>(15);
  private readonly _sessionsBeforeLongBreak = signal<number>(4);
  private readonly _soundEnabled = signal<boolean>(true);
  private readonly _notificationsEnabled = signal<boolean>(true);
  private readonly _isSaving = signal<boolean>(false);
  private readonly _saved = signal<boolean>(false);

  public readonly workDurationSignal = this._workDuration.asReadonly();
  public readonly breakDurationSignal = this._breakDuration.asReadonly();
  public readonly longBreakDurationSignal = this._longBreakDuration.asReadonly();
  public readonly sessionsBeforeLongBreakSignal = this._sessionsBeforeLongBreak.asReadonly();
  public readonly soundEnabledSignal = this._soundEnabled.asReadonly();
  public readonly notificationsEnabledSignal = this._notificationsEnabled.asReadonly();
  public readonly isSavingSignal = this._isSaving.asReadonly();
  public readonly savedSignal = this._saved.asReadonly();

  public readonly themeSignal: Signal<Theme> = this.themeService.theme;
  public readonly languageSignal: Signal<AppLanguage> = this.languageService.language;

  private savedTimer: ReturnType<typeof setTimeout> | null = null;

  public init(): void {
    this.prefsService.getPreferences().subscribe({
      next: (prefs) => {
        this._workDuration.set(prefs.pomodoro_work_duration);
        this._breakDuration.set(prefs.pomodoro_break_duration);
        this._longBreakDuration.set(prefs.pomodoro_long_break_duration);
        this._sessionsBeforeLongBreak.set(prefs.pomodoro_sessions_before_long_break);
        this._soundEnabled.set(prefs.pomodoro_sound_enabled);
        this._notificationsEnabled.set(prefs.pomodoro_notifications_enabled);
      },
      error: (err: unknown) => this.logger.error('SettingsFacadeService.init', err),
    });
  }

  public setWorkDuration(v: number): void {
    this._workDuration.set(v);
  }

  public setBreakDuration(v: number): void {
    this._breakDuration.set(v);
  }

  public setLongBreakDuration(v: number): void {
    this._longBreakDuration.set(v);
  }

  public setSessionsBeforeLongBreak(v: number): void {
    this._sessionsBeforeLongBreak.set(v);
  }

  public setSoundEnabled(v: boolean): void {
    this._soundEnabled.set(v);
  }

  public setNotificationsEnabled(v: boolean): void {
    this._notificationsEnabled.set(v);
  }

  public setTheme(theme: Theme): void {
    this.themeService.setTheme(theme);
  }

  public setLanguage(lang: AppLanguage): void {
    this.languageService.setLanguage(lang);
  }

  public save(): void {
    // Clamp values
    this._workDuration.set(Math.min(120, Math.max(1, this._workDuration())));
    this._breakDuration.set(Math.min(60, Math.max(1, this._breakDuration())));
    this._longBreakDuration.set(Math.min(60, Math.max(1, this._longBreakDuration())));
    this._sessionsBeforeLongBreak.set(Math.min(10, Math.max(1, this._sessionsBeforeLongBreak())));

    this._isSaving.set(true);

    // Clear existing saved timer on re-save
    if (this.savedTimer !== null) {
      clearTimeout(this.savedTimer);
      this.savedTimer = null;
    }

    this.prefsService.updatePreferences({
      pomodoro_work_duration: this._workDuration(),
      pomodoro_break_duration: this._breakDuration(),
      pomodoro_long_break_duration: this._longBreakDuration(),
      pomodoro_sessions_before_long_break: this._sessionsBeforeLongBreak(),
      pomodoro_sound_enabled: this._soundEnabled(),
      pomodoro_notifications_enabled: this._notificationsEnabled(),
    }).subscribe({
      next: () => {
        this.pomodoroService.reloadSettings();
        this._saved.set(true);
        this._isSaving.set(false);
        this.savedTimer = setTimeout(() => this._saved.set(false), 2000);
      },
      error: () => {
        this._isSaving.set(false);
      },
    });
  }
}
