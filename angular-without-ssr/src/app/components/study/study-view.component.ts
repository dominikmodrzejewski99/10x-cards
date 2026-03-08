import {
  Component,
  ChangeDetectionStrategy,
  OnInit,
  OnDestroy,
  signal,
  computed,
  inject,
  ChangeDetectorRef,
  WritableSignal,
  Signal
} from '@angular/core';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ReviewApiService } from '../../services/review-api.service';
import { FlashcardSetApiService } from '../../services/flashcard-set-api.service';
import { SpacedRepetitionService, Sm2Result } from '../../services/spaced-repetition.service';
import { StudyCardDTO, ReviewQuality, SessionResultDTO, FlashcardSetDTO } from '../../../types';
import { FlashcardFlipComponent } from './flashcard-flip/flashcard-flip.component';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-study-view',
  imports: [RouterModule, FormsModule, FlashcardFlipComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './study-view.component.html',
  styleUrls: ['./study-view.component.scss'],
  host: {
    '(window:keydown)': 'handleKeyboard($event)'
  }
})
export class StudyViewComponent implements OnInit, OnDestroy {
  private reviewApi: ReviewApiService = inject(ReviewApiService);
  private setApi: FlashcardSetApiService = inject(FlashcardSetApiService);
  private sm2: SpacedRepetitionService = inject(SpacedRepetitionService);
  private cdr: ChangeDetectorRef = inject(ChangeDetectorRef);
  private route: ActivatedRoute = inject(ActivatedRoute);
  private loadSubscription: Subscription | null = null;
  private answerSubscription: Subscription | null = null;
  private routeSub: Subscription | null = null;

  public dueCardsSignal: WritableSignal<StudyCardDTO[]> = signal<StudyCardDTO[]>([]);
  private originalCardsSignal: WritableSignal<StudyCardDTO[]> = signal<StudyCardDTO[]>([]);
  public currentIndexSignal: WritableSignal<number> = signal<number>(0);
  public isFlippedSignal: WritableSignal<boolean> = signal<boolean>(false);
  public loadingSignal: WritableSignal<boolean> = signal<boolean>(true);
  public savingSignal: WritableSignal<boolean> = signal<boolean>(false);
  public errorSignal: WritableSignal<string | null> = signal<string | null>(null);
  public isSessionCompleteSignal: WritableSignal<boolean> = signal<boolean>(false);
  public nextReviewDateSignal: WritableSignal<string | null> = signal<string | null>(null);
  public sessionResultsSignal: WritableSignal<SessionResultDTO> = signal<SessionResultDTO>({
    known: 0,
    unknown: 0,
    total: 0
  });

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

  public progressPercentSignal: Signal<number> = computed<number>(() => {
    const total: number = this.dueCardsSignal().length;
    if (total === 0) return 0;
    return Math.round(((this.currentIndexSignal() + 1) / total) * 100);
  });

  public ngOnInit(): void {
    this.loadSets();
    this.routeSub = this.route.queryParams.subscribe(params => {
      const setId = params['setId'] ? Number(params['setId']) : null;
      this.selectedSetIdSignal.set(setId);
      this.loadDueCards();
    });
  }

  public ngOnDestroy(): void {
    this.loadSubscription?.unsubscribe();
    this.answerSubscription?.unsubscribe();
    this.routeSub?.unsubscribe();
  }

  private loadSets(): void {
    this.setApi.getSets().subscribe({
      next: (sets) => {
        this.setsSignal.set(sets);
        this.cdr.markForCheck();
      }
    });
  }

  public onSetChange(setId: number | null): void {
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
          this.answer(1);
        }
        break;
      case '2':
        if (this.isFlippedSignal()) {
          this.answer(4);
        }
        break;
    }
  }

  public loadDueCards(): void {
    this.loadSubscription?.unsubscribe();
    this.loadingSignal.set(true);
    this.errorSignal.set(null);
    this.isSessionCompleteSignal.set(false);
    this.sessionResultsSignal.set({ known: 0, unknown: 0, total: 0 });

    this.loadSubscription = this.reviewApi.getDueCards(this.selectedSetIdSignal()).subscribe({
      next: (cards: StudyCardDTO[]) => {
        this.dueCardsSignal.set(cards);
        this.originalCardsSignal.set([...cards]);
        this.currentIndexSignal.set(0);
        this.isFlippedSignal.set(false);
        this.loadingSignal.set(false);

        if (cards.length === 0) {
          this.loadNextReviewDate();
        }

        this.cdr.markForCheck();
      },
      error: () => {
        this.errorSignal.set('Nie udało się załadować fiszek. Spróbuj ponownie.');
        this.loadingSignal.set(false);
        this.cdr.markForCheck();
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
          known: quality >= 3 ? r.known + 1 : r.known,
          unknown: quality < 3 ? r.unknown + 1 : r.unknown,
          total: r.total + 1
        }));

        this.savingSignal.set(false);
        this.moveToNextCard();
        this.cdr.markForCheck();
      },
      error: () => {
        this.savingSignal.set(false);
        this.errorSignal.set('Nie udało się zapisać odpowiedzi. Spróbuj ponownie.');
        this.cdr.markForCheck();
      }
    });
  }

  public restartSession(): void {
    this.dueCardsSignal.set([...this.originalCardsSignal()]);
    this.currentIndexSignal.set(0);
    this.isFlippedSignal.set(false);
    this.isSessionCompleteSignal.set(false);
    this.errorSignal.set(null);
    this.sessionResultsSignal.set({ known: 0, unknown: 0, total: 0 });
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
    } else {
      this.currentIndexSignal.set(nextIdx);
      this.isFlippedSignal.set(false);
    }
  }

  private loadNextReviewDate(): void {
    this.loadSubscription = this.reviewApi.getNextReviewDate().subscribe({
      next: (date: string | null) => {
        this.nextReviewDateSignal.set(date);
        this.cdr.markForCheck();
      }
    });
  }
}
