import {
  Component,
  ChangeDetectionStrategy,
  OnInit,
  inject,
  signal,
  computed,
  DestroyRef
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterModule, Router } from '@angular/router';
import { StreakService } from '../../shared/services/streak.service';
import { ReviewReminderService } from '../../shared/services/review-reminder.service';
import { ReviewReminderComponent } from '../../shared/components/review-reminder/review-reminder.component';
import { ReviewApiService } from '../../services/review-api.service';
import { FlashcardSetApiService } from '../../services/flashcard-set-api.service';
import { LanguageTestWidgetComponent } from '../language-test/language-test-widget.component';
import { AuthStore } from '../../auth/store';
import { forkJoin } from 'rxjs';
import { NgxSkeletonLoaderModule } from 'ngx-skeleton-loader';
import { TranslocoDirective } from '@jsverse/transloco';
import { FlashcardSetDTO, StudyCardDTO } from '../../../types';

interface CardBreakdown {
  newCards: number;      // never reviewed
  learning: number;      // reviewed but interval < 7 days
  reviewing: number;     // interval 7–29 days
  mastered: number;      // interval >= 30 days
  due: number;           // due now
  total: number;
}

@Component({
  selector: 'app-dashboard',
  imports: [RouterModule, ReviewReminderComponent, LanguageTestWidgetComponent, NgxSkeletonLoaderModule, TranslocoDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  private streak = inject(StreakService);
  private reviewApi = inject(ReviewApiService);
  private setApi = inject(FlashcardSetApiService);
  private reminderService = inject(ReviewReminderService);
  private router = inject(Router);
  private authStore = inject(AuthStore);
  private destroyRef = inject(DestroyRef);

  isAnonymous = this.authStore.isAnonymous;
  loading = signal(true);
  errorMessage = signal<string | null>(null);
  reminderVisible = signal(false);
  reminderDueCount = signal(0);
  currentStreak = this.streak.currentStreak;
  longestStreak = this.streak.longestStreak;
  totalSessions = this.streak.totalSessions;
  totalCardsReviewed = this.streak.totalCardsReviewed;
  studiedToday = this.streak.studiedToday;

  sets = signal<FlashcardSetDTO[]>([]);
  nextReviewDate = signal<string | null>(null);
  breakdown = signal<CardBreakdown>({
    newCards: 0, learning: 0, reviewing: 0, mastered: 0, due: 0, total: 0
  });

  totalSets = computed(() => this.sets().length);
  totalCards = computed(() => this.breakdown().total);
  dueCount = computed(() => this.breakdown().due);

  uptodatePercent = computed(() => {
    const b = this.breakdown();
    if (b.total === 0) return 0;
    return Math.round(((b.total - b.due) / b.total) * 100);
  });

  greeting = computed(() => {
    const hour = new Date().getHours();
    if (hour < 6) return 'Nocna nauka?';
    if (hour < 12) return 'Dzień dobry';
    if (hour < 18) return 'Cześć';
    return 'Dobry wieczór';
  });

  ngOnInit(): void {
    this.streak.loadFromDb();
    this.loadData();
  }

  public loadData(): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    forkJoin({
      allCards: this.reviewApi.getAllCardsWithReviews(),
      sets: this.setApi.getSets(),
      nextReview: this.reviewApi.getNextReviewDate()
    }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: ({ allCards, sets, nextReview }) => {
        this.breakdown.set(this.computeBreakdown(allCards));
        this.sets.set(sets);
        this.nextReviewDate.set(nextReview);
        this.loading.set(false);
        this.checkReminder();
      },
      error: (err: unknown) => {
        this.loading.set(false);
        const isOffline: boolean = !navigator.onLine;
        if (isOffline) {
          this.errorMessage.set('Brak połączenia z internetem. Sprawdź sieć i odśwież stronę.');
        } else if ((err as { status?: number })?.status === 401) {
          this.errorMessage.set('Sesja wygasła. Zaloguj się ponownie.');
        } else {
          this.errorMessage.set('Nie udało się załadować danych. Spróbuj odświeżyć stronę.');
        }
      }
    });
  }

  private computeBreakdown(cards: StudyCardDTO[]): CardBreakdown {
    const now = new Date();
    let newCards = 0;
    let learning = 0;
    let reviewing = 0;
    let mastered = 0;
    let due = 0;

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

      const interval = review.interval;
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

  barWidth(count: number): number {
    const total = this.breakdown().total;
    if (total === 0) return 0;
    return Math.round((count / total) * 100);
  }

  formatDate(isoDate: string): string {
    const date = new Date(isoDate);
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffH = Math.round(diffMs / (1000 * 60 * 60));

    if (diffH > 0 && diffH < 24) return `za ${diffH}h`;
    if (diffH >= 24 && diffH < 48) return 'jutro';

    return date.toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' });
  }

  formatFullDate(isoDate: string): string {
    return new Date(isoDate).toLocaleDateString('pl-PL', { day: 'numeric', month: 'long' });
  }

  private checkReminder(): void {
    this.reminderService.checkDueCards().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (count) => {
        if (count > 0) {
          this.reminderDueCount.set(count);
          this.reminderVisible.set(true);
          this.reminderService.markAsShown();
          }
      }
    });
  }

  onReminderStudy(): void {
    this.reminderVisible.set(false);
    this.router.navigate(['/study']);
  }

  onReminderDismiss(): void {
    this.reminderVisible.set(false);
  }
}
