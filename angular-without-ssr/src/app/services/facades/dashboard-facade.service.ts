import { Injectable, inject, signal, computed, Signal, WritableSignal } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import { forkJoin } from 'rxjs';
import { ReviewApiService } from '../api/review-api.service';
import { FlashcardSetApiService } from '../api/flashcard-set-api.service';
import { ReviewReminderService } from '../../shared/services/review-reminder.service';
import { StreakService } from '../../shared/services/streak.service';
import { FlashcardSetDTO, StudyCardDTO } from '../../../types';

export interface CardBreakdown {
  newCards: number;
  learning: number;
  reviewing: number;
  mastered: number;
  due: number;
  total: number;
}

@Injectable({ providedIn: 'root' })
export class DashboardFacadeService {
  private readonly reviewApi: ReviewApiService = inject(ReviewApiService);
  private readonly setApi: FlashcardSetApiService = inject(FlashcardSetApiService);
  private readonly reminderService: ReviewReminderService = inject(ReviewReminderService);
  private readonly streakService: StreakService = inject(StreakService);
  private readonly t: TranslocoService = inject(TranslocoService);

  private readonly _loading: WritableSignal<boolean> = signal<boolean>(true);
  private readonly _errorMessage: WritableSignal<string | null> = signal<string | null>(null);
  private readonly _sets: WritableSignal<FlashcardSetDTO[]> = signal<FlashcardSetDTO[]>([]);
  private readonly _nextReviewDate: WritableSignal<string | null> = signal<string | null>(null);
  private readonly _breakdown: WritableSignal<CardBreakdown> = signal<CardBreakdown>({
    newCards: 0, learning: 0, reviewing: 0, mastered: 0, due: 0, total: 0
  });
  private readonly _reminderVisible: WritableSignal<boolean> = signal<boolean>(false);
  private readonly _reminderDueCount: WritableSignal<number> = signal<number>(0);

  public readonly loadingSignal: Signal<boolean> = this._loading.asReadonly();
  public readonly errorMessageSignal: Signal<string | null> = this._errorMessage.asReadonly();
  public readonly setsSignal: Signal<FlashcardSetDTO[]> = this._sets.asReadonly();
  public readonly nextReviewDateSignal: Signal<string | null> = this._nextReviewDate.asReadonly();
  public readonly breakdownSignal: Signal<CardBreakdown> = this._breakdown.asReadonly();
  public readonly reminderVisibleSignal: Signal<boolean> = this._reminderVisible.asReadonly();
  public readonly reminderDueCountSignal: Signal<number> = this._reminderDueCount.asReadonly();

  public readonly currentStreakSignal: Signal<number> = this.streakService.currentStreak;
  public readonly longestStreakSignal: Signal<number> = this.streakService.longestStreak;
  public readonly totalSessionsSignal: Signal<number> = this.streakService.totalSessions;
  public readonly totalCardsReviewedSignal: Signal<number> = this.streakService.totalCardsReviewed;
  public readonly studiedTodaySignal: Signal<boolean> = this.streakService.studiedToday;

  public readonly totalSetsSignal: Signal<number> = computed<number>(() => this._sets().length);
  public readonly totalCardsSignal: Signal<number> = computed<number>(() => this._breakdown().total);
  public readonly dueCountSignal: Signal<number> = computed<number>(() => this._breakdown().due);

  public readonly uptodatePercentSignal: Signal<number> = computed<number>(() => {
    const b: CardBreakdown = this._breakdown();
    if (b.total === 0) return 0;
    return Math.round(((b.total - b.due) / b.total) * 100);
  });

  public readonly greetingSignal: Signal<string> = computed<string>(() => {
    const hour: number = new Date().getHours();
    if (hour < 6) return 'Nocna nauka?';
    if (hour < 12) return 'Dzień dobry';
    if (hour < 18) return 'Cześć';
    return 'Dobry wieczór';
  });

  public loadStreaks(): void {
    this.streakService.loadFromDb();
  }

  public loadData(): void {
    this._loading.set(true);
    this._errorMessage.set(null);
    forkJoin({
      allCards: this.reviewApi.getAllCardsWithReviews(),
      sets: this.setApi.getSets(),
      nextReview: this.reviewApi.getNextReviewDate()
    }).subscribe({
      next: ({ allCards, sets, nextReview }) => {
        this._breakdown.set(this.computeBreakdown(allCards));
        this._sets.set(sets);
        this._nextReviewDate.set(nextReview);
        this._loading.set(false);
        this.checkReminder();
      },
      error: (err: unknown) => {
        this._loading.set(false);
        const isOffline: boolean = !navigator.onLine;
        if (isOffline) {
          this._errorMessage.set(this.t.translate('dashboard.errors.offline'));
        } else if ((err as { status?: number })?.status === 401) {
          this._errorMessage.set(this.t.translate('dashboard.errors.sessionExpired'));
        } else {
          this._errorMessage.set(this.t.translate('dashboard.errors.loadFailed'));
        }
      }
    });
  }

  public dismissReminder(): void {
    this._reminderVisible.set(false);
  }

  public formatDate(isoDate: string): string {
    const date: Date = new Date(isoDate);
    const now: Date = new Date();
    const diffMs: number = date.getTime() - now.getTime();
    const diffH: number = Math.round(diffMs / (1000 * 60 * 60));

    if (diffH > 0 && diffH < 24) return `za ${diffH}h`;
    if (diffH >= 24 && diffH < 48) return 'jutro';

    return date.toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' });
  }

  public formatFullDate(isoDate: string): string {
    return new Date(isoDate).toLocaleDateString('pl-PL', { day: 'numeric', month: 'long' });
  }

  public barWidth(count: number): number {
    const total: number = this._breakdown().total;
    if (total === 0) return 0;
    return Math.round((count / total) * 100);
  }

  private computeBreakdown(cards: StudyCardDTO[]): CardBreakdown {
    const now: Date = new Date();
    let newCards: number = 0;
    let learning: number = 0;
    let reviewing: number = 0;
    let mastered: number = 0;
    let due: number = 0;

    for (const card of cards) {
      const review = card.review;
      if (!review) {
        newCards++;
        due++;
        continue;
      }

      if (new Date(review.next_review_date) <= now) {
        due++;
      }

      const interval: number = review.interval;
      if (interval >= 30) {
        mastered++;
      } else if (interval >= 7) {
        reviewing++;
      } else {
        learning++;
      }
    }

    return { newCards, learning, reviewing, mastered, due, total: cards.length };
  }

  private checkReminder(): void {
    this.reminderService.checkDueCards().subscribe({
      next: (count: number) => {
        if (count > 0) {
          this._reminderDueCount.set(count);
          this._reminderVisible.set(true);
          this.reminderService.markAsShown();
        }
      }
    });
  }
}
