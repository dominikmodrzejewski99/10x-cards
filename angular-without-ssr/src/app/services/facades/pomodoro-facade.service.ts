import { Injectable, inject, signal, Signal, WritableSignal } from '@angular/core';
import { PomodoroService, PomodoroPhase } from '../domain/pomodoro.service';
import { UserPreferencesService } from '../domain/user-preferences.service';

@Injectable({ providedIn: 'root' })
export class PomodoroFacadeService {
  private readonly pomodoroService: PomodoroService = inject(PomodoroService);
  private readonly prefsService: UserPreferencesService = inject(UserPreferencesService);

  private readonly _showFocusReminder: WritableSignal<boolean> = signal<boolean>(false);
  private readonly _focusReminderDismissed: WritableSignal<boolean> = signal<boolean>(false);
  private readonly _sessionsBeforeLongBreak: WritableSignal<number> = signal<number>(4);

  public readonly showFocusReminderSignal: Signal<boolean> = this._showFocusReminder.asReadonly();
  public readonly focusReminderDismissedSignal: Signal<boolean> = this._focusReminderDismissed.asReadonly();
  public readonly sessionsBeforeLongBreakSignal: Signal<number> = this._sessionsBeforeLongBreak.asReadonly();

  // Pass-through signals from PomodoroService
  public readonly isRunningSignal: Signal<boolean> = this.pomodoroService.isRunning;
  public readonly timeRemainingSignal: Signal<number> = this.pomodoroService.timeRemaining;
  public readonly phaseSignal: Signal<PomodoroPhase> = this.pomodoroService.phase;
  public readonly sessionsCompletedSignal: Signal<number> = this.pomodoroService.sessionsCompleted;

  public init(): void {
    this.pomodoroService.loadSettings().subscribe(() => {
      this.pomodoroService.restoreState();
    });

    this.prefsService.getPreferences().subscribe((prefs) => {
      this._focusReminderDismissed.set(prefs.pomodoro_focus_reminder_dismissed ?? false);
      this._sessionsBeforeLongBreak.set(prefs.pomodoro_sessions_before_long_break ?? 4);
    });
  }

  public start(): boolean {
    if (!this._focusReminderDismissed()) {
      this._showFocusReminder.set(true);
      return false;
    }
    this.pomodoroService.start();
    return true;
  }

  public startConfirmed(dontShowAgain: boolean): void {
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }

    this._showFocusReminder.set(false);

    if (dontShowAgain) {
      this._focusReminderDismissed.set(true);
      this.prefsService.updatePreferences({
        pomodoro_focus_reminder_dismissed: true,
      }).subscribe();
    }

    this.pomodoroService.start();
  }

  public dismissFocusReminder(): void {
    this._showFocusReminder.set(false);
  }

  public pause(): void {
    this.pomodoroService.pause();
  }

  public resume(): void {
    this.pomodoroService.resume();
  }

  public reset(): void {
    this.pomodoroService.reset();
  }

  public skip(): void {
    this.pomodoroService.skip();
  }

  public formatTime(seconds: number): string {
    const m: number = Math.floor(seconds / 60);
    const s: number = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }

  public getDefaultDuration(): number {
    return 25 * 60;
  }
}
