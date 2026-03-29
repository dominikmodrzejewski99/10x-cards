import { Injectable, inject, signal, DestroyRef } from '@angular/core';
import { UserPreferencesService } from './user-preferences.service';
import { Observable, tap } from 'rxjs';
import { UserPreferencesDTO } from '../../types';

export type PomodoroPhase = 'work' | 'break' | 'longBreak';

interface PomodoroState {
  startedAt: number;
  phase: PomodoroPhase;
  sessionsCompleted: number;
  isRunning: boolean;
  pausedTimeRemaining: number | null;
}

const STORAGE_KEY = '10x_pomodoro_state';

@Injectable({ providedIn: 'root' })
export class PomodoroService {
  private prefsService = inject(UserPreferencesService);
  private destroyRef = inject(DestroyRef);
  private intervalId: ReturnType<typeof setInterval> | null = null;

  // Settings (loaded from Supabase)
  private workDuration = 25 * 60;
  private breakDuration = 5 * 60;
  private longBreakDuration = 15 * 60;
  private sessionsBeforeLongBreak = 4;
  private soundEnabled = true;
  private notificationsEnabled = true;
  private settingsLoaded = false;

  // Signals (private writable, public readonly)
  private readonly _timeRemaining = signal(0);
  private readonly _phase = signal<PomodoroPhase>('work');
  private readonly _isRunning = signal(false);
  private readonly _sessionsCompleted = signal(0);

  public readonly timeRemaining = this._timeRemaining.asReadonly();
  public readonly phase = this._phase.asReadonly();
  public readonly isRunning = this._isRunning.asReadonly();
  public readonly sessionsCompleted = this._sessionsCompleted.asReadonly();

  private startedAt: number = 0;

  constructor() {
    this.destroyRef.onDestroy(() => this.clearInterval());

    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => this.persistState());
    }
  }

  loadSettings(): Observable<UserPreferencesDTO> {
    return this.prefsService.getPreferences().pipe(
      tap(prefs => {
        this.workDuration = (prefs.pomodoro_work_duration ?? 25) * 60;
        this.breakDuration = (prefs.pomodoro_break_duration ?? 5) * 60;
        this.longBreakDuration = (prefs.pomodoro_long_break_duration ?? 15) * 60;
        this.sessionsBeforeLongBreak = prefs.pomodoro_sessions_before_long_break ?? 4;
        this.soundEnabled = prefs.pomodoro_sound_enabled ?? true;
        this.notificationsEnabled = prefs.pomodoro_notifications_enabled ?? true;
        this.settingsLoaded = true;
      })
    );
  }

  start(): void {
    if (!this.settingsLoaded) return;
    this.startedAt = Date.now();
    this._timeRemaining.set(this.getDurationForPhase(this._phase()));
    this._isRunning.set(true);
    this.startInterval();
    this.persistState();
  }

  pause(): void {
    this.clearInterval();
    this._isRunning.set(false);
    this.persistState();
  }

  resume(): void {
    this.startedAt = Date.now() - (this.getDurationForPhase(this._phase()) - this._timeRemaining()) * 1000;
    this._isRunning.set(true);
    this.startInterval();
    this.persistState();
  }

  reset(): void {
    this.clearInterval();
    this._isRunning.set(false);
    this._phase.set('work');
    this._sessionsCompleted.set(0);
    this._timeRemaining.set(0);
    this.startedAt = 0;
    localStorage.removeItem(STORAGE_KEY);
  }

  skip(): void {
    this.clearInterval();
    this.transitionToNextPhase();
  }

  /** Call after saving settings in SettingsPage to pick up new durations */
  reloadSettings(): void {
    this.prefsService.clearCache();
    this.loadSettings().subscribe();
  }

  restoreState(): void {
    if (!this.settingsLoaded) return;
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;

    try {
      const state: PomodoroState = JSON.parse(raw);
      const phaseDuration = this.getDurationForPhase(state.phase);

      if (state.isRunning) {
        const elapsed = Math.floor((Date.now() - state.startedAt) / 1000);
        const remaining = phaseDuration - elapsed;

        if (remaining <= 0) {
          this.reset();
          return;
        }

        this._phase.set(state.phase);
        this._sessionsCompleted.set(state.sessionsCompleted);
        this.startedAt = state.startedAt;
        this._timeRemaining.set(remaining);
        this._isRunning.set(true);
        this.startInterval();
      } else if (state.pausedTimeRemaining !== null) {
        this._phase.set(state.phase);
        this._sessionsCompleted.set(state.sessionsCompleted);
        this._timeRemaining.set(state.pausedTimeRemaining);
        this._isRunning.set(false);
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }

  private startInterval(): void {
    this.clearInterval();
    this.intervalId = setInterval(() => {
      if (!this._isRunning()) return;

      const elapsed = Math.floor((Date.now() - this.startedAt) / 1000);
      const phaseDuration = this.getDurationForPhase(this._phase());
      const remaining = Math.max(0, phaseDuration - elapsed);
      this._timeRemaining.set(remaining);

      if (remaining <= 0) {
        this.onPhaseComplete();
      }
    }, 1000);
  }

  private onPhaseComplete(): void {
    this.clearInterval();
    this.playSound();
    this.sendNotification();
    this.transitionToNextPhase();
  }

  private transitionToNextPhase(): void {
    const currentPhase = this._phase();

    if (currentPhase === 'work') {
      const completed = this._sessionsCompleted() + 1;
      this._sessionsCompleted.set(completed);

      if (completed % this.sessionsBeforeLongBreak === 0) {
        this._phase.set('longBreak');
      } else {
        this._phase.set('break');
      }
    } else {
      this._phase.set('work');
    }

    this.startedAt = Date.now();
    this._timeRemaining.set(this.getDurationForPhase(this._phase()));
    this._isRunning.set(true);
    this.startInterval();
    this.persistState();
  }

  private getDurationForPhase(phase: PomodoroPhase): number {
    switch (phase) {
      case 'work': return this.workDuration;
      case 'break': return this.breakDuration;
      case 'longBreak': return this.longBreakDuration;
    }
  }

  private playSound(): void {
    if (!this.soundEnabled) return;
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(830, ctx.currentTime);
      osc.frequency.setValueAtTime(660, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.8);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.8);
      osc.onended = () => ctx.close();
    } catch { /* ignore audio errors */ }
  }

  private sendNotification(): void {
    if (!this.notificationsEnabled) return;
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;

    const title = this._phase() === 'work' ? 'Czas na nauk\u0119!' : 'Czas na przerw\u0119!';
    const body = this._phase() === 'work'
      ? `Sesja ${this._sessionsCompleted() + 1} \u2014 do dzie\u0142a!`
      : 'Odpocznij chwil\u0119, wr\u00f3\u0107 z now\u0105 energi\u0105.';

    new Notification(title, { body, icon: 'assets/icons/icon-192x192.png' });
  }

  private persistState(): void {
    const state: PomodoroState = {
      startedAt: this.startedAt,
      phase: this._phase(),
      sessionsCompleted: this._sessionsCompleted(),
      isRunning: this._isRunning(),
      pausedTimeRemaining: this._isRunning() ? null : this._timeRemaining()
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  private clearInterval(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
}
