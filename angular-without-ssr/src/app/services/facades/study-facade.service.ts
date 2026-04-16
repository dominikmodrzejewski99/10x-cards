import { Injectable, inject, signal, computed, Signal, WritableSignal } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import { Subscription } from 'rxjs';
import { ReviewApiService } from '../api/review-api.service';
import { FlashcardSetApiService } from '../api/flashcard-set-api.service';
import { Sm2Result, SpacedRepetitionService } from '../domain/spaced-repetition.service';
import { StreakService } from '../../shared/services/streak.service';
import { UsageEventsApiService } from '../api/usage-events-api.service';
import { LoggerService } from '../infrastructure/logger.service';
import { FlashcardSetDTO, ReviewQuality, SessionResultDTO, StudyCardDTO } from '../../../types';
import { launchConfetti } from '../../shared/utils/confetti';
import { ClassifiedError, classifyError } from '../../shared/utils/error-classifier';

@Injectable({ providedIn: 'root' })
export class StudyFacadeService {
  private readonly reviewApi: ReviewApiService = inject(ReviewApiService);
  private readonly setApi: FlashcardSetApiService = inject(FlashcardSetApiService);
  private readonly sm2: SpacedRepetitionService = inject(SpacedRepetitionService);
  private readonly streakService: StreakService = inject(StreakService);
  private readonly usageEvents: UsageEventsApiService = inject(UsageEventsApiService);
  private readonly t: TranslocoService = inject(TranslocoService);
  private readonly logger: LoggerService = inject(LoggerService);

  /** Session ID sent with every usage event so fraud-analysis can cluster
   *  bursts from the same session. Reset whenever due cards are (re)loaded. */
  private currentSessionId: string | null = null;

  private readonly _dueCards: WritableSignal<StudyCardDTO[]> = signal<StudyCardDTO[]>([]);
  private readonly _originalCards: WritableSignal<StudyCardDTO[]> = signal<StudyCardDTO[]>([]);
  private readonly _sets: WritableSignal<FlashcardSetDTO[]> = signal<FlashcardSetDTO[]>([]);
  private readonly _selectedSetId: WritableSignal<number | null> = signal<number | null>(null);
  private readonly _failedCards: WritableSignal<StudyCardDTO[]> = signal<StudyCardDTO[]>([]);
  private readonly _currentIndex: WritableSignal<number> = signal<number>(0);
  private readonly _sessionResults: WritableSignal<SessionResultDTO> = signal<SessionResultDTO>({ known: 0, hard: 0, unknown: 0, total: 0 });
  private readonly _nextReviewDate: WritableSignal<string | null> = signal<string | null>(null);

  private readonly _isFlipped: WritableSignal<boolean> = signal<boolean>(false);
  private readonly _skipTransition: WritableSignal<boolean> = signal<boolean>(false);
  private readonly _isShuffled: WritableSignal<boolean> = signal<boolean>(false);
  private readonly _isReversed: WritableSignal<boolean> = signal<boolean>(false);
  private readonly _trackProgress: WritableSignal<boolean> = signal<boolean>(true);
  private readonly _isSessionComplete: WritableSignal<boolean> = signal<boolean>(false);

  private readonly _loading: WritableSignal<boolean> = signal<boolean>(true);
  private readonly _saving: WritableSignal<boolean> = signal<boolean>(false);
  private readonly _error: WritableSignal<string | null> = signal<string | null>(null);

  private readonly _setSearch: WritableSignal<string> = signal<string>('');

  public readonly dueCardsSignal: Signal<StudyCardDTO[]> = this._dueCards.asReadonly();
  public readonly setsSignal: Signal<FlashcardSetDTO[]> = this._sets.asReadonly();
  public readonly selectedSetIdSignal: Signal<number | null> = this._selectedSetId.asReadonly();
  public readonly failedCardsSignal: Signal<StudyCardDTO[]> = this._failedCards.asReadonly();
  public readonly currentIndexSignal: Signal<number> = this._currentIndex.asReadonly();
  public readonly sessionResultsSignal: Signal<SessionResultDTO> = this._sessionResults.asReadonly();
  public readonly nextReviewDateSignal: Signal<string | null> = this._nextReviewDate.asReadonly();

  public readonly isFlippedSignal: Signal<boolean> = this._isFlipped.asReadonly();
  public readonly skipTransitionSignal: Signal<boolean> = this._skipTransition.asReadonly();
  public readonly isShuffledSignal: Signal<boolean> = this._isShuffled.asReadonly();
  public readonly isReversedSignal: Signal<boolean> = this._isReversed.asReadonly();
  public readonly trackProgressSignal: Signal<boolean> = this._trackProgress.asReadonly();
  public readonly isSessionCompleteSignal: Signal<boolean> = this._isSessionComplete.asReadonly();

  public readonly loadingSignal: Signal<boolean> = this._loading.asReadonly();
  public readonly savingSignal: Signal<boolean> = this._saving.asReadonly();
  public readonly errorSignal: Signal<string | null> = this._error.asReadonly();
  public readonly setSearchSignal: Signal<string> = this._setSearch.asReadonly();

  public readonly currentCardSignal: Signal<StudyCardDTO | null> = computed<StudyCardDTO | null>(() => {
    const cards: StudyCardDTO[] = this._dueCards();
    const idx: number = this._currentIndex();
    return cards.length > 0 && idx < cards.length ? cards[idx] : null;
  });

  public readonly failedCountSignal: Signal<number> = computed<number>(() => this._failedCards().length);

  public readonly progressPercentSignal: Signal<number> = computed<number>(() => {
    const total: number = this._dueCards().length;
    if (total === 0) return 0;
    return Math.round(((this._currentIndex() + 1) / total) * 100);
  });

  public readonly displayFrontSignal: Signal<string> = computed<string>(() => {
    const card: StudyCardDTO | null = this.currentCardSignal();
    if (!card) return '';
    if (this._isReversed()) {
      return card.flashcard.back.split(';')[0].trim();
    }
    return card.flashcard.front;
  });

  public readonly displayBackSignal: Signal<string> = computed<string>(() => {
    const card: StudyCardDTO | null = this.currentCardSignal();
    if (!card) return '';
    if (this._isReversed()) {
      return card.flashcard.front;
    }
    const back: string = card.flashcard.back;
    if (back.includes(';')) {
      return back.split(';').map((m: string) => m.trim()).filter((m: string) => m).join('\n• ');
    }
    return back;
  });

  public readonly displayFrontImageSignal: Signal<string | null> = computed<string | null>(() => {
    const card: StudyCardDTO | null = this.currentCardSignal();
    if (!card) return null;
    return this._isReversed() ? null : card.flashcard.front_image_url;
  });

  public readonly displayBackAudioSignal: Signal<string | null> = computed<string | null>(() => {
    const card: StudyCardDTO | null = this.currentCardSignal();
    if (!card) return null;
    return this._isReversed() ? null : card.flashcard.back_audio_url;
  });

  public readonly currentSetNameSignal: Signal<string | null> = computed<string | null>(() => {
    const setId: number | null = this._selectedSetId();
    if (!setId) return null;
    const found: FlashcardSetDTO | undefined = this._sets().find((s: FlashcardSetDTO) => s.id === setId);
    return found?.name ?? null;
  });

  public readonly filteredSetsSignal: Signal<FlashcardSetDTO[]> = computed<FlashcardSetDTO[]>(() => {
    const search: string = this._setSearch().toLowerCase().trim();
    if (!search) return this._sets();
    return this._sets().filter((s: FlashcardSetDTO) => s.name.toLowerCase().includes(search));
  });

  private loadSubscription: Subscription | null = null;
  private answerSubscription: Subscription | null = null;

  public loadSets(): void {
    this.setApi.getSets().subscribe({
      next: (sets: FlashcardSetDTO[]) => {
        this._sets.set(sets);
      },
      error: () => {
        // Sets list is non-critical — study can proceed without it
      }
    });
  }

  public selectSet(setId: number | null): void {
    this._selectedSetId.set(setId);
    this.loadDueCards();
  }

  public loadDueCards(): void {
    this.loadSubscription?.unsubscribe();
    this._loading.set(true);
    this._error.set(null);
    this._isSessionComplete.set(false);
    this._failedCards.set([]);
    this._sessionResults.set({ known: 0, hard: 0, unknown: 0, total: 0 });

    this.currentSessionId = this.generateSessionId();

    this.loadSubscription = this.reviewApi.getDueCards(this._selectedSetId()).subscribe({
      next: (cards: StudyCardDTO[]) => {
        this._dueCards.set(cards);
        this._originalCards.set([...cards]);
        this._currentIndex.set(0);
        this._isFlipped.set(false);

        if (cards.length === 0) {
          this.loadNextReviewDate();
        } else {
          this._loading.set(false);
        }
      },
      error: (err: unknown) => {
        const classified: ClassifiedError = classifyError(err, this.t.translate('study.errors.loadAction'));
        this._error.set(this.t.translate(classified.messageKey, classified.messageParams));
        this._loading.set(false);
      }
    });
  }

  public flip(): void {
    if (this._dueCards().length === 0 || this._isSessionComplete()) return;
    this._isFlipped.set(true);
  }

  public answer(quality: ReviewQuality): void {
    const card: StudyCardDTO | null = this.currentCardSignal();
    if (!card || this._saving()) return;

    this._saving.set(true);

    const reviewData: Sm2Result = this.sm2.calculateNextReview(card.review, quality);

    this.answerSubscription?.unsubscribe();
    this.answerSubscription = this.reviewApi.saveReview(card.flashcard.id, reviewData).subscribe({
      next: () => {
        // Record the billable usage event (fire-and-forget — failures do not
        // block the study flow). Server resolves author_id from the flashcard.
        // Errors are caught and logged inside UsageEventsApiService.
        this.usageEvents.recordReview(card.flashcard.id, this.currentSessionId).subscribe();

        this._sessionResults.update((r: SessionResultDTO) => ({
          known: quality >= 4 ? r.known + 1 : r.known,
          hard: quality === 3 ? r.hard + 1 : r.hard,
          unknown: quality < 3 ? r.unknown + 1 : r.unknown,
          total: r.total + 1
        }));

        if (this._trackProgress() && quality < 4) {
          this._failedCards.update((cards: StudyCardDTO[]) => [...cards, card]);
        }

        this._saving.set(false);
        this.moveToNextCard();
      },
      error: (err: unknown) => {
        this._saving.set(false);
        const classified: ClassifiedError = classifyError(err, this.t.translate('study.errors.saveAction'));
        this._error.set(this.t.translate(classified.messageKey, classified.messageParams));
      }
    });
  }

  public shuffleCards(): void {
    const cards: StudyCardDTO[] = [...this._dueCards()];
    for (let i: number = cards.length - 1; i > 0; i--) {
      const j: number = Math.floor(Math.random() * (i + 1));
      [cards[i], cards[j]] = [cards[j], cards[i]];
    }
    this._dueCards.set(cards);
    this._currentIndex.set(0);
    this._isFlipped.set(false);
    this._isShuffled.set(true);
  }

  public restoreOrder(): void {
    this._dueCards.set([...this._originalCards()]);
    this._currentIndex.set(0);
    this._isFlipped.set(false);
    this._isShuffled.set(false);
  }

  public toggleTrackProgress(): void {
    this._trackProgress.update((v: boolean) => !v);
    if (!this._trackProgress()) {
      this._failedCards.set([]);
    }
  }

  public toggleDirection(): void {
    this._isReversed.update((v: boolean) => !v);
  }

  public restartWithFailedCards(): void {
    const failed: StudyCardDTO[] = [...this._failedCards()];
    this._dueCards.set(failed);
    this._originalCards.set(failed);
    this._failedCards.set([]);
    this._currentIndex.set(0);
    this._isFlipped.set(false);
    this._isSessionComplete.set(false);
    this._isShuffled.set(false);
    this._error.set(null);
    this._sessionResults.set({ known: 0, hard: 0, unknown: 0, total: 0 });
  }

  public restartSession(): void {
    this._dueCards.set([...this._originalCards()]);
    this._currentIndex.set(0);
    this._isFlipped.set(false);
    this._isSessionComplete.set(false);
    this._isShuffled.set(false);
    this._failedCards.set([]);
    this._error.set(null);
    this._sessionResults.set({ known: 0, hard: 0, unknown: 0, total: 0 });
  }

  public loadExtraPractice(): void {
    this.loadSubscription?.unsubscribe();
    this._loading.set(true);
    this._error.set(null);
    this._isSessionComplete.set(false);
    this._failedCards.set([]);
    this._sessionResults.set({ known: 0, hard: 0, unknown: 0, total: 0 });

    this.loadSubscription = this.reviewApi.getAllCardsWithReviews().subscribe({
      next: (cards: StudyCardDTO[]) => {
        const setId: number | null = this._selectedSetId();
        const filtered: StudyCardDTO[] = setId ? cards.filter((c: StudyCardDTO) => c.flashcard.set_id === setId) : cards;
        this._dueCards.set(filtered);
        this._originalCards.set([...filtered]);
        this._currentIndex.set(0);
        this._isFlipped.set(false);
        this._loading.set(false);
      },
      error: () => {
        this._error.set(this.t.translate('study.errors.loadFailed'));
        this._loading.set(false);
      }
    });
  }

  public updateSetSearch(term: string): void {
    this._setSearch.set(term);
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

  public destroy(): void {
    this.loadSubscription?.unsubscribe();
    this.answerSubscription?.unsubscribe();
  }

  private moveToNextCard(): void {
    const nextIdx: number = this._currentIndex() + 1;
    if (nextIdx >= this._dueCards().length) {
      this._isSessionComplete.set(true);
      this.streakService.recordSession(this._sessionResults().total);
      launchConfetti();
    } else {
      this._skipTransition.set(true);
      this._isFlipped.set(false);
      this._currentIndex.set(nextIdx);
      setTimeout(() => this._skipTransition.set(false));
    }
  }

  private generateSessionId(): string {
    // Browser-native. Prefer crypto.randomUUID; fall back to a timestamp+random
    // string for ancient browsers where crypto.randomUUID is missing.
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    return `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
  }

  private loadNextReviewDate(): void {
    this.loadSubscription = this.reviewApi.getNextReviewDate().subscribe({
      next: (date: string | null) => {
        this._nextReviewDate.set(date);
        this._loading.set(false);
      },
      error: () => {
        this._loading.set(false);
      }
    });
  }
}
