import { Injectable, inject, signal, computed } from '@angular/core';
import { UserPreferencesService } from '../../services/domain/user-preferences.service';

@Injectable({ providedIn: 'root' })
export class StreakService {
  private preferencesService = inject(UserPreferencesService);
  private loaded = false;

  private _currentStreak = signal(0);
  private _longestStreak = signal(0);
  private _totalSessions = signal(0);
  private _totalCardsReviewed = signal(0);
  private _lastStudyDate = signal<string | null>(null);

  readonly currentStreak = this._currentStreak.asReadonly();
  readonly longestStreak = this._longestStreak.asReadonly();
  readonly totalSessions = this._totalSessions.asReadonly();
  readonly totalCardsReviewed = this._totalCardsReviewed.asReadonly();
  readonly studiedToday = computed(() => {
    const last = this._lastStudyDate();
    if (!last) return false;
    return last === this.todayStr();
  });

  /** Load streak data from DB. Call once on dashboard init. */
  loadFromDb(): void {
    if (this.loaded) return;
    this.loaded = true;

    this.preferencesService.getPreferences().subscribe({
      next: (prefs) => {
        this._currentStreak.set(this.computeCurrentStreak(prefs.current_streak, prefs.last_study_date));
        this._longestStreak.set(prefs.longest_streak);
        this._totalSessions.set(prefs.total_sessions);
        this._totalCardsReviewed.set(prefs.total_cards_reviewed);
        this._lastStudyDate.set(prefs.last_study_date);
      }
    });
  }

  /** Record session via DB RPC, update local signals. Silently skips on network error. */
  recordSession(cardsReviewed: number): void {
    this.preferencesService.recordStudySession(cardsReviewed).subscribe({
      next: (prefs) => {
        this._currentStreak.set(prefs.current_streak);
        this._longestStreak.set(prefs.longest_streak);
        this._totalSessions.set(prefs.total_sessions);
        this._totalCardsReviewed.set(prefs.total_cards_reviewed);
        this._lastStudyDate.set(prefs.last_study_date);
      },
      error: () => {
        // Streak will self-correct on next online session
      }
    });
  }

  /** Reset on logout */
  reset(): void {
    this.loaded = false;
    this._currentStreak.set(0);
    this._longestStreak.set(0);
    this._totalSessions.set(0);
    this._totalCardsReviewed.set(0);
    this._lastStudyDate.set(null);
  }

  /**
   * If user missed a day, streak should show 0 even if DB says otherwise.
   * DB gets corrected on next study session.
   */
  private computeCurrentStreak(dbStreak: number, lastDate: string | null): number {
    if (!lastDate) return 0;
    const today = this.todayStr();
    const yesterday = this.yesterdayStr();
    if (lastDate === today || lastDate === yesterday) return dbStreak;
    return 0;
  }

  private todayStr(): string {
    return new Date().toISOString().slice(0, 10);
  }

  private yesterdayStr(): string {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().slice(0, 10);
  }
}
