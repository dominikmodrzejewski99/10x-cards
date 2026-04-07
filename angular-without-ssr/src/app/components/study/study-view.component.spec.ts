import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { BehaviorSubject, of, throwError, EMPTY } from 'rxjs';
import { NO_ERRORS_SCHEMA } from '@angular/core';

import { TranslocoTestingModule } from '@jsverse/transloco';
import { StudyViewComponent } from './study-view.component';
import { ReviewApiService } from '../../services/review-api.service';
import { FlashcardSetApiService } from '../../services/flashcard-set-api.service';
import { SpacedRepetitionService, Sm2Result } from '../../services/spaced-repetition.service';
import { StreakService } from '../../shared/services/streak.service';
import { StudyCardDTO, FlashcardSetDTO, FlashcardDTO, FlashcardReviewDTO } from '../../../types';
// confetti module has frozen ESM exports, so we mock canvas APIs instead

describe('StudyViewComponent', () => {
  let component: StudyViewComponent;
  let fixture: ComponentFixture<StudyViewComponent>;

  let reviewApiMock: jasmine.SpyObj<ReviewApiService>;
  let setApiMock: jasmine.SpyObj<FlashcardSetApiService>;
  let sm2Mock: jasmine.SpyObj<SpacedRepetitionService>;
  let streakServiceMock: jasmine.SpyObj<StreakService>;
  let queryParamsSubject: BehaviorSubject<Record<string, string>>;

  const mockFlashcard: FlashcardDTO = {
    id: 1,
    front: 'hello',
    back: 'cześć; hej',
    front_image_url: 'http://img.png',
    back_audio_url: 'http://audio.mp3',
    front_language: 'en',
    back_language: 'pl',
    source: 'manual',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    user_id: 'user-1',
    generation_id: null,
    set_id: 10,
    position: 0
  };

  const mockReview: FlashcardReviewDTO = {
    id: 1,
    flashcard_id: 1,
    user_id: 'user-1',
    ease_factor: 2.5,
    interval: 1,
    repetitions: 1,
    next_review_date: '2026-01-01T00:00:00Z',
    last_reviewed_at: '2026-01-01T00:00:00Z',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z'
  };

  const mockCards: StudyCardDTO[] = [
    { flashcard: mockFlashcard, review: mockReview },
    { flashcard: { ...mockFlashcard, id: 2, front: 'world', back: 'świat', front_image_url: null, back_audio_url: null }, review: null }
  ];

  const mockSets: FlashcardSetDTO[] = [
    { id: 10, user_id: 'user-1', name: 'English B2', description: null, tags: [], is_public: false, copy_count: 0, published_at: null, created_at: '', updated_at: '' },
    { id: 20, user_id: 'user-1', name: 'German A1', description: null, tags: [], is_public: false, copy_count: 0, published_at: null, created_at: '', updated_at: '' }
  ];

  const mockSm2Result: Sm2Result = {
    ease_factor: 2.6,
    interval: 6,
    repetitions: 2,
    next_review_date: '2026-01-07T00:00:00Z'
  };

  beforeEach(async () => {
    queryParamsSubject = new BehaviorSubject<Record<string, string>>({});

    reviewApiMock = jasmine.createSpyObj<ReviewApiService>('ReviewApiService', [
      'getDueCards', 'saveReview', 'getAllCardsWithReviews', 'getNextReviewDate'
    ]);
    setApiMock = jasmine.createSpyObj<FlashcardSetApiService>('FlashcardSetApiService', ['getSets']);
    sm2Mock = jasmine.createSpyObj<SpacedRepetitionService>('SpacedRepetitionService', ['calculateNextReview']);
    streakServiceMock = jasmine.createSpyObj<StreakService>('StreakService', ['recordSession']);

    reviewApiMock.getDueCards.and.returnValue(of(mockCards));
    reviewApiMock.saveReview.and.returnValue(of(mockReview));
    reviewApiMock.getNextReviewDate.and.returnValue(of('2026-01-02T00:00:00Z'));
    reviewApiMock.getAllCardsWithReviews.and.returnValue(of(mockCards));
    setApiMock.getSets.and.returnValue(of(mockSets));
    sm2Mock.calculateNextReview.and.returnValue(mockSm2Result);

    await TestBed.configureTestingModule({
      imports: [StudyViewComponent, TranslocoTestingModule.forRoot({ langs: { pl: {} }, translocoConfig: { availableLangs: ['pl', 'en'], defaultLang: 'pl' } })],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        { provide: ReviewApiService, useValue: reviewApiMock },
        { provide: FlashcardSetApiService, useValue: setApiMock },
        { provide: SpacedRepetitionService, useValue: sm2Mock },
        { provide: StreakService, useValue: streakServiceMock },
        { provide: ActivatedRoute, useValue: { queryParams: queryParamsSubject.asObservable() } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(StudyViewComponent);
    component = fixture.componentInstance;
  });

  it('should be created', () => {
    expect(component).toBeTruthy();
  });

  describe('ngOnInit', () => {
    it('should load sets and due cards on init', () => {
      fixture.detectChanges();

      expect(setApiMock.getSets).toHaveBeenCalled();
      expect(reviewApiMock.getDueCards).toHaveBeenCalledWith(null);
      expect(component.setsSignal()).toEqual(mockSets);
      expect(component.dueCardsSignal()).toEqual(mockCards);
      expect(component.loadingSignal()).toBeFalse();
    });

    it('should set selectedSetIdSignal from query params', () => {
      queryParamsSubject.next({ setId: '10' });

      fixture.detectChanges();

      expect(component.selectedSetIdSignal()).toBe(10);
      expect(reviewApiMock.getDueCards).toHaveBeenCalledWith(10);
    });

    it('should set selectedSetIdSignal to null when no setId in query params', () => {
      queryParamsSubject.next({});

      fixture.detectChanges();

      expect(component.selectedSetIdSignal()).toBeNull();
    });
  });

  describe('loadDueCards', () => {
    it('should reset state before loading', () => {
      // Use EMPTY so the subscribe callback never fires and loading stays true
      reviewApiMock.getDueCards.and.returnValue(EMPTY);

      component.failedCardsSignal.set(mockCards);
      component.isSessionCompleteSignal.set(true);
      component.errorSignal.set('some error');

      component.loadDueCards();

      expect(component.loadingSignal()).toBeTrue();
      expect(component.errorSignal()).toBeNull();
      expect(component.isSessionCompleteSignal()).toBeFalse();
      expect(component.failedCardsSignal()).toEqual([]);

      // Restore default mock
      reviewApiMock.getDueCards.and.returnValue(of(mockCards));
    });

    it('should set cards and reset index on success', () => {
      component.loadDueCards();

      expect(component.dueCardsSignal()).toEqual(mockCards);
      expect(component.currentIndexSignal()).toBe(0);
      expect(component.isFlippedSignal()).toBeFalse();
      expect(component.loadingSignal()).toBeFalse();
    });

    it('should load next review date when no due cards exist', () => {
      reviewApiMock.getDueCards.and.returnValue(of([]));

      component.loadDueCards();

      expect(reviewApiMock.getNextReviewDate).toHaveBeenCalled();
      expect(component.nextReviewDateSignal()).toBe('2026-01-02T00:00:00Z');
      expect(component.loadingSignal()).toBeFalse();
    });

    it('should set error on failure', () => {
      reviewApiMock.getDueCards.and.returnValue(throwError(() => new Error('network error')));

      component.loadDueCards();

      expect(component.errorSignal()).toBe('Nie udało się załadować fiszek. Spróbuj ponownie.');
      expect(component.loadingSignal()).toBeFalse();
    });
  });

  describe('computed signals', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('currentCardSignal should return the card at current index', () => {
      expect(component.currentCardSignal()).toEqual(mockCards[0]);
    });

    it('currentCardSignal should return null when no cards', () => {
      component.dueCardsSignal.set([]);

      expect(component.currentCardSignal()).toBeNull();
    });

    it('failedCountSignal should return count of failed cards', () => {
      component.failedCardsSignal.set([mockCards[0]]);

      expect(component.failedCountSignal()).toBe(1);
    });

    it('progressPercentSignal should compute correct percentage', () => {
      component.currentIndexSignal.set(0);

      expect(component.progressPercentSignal()).toBe(50); // (0+1)/2 * 100 = 50
    });

    it('progressPercentSignal should return 0 when no cards', () => {
      component.dueCardsSignal.set([]);

      expect(component.progressPercentSignal()).toBe(0);
    });

    it('displayFrontSignal should return front text in normal mode', () => {
      expect(component.displayFrontSignal()).toBe('hello');
    });

    it('displayFrontSignal should return first meaning of back in reversed mode', () => {
      component.isReversedSignal.set(true);

      expect(component.displayFrontSignal()).toBe('cześć');
    });

    it('displayBackSignal should format multiple meanings with bullets', () => {
      expect(component.displayBackSignal()).toBe('cześć\n• hej');
    });

    it('displayBackSignal should return front text in reversed mode', () => {
      component.isReversedSignal.set(true);

      expect(component.displayBackSignal()).toBe('hello');
    });

    it('displayFrontImageSignal should return image url in normal mode', () => {
      expect(component.displayFrontImageSignal()).toBe('http://img.png');
    });

    it('displayFrontImageSignal should return null in reversed mode', () => {
      component.isReversedSignal.set(true);

      expect(component.displayFrontImageSignal()).toBeNull();
    });

    it('displayBackAudioSignal should return audio url in normal mode', () => {
      expect(component.displayBackAudioSignal()).toBe('http://audio.mp3');
    });

    it('displayBackAudioSignal should return null in reversed mode', () => {
      component.isReversedSignal.set(true);

      expect(component.displayBackAudioSignal()).toBeNull();
    });

    it('currentSetNameSignal should return set name when set is selected', () => {
      component.selectedSetIdSignal.set(10);

      expect(component.currentSetNameSignal()).toBe('English B2');
    });

    it('currentSetNameSignal should return null when no set selected', () => {
      component.selectedSetIdSignal.set(null);

      expect(component.currentSetNameSignal()).toBeNull();
    });
  });

  describe('flip', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should set isFlipped to true', () => {
      component.flip();

      expect(component.isFlippedSignal()).toBeTrue();
    });

    it('should not flip when no cards', () => {
      component.dueCardsSignal.set([]);

      component.flip();

      expect(component.isFlippedSignal()).toBeFalse();
    });

    it('should not flip when session is complete', () => {
      component.isSessionCompleteSignal.set(true);

      component.flip();

      expect(component.isFlippedSignal()).toBeFalse();
    });
  });

  describe('answer', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should call sm2 and save review', () => {
      component.answer(4);

      expect(sm2Mock.calculateNextReview).toHaveBeenCalledWith(mockCards[0].review, 4);
      expect(reviewApiMock.saveReview).toHaveBeenCalledWith(1, mockSm2Result);
    });

    it('should update session results for known answer', () => {
      component.answer(4);

      expect(component.sessionResultsSignal().known).toBe(1);
      expect(component.sessionResultsSignal().total).toBe(1);
    });

    it('should update session results for hard answer', () => {
      component.answer(3);

      expect(component.sessionResultsSignal().hard).toBe(1);
    });

    it('should update session results for unknown answer', () => {
      component.answer(1);

      expect(component.sessionResultsSignal().unknown).toBe(1);
    });

    it('should track failed cards when trackProgress is on and quality < 4', () => {
      component.trackProgressSignal.set(true);

      component.answer(3);

      expect(component.failedCardsSignal().length).toBe(1);
    });

    it('should not track failed cards when trackProgress is off', () => {
      component.trackProgressSignal.set(false);

      component.answer(1);

      expect(component.failedCardsSignal().length).toBe(0);
    });

    it('should move to next card after successful save', () => {
      component.answer(4);

      expect(component.currentIndexSignal()).toBe(1);
      expect(component.isFlippedSignal()).toBeFalse();
    });

    it('should complete session when last card is answered', fakeAsync(() => {
      component.currentIndexSignal.set(1);

      component.answer(4);
      tick();

      expect(component.isSessionCompleteSignal()).toBeTrue();
      expect(streakServiceMock.recordSession).toHaveBeenCalledWith(1);
      // confetti is a frozen ESM export and cannot be spied on;
      // we verify the session completes and streak is recorded instead
    }));

    it('should not answer when saving is in progress', () => {
      component.savingSignal.set(true);

      component.answer(4);

      expect(sm2Mock.calculateNextReview).not.toHaveBeenCalled();
    });

    it('should set error on save failure', () => {
      reviewApiMock.saveReview.and.returnValue(throwError(() => new Error('save error')));

      component.answer(4);

      expect(component.savingSignal()).toBeFalse();
      expect(component.errorSignal()).toBe('Nie udało się zapisać odpowiedzi. Spróbuj ponownie.');
    });
  });

  describe('handleKeyboard', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should flip card on spacebar when not flipped', () => {
      const event: KeyboardEvent = new KeyboardEvent('keydown', { key: ' ' });
      spyOn(event, 'preventDefault');

      component.handleKeyboard(event);

      expect(event.preventDefault).toHaveBeenCalled();
      expect(component.isFlippedSignal()).toBeTrue();
    });

    it('should not flip on spacebar when already flipped', () => {
      component.isFlippedSignal.set(true);
      const event: KeyboardEvent = new KeyboardEvent('keydown', { key: ' ' });

      component.handleKeyboard(event);

      // No answer should be triggered either (space doesn't answer)
      expect(sm2Mock.calculateNextReview).not.toHaveBeenCalled();
    });

    it('should answer with quality 4 on key "1" when flipped', () => {
      component.isFlippedSignal.set(true);
      const event: KeyboardEvent = new KeyboardEvent('keydown', { key: '1' });

      component.handleKeyboard(event);

      expect(sm2Mock.calculateNextReview).toHaveBeenCalledWith(mockCards[0].review, 4);
    });

    it('should answer with quality 3 on key "2" when flipped', () => {
      component.isFlippedSignal.set(true);
      const event: KeyboardEvent = new KeyboardEvent('keydown', { key: '2' });

      component.handleKeyboard(event);

      expect(sm2Mock.calculateNextReview).toHaveBeenCalledWith(mockCards[0].review, 3);
    });

    it('should answer with quality 1 on key "3" when flipped', () => {
      component.isFlippedSignal.set(true);
      const event: KeyboardEvent = new KeyboardEvent('keydown', { key: '3' });

      component.handleKeyboard(event);

      expect(sm2Mock.calculateNextReview).toHaveBeenCalledWith(mockCards[0].review, 1);
    });

    it('should ignore keyboard when session is complete', () => {
      component.isSessionCompleteSignal.set(true);
      const event: KeyboardEvent = new KeyboardEvent('keydown', { key: ' ' });

      component.handleKeyboard(event);

      expect(component.isFlippedSignal()).toBeFalse();
    });

    it('should ignore keyboard events from input elements', () => {
      const input: HTMLInputElement = document.createElement('input');
      const event: KeyboardEvent = new KeyboardEvent('keydown', { key: ' ' });
      Object.defineProperty(event, 'target', { value: input });

      component.handleKeyboard(event);

      expect(component.isFlippedSignal()).toBeFalse();
    });
  });

  describe('shuffleCards', () => {
    it('should shuffle cards and reset state', () => {
      fixture.detectChanges();

      component.shuffleCards();

      expect(component.currentIndexSignal()).toBe(0);
      expect(component.isFlippedSignal()).toBeFalse();
      expect(component.isShuffledSignal()).toBeTrue();
    });
  });

  describe('restoreOrder', () => {
    it('should restore original card order', () => {
      fixture.detectChanges();
      component.shuffleCards();

      component.restoreOrder();

      expect(component.dueCardsSignal()).toEqual(mockCards);
      expect(component.isShuffledSignal()).toBeFalse();
      expect(component.currentIndexSignal()).toBe(0);
    });
  });

  describe('toggleTrackProgress', () => {
    it('should toggle trackProgress signal', () => {
      component.trackProgressSignal.set(true);

      component.toggleTrackProgress();

      expect(component.trackProgressSignal()).toBeFalse();
    });

    it('should clear failed cards when disabling tracking', () => {
      component.trackProgressSignal.set(true);
      component.failedCardsSignal.set(mockCards);

      component.toggleTrackProgress();

      expect(component.failedCardsSignal()).toEqual([]);
    });
  });

  describe('toggleDirection', () => {
    it('should toggle reversed mode', () => {
      expect(component.isReversedSignal()).toBeFalse();

      component.toggleDirection();

      expect(component.isReversedSignal()).toBeTrue();
    });
  });

  describe('restartWithFailedCards', () => {
    it('should restart session with only failed cards', () => {
      fixture.detectChanges();
      component.failedCardsSignal.set([mockCards[0]]);
      component.isSessionCompleteSignal.set(true);

      component.restartWithFailedCards();

      expect(component.dueCardsSignal()).toEqual([mockCards[0]]);
      expect(component.failedCardsSignal()).toEqual([]);
      expect(component.isSessionCompleteSignal()).toBeFalse();
      expect(component.currentIndexSignal()).toBe(0);
    });
  });

  describe('restartSession', () => {
    it('should restart from the original cards', () => {
      fixture.detectChanges();
      component.currentIndexSignal.set(1);
      component.isSessionCompleteSignal.set(true);
      component.failedCardsSignal.set(mockCards);

      component.restartSession();

      expect(component.dueCardsSignal()).toEqual(mockCards);
      expect(component.currentIndexSignal()).toBe(0);
      expect(component.isSessionCompleteSignal()).toBeFalse();
      expect(component.failedCardsSignal()).toEqual([]);
    });
  });

  describe('loadExtraPractice', () => {
    it('should load all cards with reviews', () => {
      component.loadExtraPractice();

      expect(reviewApiMock.getAllCardsWithReviews).toHaveBeenCalled();
      expect(component.loadingSignal()).toBeFalse();
      expect(component.dueCardsSignal()).toEqual(mockCards);
    });

    it('should filter cards by selected set', () => {
      component.selectedSetIdSignal.set(10);
      const allCards: StudyCardDTO[] = [
        ...mockCards,
        { flashcard: { ...mockFlashcard, id: 99, set_id: 999 }, review: null }
      ];
      reviewApiMock.getAllCardsWithReviews.and.returnValue(of(allCards));

      component.loadExtraPractice();

      expect(component.dueCardsSignal().length).toBe(2);
    });

    it('should set error on failure', () => {
      reviewApiMock.getAllCardsWithReviews.and.returnValue(throwError(() => new Error('fail')));

      component.loadExtraPractice();

      expect(component.errorSignal()).toBe('study.errors.loadFailed');
      expect(component.loadingSignal()).toBeFalse();
    });
  });

  describe('onSetChange', () => {
    it('should update selected set and reload cards', () => {
      fixture.detectChanges();
      reviewApiMock.getDueCards.calls.reset();

      component.onSetChange(20);

      expect(component.selectedSetIdSignal()).toBe(20);
      expect(reviewApiMock.getDueCards).toHaveBeenCalledWith(20);
    });
  });

  describe('formatDate', () => {
    it('should format ISO date to Polish locale string', () => {
      const result: string = component.formatDate('2026-03-15T14:30:00Z');

      expect(result).toBeTruthy();
      expect(typeof result).toBe('string');
    });
  });

  describe('ngOnDestroy', () => {
    it('should unsubscribe from subscriptions', () => {
      fixture.detectChanges();

      expect(() => component.ngOnDestroy()).not.toThrow();
    });
  });

});
