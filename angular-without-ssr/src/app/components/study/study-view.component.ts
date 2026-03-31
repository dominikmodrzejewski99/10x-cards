import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  OnDestroy,
  OnInit,
  signal,
  Signal,
  ViewChild,
  WritableSignal
} from '@angular/core';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {ActivatedRoute, RouterModule} from '@angular/router';
import {FormsModule} from '@angular/forms';
import {ReviewApiService} from '../../services/review-api.service';
import {FlashcardSetApiService} from '../../services/flashcard-set-api.service';
import {Sm2Result, SpacedRepetitionService} from '../../services/spaced-repetition.service';
import {StreakService} from '../../shared/services/streak.service';
import {FlashcardSetDTO, ReviewQuality, SessionResultDTO, StudyCardDTO} from '../../../types';
import {FlashcardFlipComponent} from './flashcard-flip/flashcard-flip.component';
import {SyncStatusComponent} from '../../shared/components/sync-status/sync-status.component';
import {NgxSkeletonLoaderModule} from 'ngx-skeleton-loader';
import {TranslocoDirective} from '@jsverse/transloco';
import {launchConfetti} from '../../shared/utils/confetti';
import {ClassifiedError, classifyError} from '../../shared/utils/error-classifier';
import {Subscription} from 'rxjs';

@Component({
  selector: 'app-study-view',
  imports: [RouterModule, FormsModule, FlashcardFlipComponent, SyncStatusComponent, NgxSkeletonLoaderModule, TranslocoDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './study-view.component.html',
  styleUrls: ['./study-view.component.scss'],
  host: {
    '(window:keydown)': 'handleKeyboard($event)',
    '(document:fullscreenchange)': 'onFullscreenChange()'
  }
})
export class StudyViewComponent implements OnInit, OnDestroy, AfterViewInit {
  private reviewApi: ReviewApiService = inject(ReviewApiService);
  private setApi: FlashcardSetApiService = inject(FlashcardSetApiService);
  private sm2: SpacedRepetitionService = inject(SpacedRepetitionService);
  private streakService: StreakService = inject(StreakService);
  private route: ActivatedRoute = inject(ActivatedRoute);
  private destroyRef: DestroyRef = inject(DestroyRef);
  private loadSubscription: Subscription | null = null;
  private answerSubscription: Subscription | null = null;

  public isReversedSignal: WritableSignal<boolean> = signal<boolean>(false);
  public isFullscreenSignal: WritableSignal<boolean> = signal<boolean>(false);
  public showSetModalSignal: WritableSignal<boolean> = signal<boolean>(false);
  public setSearchSignal: WritableSignal<string> = signal<string>('');
  public filteredSetsSignal: Signal<FlashcardSetDTO[]> = computed(() => {
    const search = this.setSearchSignal().toLowerCase().trim();
    if (!search) return this.setsSignal();
    return this.setsSignal().filter(s => s.name.toLowerCase().includes(search));
  });
  public dueCardsSignal: WritableSignal<StudyCardDTO[]> = signal<StudyCardDTO[]>([]);
  private originalCardsSignal: WritableSignal<StudyCardDTO[]> = signal<StudyCardDTO[]>([]);
  public isShuffledSignal: WritableSignal<boolean> = signal<boolean>(false);
  public trackProgressSignal: WritableSignal<boolean> = signal<boolean>(true);
  public failedCardsSignal: WritableSignal<StudyCardDTO[]> = signal<StudyCardDTO[]>([]);
  public currentIndexSignal: WritableSignal<number> = signal<number>(0);
  public isFlippedSignal: WritableSignal<boolean> = signal<boolean>(false);
  public skipTransitionSignal: WritableSignal<boolean> = signal<boolean>(false);
  public loadingSignal: WritableSignal<boolean> = signal<boolean>(true);
  public savingSignal: WritableSignal<boolean> = signal<boolean>(false);
  public errorSignal: WritableSignal<string | null> = signal<string | null>(null);
  public isSessionCompleteSignal: WritableSignal<boolean> = signal<boolean>(false);
  public nextReviewDateSignal: WritableSignal<string | null> = signal<string | null>(null);
  public sessionResultsSignal: WritableSignal<SessionResultDTO> = signal<SessionResultDTO>({
    known: 0,
    hard: 0,
    unknown: 0,
    total: 0
  });

  @ViewChild('swipeArea') private swipeAreaRef!: ElementRef<HTMLElement>;

  /* Swipe gesture state */
  public swipeDeltaXSignal: WritableSignal<number> = signal<number>(0);
  public swipeDeltaYSignal: WritableSignal<number> = signal<number>(0);
  public swipeActiveSignal: WritableSignal<boolean> = signal<boolean>(false);
  public swipeDirectionSignal: WritableSignal<'left' | 'right' | 'up' | null> = signal<'left' | 'right' | 'up' | null>(null);
  private touchStartX: number = 0;
  private touchStartY: number = 0;
  private touchStartTime: number = 0;
  private readonly SWIPE_THRESHOLD: number = 60;
  private readonly SWIPE_VELOCITY_THRESHOLD: number = 0.3;

  public setsSignal: WritableSignal<FlashcardSetDTO[]> = signal<FlashcardSetDTO[]>([]);
  public selectedSetIdSignal: WritableSignal<number | null> = signal<number | null>(null);
  public currentSetNameSignal: Signal<string | null> = computed(() => {
    const setId = this.selectedSetIdSignal();
    if (!setId) return null;
    const found = this.setsSignal().find(s => s.id === setId);
    return found?.name ?? null;
  });

  public currentCardSignal: Signal<StudyCardDTO | null> = computed<StudyCardDTO | null>(() => {
    const cards: StudyCardDTO[] = this.dueCardsSignal();
    const idx: number = this.currentIndexSignal();
    return cards.length > 0 && idx < cards.length ? cards[idx] : null;
  });

  public failedCountSignal: Signal<number> = computed<number>(() => this.failedCardsSignal().length);

  public progressPercentSignal: Signal<number> = computed<number>(() => {
    const total: number = this.dueCardsSignal().length;
    if (total === 0) return 0;
    return Math.round(((this.currentIndexSignal() + 1) / total) * 100);
  });

  public displayFrontSignal: Signal<string> = computed<string>(() => {
    const card: StudyCardDTO | null = this.currentCardSignal();
    if (!card) return '';
    if (this.isReversedSignal()) {
      return card.flashcard.back.split(';')[0].trim();
    }
    return card.flashcard.front;
  });

  public displayBackSignal: Signal<string> = computed<string>(() => {
    const card: StudyCardDTO | null = this.currentCardSignal();
    if (!card) return '';
    if (this.isReversedSignal()) {
      return card.flashcard.front;
    }
    const back: string = card.flashcard.back;
    if (back.includes(';')) {
      return back.split(';').map((m: string) => m.trim()).filter((m: string) => m).join('\n• ');
    }
    return back;
  });

  public displayFrontImageSignal: Signal<string | null> = computed<string | null>(() => {
    const card: StudyCardDTO | null = this.currentCardSignal();
    if (!card) return null;
    return this.isReversedSignal() ? null : card.flashcard.front_image_url;
  });

  public displayBackAudioSignal: Signal<string | null> = computed<string | null>(() => {
    const card: StudyCardDTO | null = this.currentCardSignal();
    if (!card) return null;
    return this.isReversedSignal() ? null : card.flashcard.back_audio_url;
  });

  public ngOnInit(): void {
    this.loadSets();
    this.route.queryParams.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(params => {
      const setId = params['setId'] ? Number(params['setId']) : null;
      this.selectedSetIdSignal.set(setId);
      this.loadDueCards();
    });
  }

  public ngAfterViewInit(): void {
    // Touch listeners are bound via template (touchstart), (touchmove), (touchend)
  }

  public onFullscreenChange(): void {
    this.isFullscreenSignal.set(!!document.fullscreenElement);
  }

  public onTouchStart(event: TouchEvent): void {
    if (this.isSessionCompleteSignal() || this.savingSignal()) return;
    const touch = event.touches[0];
    this.touchStartX = touch.clientX;
    this.touchStartY = touch.clientY;
    this.touchStartTime = Date.now();
    this.swipeActiveSignal.set(true);
    this.swipeDeltaXSignal.set(0);
    this.swipeDeltaYSignal.set(0);
    this.swipeDirectionSignal.set(null);
  }

  public onTouchMove(event: TouchEvent): void {
    if (!this.swipeActiveSignal()) return;
    const touch = event.touches[0];
    const dx = touch.clientX - this.touchStartX;
    const dy = touch.clientY - this.touchStartY;
    this.swipeDeltaXSignal.set(dx);
    this.swipeDeltaYSignal.set(dy);

    // Determine direction for visual feedback (only after card is flipped)
    if (this.isFlippedSignal()) {
      const absDx = Math.abs(dx);
      const absDy = Math.abs(dy);
      if (absDx > 20 || absDy > 20) {
        if (dy < -30 && absDy > absDx) {
          this.swipeDirectionSignal.set('up');
        } else if (dx < -20) {
          this.swipeDirectionSignal.set('left');
        } else if (dx > 20) {
          this.swipeDirectionSignal.set('right');
        } else {
          this.swipeDirectionSignal.set(null);
        }
      }
    }

    // Prevent vertical scroll when swiping horizontally on the card
    if (this.isFlippedSignal() && Math.abs(dx) > 10) {
      event.preventDefault();
    }
  }

  public onTouchEnd(): void {
    if (!this.swipeActiveSignal()) return;
    const dx = this.swipeDeltaXSignal();
    const dy = this.swipeDeltaYSignal();
    const elapsed = Date.now() - this.touchStartTime;
    const velocity = Math.max(Math.abs(dx), Math.abs(dy)) / elapsed;
    const meetsThreshold = Math.max(Math.abs(dx), Math.abs(dy)) > this.SWIPE_THRESHOLD
      || velocity > this.SWIPE_VELOCITY_THRESHOLD;

    if (this.isFlippedSignal() && meetsThreshold) {
      const absDx = Math.abs(dx);
      const absDy = Math.abs(dy);
      if (dy < -this.SWIPE_THRESHOLD && absDy > absDx) {
        this.answer(3); // Swipe up = hard
      } else if (dx < -this.SWIPE_THRESHOLD) {
        this.answer(1); // Swipe left = don't know
      } else if (dx > this.SWIPE_THRESHOLD) {
        this.answer(4); // Swipe right = know
      }
    } else if (!this.isFlippedSignal() && Math.abs(dx) < 10 && Math.abs(dy) < 10) {
      // Tap to flip (only if it wasn't a swipe)
      this.flip();
    }

    this.swipeActiveSignal.set(false);
    this.swipeDeltaXSignal.set(0);
    this.swipeDeltaYSignal.set(0);
    this.swipeDirectionSignal.set(null);
  }

  public ngOnDestroy(): void {
    this.loadSubscription?.unsubscribe();
    this.answerSubscription?.unsubscribe();
  }

  private loadSets(): void {
    this.setApi.getSets().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (sets) => {
        this.setsSignal.set(sets);
      },
      error: () => {
        // Sets list is non-critical — study can proceed without it
      }
    });
  }

  public onSetChange(setId: number | null): void {
    const hasProgress = this.currentIndexSignal() > 0 && !this.isSessionCompleteSignal();
    if (hasProgress && !confirm('Zmiana zestawu zresetuje bieżącą sesję. Kontynuować?')) {
      return;
    }
    this.selectedSetIdSignal.set(setId);
    this.loadDueCards();
  }

  public handleKeyboard(event: KeyboardEvent): void {
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
      return;
    }
    if (this.isSessionCompleteSignal() || this.savingSignal()) return;

    switch (event.key) {
      case ' ':
        event.preventDefault();
        if (!this.isFlippedSignal()) {
          this.flip();
        }
        break;
      case '1':
        if (this.isFlippedSignal()) {
          this.answer(4);
        }
        break;
      case '2':
        if (this.isFlippedSignal()) {
          this.answer(3);
        }
        break;
      case '3':
        if (this.isFlippedSignal()) {
          this.answer(1);
        }
        break;
      case 'f':
      case 'F':
        if (!this.showSetModalSignal()) {
          this.toggleFullscreen();
        }
        break;
      case 'Escape':
        if (this.showSetModalSignal()) {
          this.showSetModalSignal.set(false);
        }
        break;
    }
  }

  public loadDueCards(): void {
    this.loadSubscription?.unsubscribe();
    this.loadingSignal.set(true);
    this.errorSignal.set(null);
    this.isSessionCompleteSignal.set(false);
    this.failedCardsSignal.set([]);
    this.sessionResultsSignal.set({ known: 0, hard: 0, unknown: 0, total: 0 });

    this.loadSubscription = this.reviewApi.getDueCards(this.selectedSetIdSignal()).subscribe({
      next: (cards: StudyCardDTO[]) => {
        this.dueCardsSignal.set(cards);
        this.originalCardsSignal.set([...cards]);
        this.currentIndexSignal.set(0);
        this.isFlippedSignal.set(false);

        if (cards.length === 0) {
          this.loadNextReviewDate();
        } else {
          this.loadingSignal.set(false);
        }
      },
      error: (err: unknown) => {
        const classified: ClassifiedError = classifyError(err, 'załadować fiszek');
        this.errorSignal.set(classified.message);
        this.loadingSignal.set(false);
      }
    });
  }

  public flip(): void {
    if (this.dueCardsSignal().length === 0 || this.isSessionCompleteSignal()) return;
    this.isFlippedSignal.set(true);
  }

  public answer(quality: ReviewQuality): void {
    const card: StudyCardDTO | null = this.currentCardSignal();
    if (!card || this.savingSignal()) return;

    this.savingSignal.set(true);

    const reviewData: Sm2Result = this.sm2.calculateNextReview(card.review, quality);

    this.answerSubscription?.unsubscribe();
    this.answerSubscription = this.reviewApi.saveReview(card.flashcard.id, reviewData).subscribe({
      next: () => {
        this.sessionResultsSignal.update((r: SessionResultDTO) => ({
          known: quality >= 4 ? r.known + 1 : r.known,
          hard: quality === 3 ? r.hard + 1 : r.hard,
          unknown: quality < 3 ? r.unknown + 1 : r.unknown,
          total: r.total + 1
        }));

        if (this.trackProgressSignal() && quality < 4) {
          this.failedCardsSignal.update((cards: StudyCardDTO[]) => [...cards, card]);
        }

        this.savingSignal.set(false);
        this.moveToNextCard();

      },
      error: (err: unknown) => {
        this.savingSignal.set(false);
        const classified: ClassifiedError = classifyError(err, 'zapisać odpowiedzi');
        this.errorSignal.set(classified.message);
      }
    });
  }

  public shuffleCards(): void {
    const cards: StudyCardDTO[] = [...this.dueCardsSignal()];
    for (let i: number = cards.length - 1; i > 0; i--) {
      const j: number = Math.floor(Math.random() * (i + 1));
      [cards[i], cards[j]] = [cards[j], cards[i]];
    }
    this.dueCardsSignal.set(cards);
    this.currentIndexSignal.set(0);
    this.isFlippedSignal.set(false);
    this.isShuffledSignal.set(true);
  }

  public restoreOrder(): void {
    this.dueCardsSignal.set([...this.originalCardsSignal()]);
    this.currentIndexSignal.set(0);
    this.isFlippedSignal.set(false);
    this.isShuffledSignal.set(false);
  }

  public toggleTrackProgress(): void {
    this.trackProgressSignal.update((v: boolean) => !v);
    if (!this.trackProgressSignal()) {
      this.failedCardsSignal.set([]);
    }
  }

  public toggleDirection(): void {
    this.isReversedSignal.update((v: boolean) => !v);
  }

  public openSetModal(): void {
    this.setSearchSignal.set('');
    this.showSetModalSignal.set(true);
  }

  public selectSetFromModal(setId: number | null): void {
    this.showSetModalSignal.set(false);
    if (setId !== this.selectedSetIdSignal()) {
      this.selectedSetIdSignal.set(setId);
      this.loadDueCards();
    }
  }

  public toggleFullscreen(): void {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      this.isFullscreenSignal.set(true);
    } else {
      document.exitFullscreen().catch(() => {});
      this.isFullscreenSignal.set(false);
    }
  }


  public restartWithFailedCards(): void {
    const failed: StudyCardDTO[] = [...this.failedCardsSignal()];
    this.dueCardsSignal.set(failed);
    this.originalCardsSignal.set(failed);
    this.failedCardsSignal.set([]);
    this.currentIndexSignal.set(0);
    this.isFlippedSignal.set(false);
    this.isSessionCompleteSignal.set(false);
    this.isShuffledSignal.set(false);
    this.errorSignal.set(null);
    this.sessionResultsSignal.set({ known: 0, hard: 0, unknown: 0, total: 0 });
  }

  public restartSession(): void {
    this.dueCardsSignal.set([...this.originalCardsSignal()]);
    this.currentIndexSignal.set(0);
    this.isFlippedSignal.set(false);
    this.isSessionCompleteSignal.set(false);
    this.isShuffledSignal.set(false);
    this.failedCardsSignal.set([]);
    this.errorSignal.set(null);
    this.sessionResultsSignal.set({ known: 0, hard: 0, unknown: 0, total: 0 });
  }

  public loadExtraPractice(): void {
    this.loadSubscription?.unsubscribe();
    this.loadingSignal.set(true);
    this.errorSignal.set(null);
    this.isSessionCompleteSignal.set(false);
    this.failedCardsSignal.set([]);
    this.sessionResultsSignal.set({ known: 0, hard: 0, unknown: 0, total: 0 });

    this.loadSubscription = this.reviewApi.getAllCardsWithReviews().subscribe({
      next: (cards: StudyCardDTO[]) => {
        const setId: number | null = this.selectedSetIdSignal();
        const filtered: StudyCardDTO[] = setId ? cards.filter((c: StudyCardDTO) => c.flashcard.set_id === setId) : cards;
        this.dueCardsSignal.set(filtered);
        this.originalCardsSignal.set([...filtered]);
        this.currentIndexSignal.set(0);
        this.isFlippedSignal.set(false);
        this.loadingSignal.set(false);

      },
      error: () => {
        this.errorSignal.set('Nie udało się załadować fiszek. Spróbuj ponownie.');
        this.loadingSignal.set(false);

      }
    });
  }

  public formatDate(isoDate: string): string {
    const date: Date = new Date(isoDate);
    return date.toLocaleDateString('pl-PL', {
      day: 'numeric',
      month: 'long',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  private moveToNextCard(): void {
    const nextIdx: number = this.currentIndexSignal() + 1;
    if (nextIdx >= this.dueCardsSignal().length) {
      this.isSessionCompleteSignal.set(true);
      this.streakService.recordSession(this.sessionResultsSignal().total);
      launchConfetti();
    } else {
      this.skipTransitionSignal.set(true);
      this.isFlippedSignal.set(false);
      this.currentIndexSignal.set(nextIdx);
      setTimeout(() => this.skipTransitionSignal.set(false));
    }
  }

  private loadNextReviewDate(): void {
    this.loadSubscription = this.reviewApi.getNextReviewDate().subscribe({
      next: (date: string | null) => {
        this.nextReviewDateSignal.set(date);
        this.loadingSignal.set(false);
      },
      error: () => {
        this.loadingSignal.set(false);
      }
    });
  }
}
