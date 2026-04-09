import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { signal } from '@angular/core';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { StudyFacadeService } from './study-facade.service';
import { ReviewApiService } from './review-api.service';
import { FlashcardSetApiService } from './flashcard-set-api.service';
import { SpacedRepetitionService } from './spaced-repetition.service';
import { StreakService } from '../shared/services/streak.service';
import { FlashcardSetDTO, StudyCardDTO } from '../../types';

describe('StudyFacadeService', () => {
  let facade: StudyFacadeService;
  let reviewApiMock: jasmine.SpyObj<ReviewApiService>;
  let setApiMock: jasmine.SpyObj<FlashcardSetApiService>;
  let sm2Mock: jasmine.SpyObj<SpacedRepetitionService>;
  let streakServiceMock: jasmine.SpyObj<StreakService> & {
    currentStreak: ReturnType<typeof signal>;
    longestStreak: ReturnType<typeof signal>;
    totalSessions: ReturnType<typeof signal>;
    totalCardsReviewed: ReturnType<typeof signal>;
    studiedToday: ReturnType<typeof signal>;
  };

  const mockSets: FlashcardSetDTO[] = [
    { id: 1, user_id: 'u1', name: 'Set A', description: null, tags: [], is_public: false, copy_count: 0, published_at: null, created_at: '', updated_at: '' },
    { id: 2, user_id: 'u1', name: 'Set B', description: null, tags: [], is_public: false, copy_count: 0, published_at: null, created_at: '', updated_at: '' }
  ];

  const mockCards: StudyCardDTO[] = [
    {
      flashcard: { id: 1, front: 'Hello', back: 'Cześć', front_image_url: null, back_audio_url: null, front_language: 'en', back_language: 'pl', source: 'manual', created_at: '', updated_at: '', user_id: 'u1', generation_id: null, set_id: 1, position: 0 },
      review: null
    },
    {
      flashcard: { id: 2, front: 'World', back: 'Świat', front_image_url: null, back_audio_url: null, front_language: 'en', back_language: 'pl', source: 'manual', created_at: '', updated_at: '', user_id: 'u1', generation_id: null, set_id: 1, position: 0 },
      review: null
    }
  ];

  const mockSm2Result = { ease_factor: 2.5, interval: 1, repetitions: 1, next_review_date: '2026-04-10T00:00:00Z' };

  beforeEach(() => {
    reviewApiMock = jasmine.createSpyObj<ReviewApiService>('ReviewApiService', ['getDueCards', 'saveReview', 'getAllCardsWithReviews', 'getNextReviewDate']);
    setApiMock = jasmine.createSpyObj<FlashcardSetApiService>('FlashcardSetApiService', ['getSets']);
    sm2Mock = jasmine.createSpyObj<SpacedRepetitionService>('SpacedRepetitionService', ['calculateNextReview']);

    streakServiceMock = {
      ...jasmine.createSpyObj<StreakService>('StreakService', ['loadFromDb', 'recordSession', 'reset']),
      currentStreak: signal(0),
      longestStreak: signal(0),
      totalSessions: signal(0),
      totalCardsReviewed: signal(0),
      studiedToday: signal(false)
    } as jasmine.SpyObj<StreakService> & {
      currentStreak: ReturnType<typeof signal>;
      longestStreak: ReturnType<typeof signal>;
      totalSessions: ReturnType<typeof signal>;
      totalCardsReviewed: ReturnType<typeof signal>;
      studiedToday: ReturnType<typeof signal>;
    };

    setApiMock.getSets.and.returnValue(of(mockSets));
    reviewApiMock.getDueCards.and.returnValue(of(mockCards));
    sm2Mock.calculateNextReview.and.returnValue(mockSm2Result);
    reviewApiMock.saveReview.and.returnValue(of({ id: 1, flashcard_id: 1, user_id: 'u1', ease_factor: 2.5, interval: 1, repetitions: 1, next_review_date: '2026-04-10T00:00:00Z', last_reviewed_at: '2026-04-09T00:00:00Z', created_at: '', updated_at: '' }));

    TestBed.configureTestingModule({
      imports: [TranslocoTestingModule.forRoot({ langs: { pl: {} }, translocoConfig: { availableLangs: ['pl'], defaultLang: 'pl' } })],
      providers: [
        StudyFacadeService,
        { provide: ReviewApiService, useValue: reviewApiMock },
        { provide: FlashcardSetApiService, useValue: setApiMock },
        { provide: SpacedRepetitionService, useValue: sm2Mock },
        { provide: StreakService, useValue: streakServiceMock },
      ],
    });

    facade = TestBed.inject(StudyFacadeService);
  });

  describe('loadSets', () => {
    it('should load sets into signal', () => {
      facade.loadSets();
      expect(facade.setsSignal().length).toBe(2);
    });
  });

  describe('selectSet and loadDueCards', () => {
    it('should load due cards for selected set', () => {
      facade.selectSet(1);
      expect(facade.selectedSetIdSignal()).toBe(1);
      expect(facade.dueCardsSignal().length).toBe(2);
      expect(facade.loadingSignal()).toBeFalse();
    });

    it('should handle load error', () => {
      reviewApiMock.getDueCards.and.returnValue(throwError(() => new Error('fail')));
      facade.selectSet(1);
      expect(facade.loadingSignal()).toBeFalse();
      expect(facade.errorSignal()).toBeTruthy();
    });

    it('should load next review date when no cards', () => {
      reviewApiMock.getDueCards.and.returnValue(of([]));
      reviewApiMock.getNextReviewDate.and.returnValue(of('2026-04-10T00:00:00Z'));
      facade.selectSet(1);
      expect(facade.nextReviewDateSignal()).toBe('2026-04-10T00:00:00Z');
      expect(facade.loadingSignal()).toBeFalse();
    });
  });

  describe('flip', () => {
    it('should set isFlipped to true', () => {
      facade.selectSet(null);
      facade.flip();
      expect(facade.isFlippedSignal()).toBeTrue();
    });

    it('should not flip when no cards', () => {
      reviewApiMock.getDueCards.and.returnValue(of([]));
      reviewApiMock.getNextReviewDate.and.returnValue(of(null));
      facade.selectSet(null);
      facade.flip();
      expect(facade.isFlippedSignal()).toBeFalse();
    });
  });

  describe('answer', () => {
    beforeEach(() => {
      facade.selectSet(null);
      facade.flip();
    });

    it('should save review and move to next card', () => {
      facade.answer(4);
      expect(sm2Mock.calculateNextReview).toHaveBeenCalled();
      expect(reviewApiMock.saveReview).toHaveBeenCalled();
      expect(facade.sessionResultsSignal().known).toBe(1);
      expect(facade.currentIndexSignal()).toBe(1);
    });

    it('should track failed cards when quality < 4', () => {
      facade.answer(1);
      expect(facade.failedCardsSignal().length).toBe(1);
    });

    it('should complete session after last card', () => {
      facade.answer(4);
      facade.flip();
      facade.answer(4);
      expect(facade.isSessionCompleteSignal()).toBeTrue();
      expect(streakServiceMock.recordSession).toHaveBeenCalled();
    });

    it('should handle save error', () => {
      reviewApiMock.saveReview.and.returnValue(throwError(() => new Error('fail')));
      facade.answer(4);
      expect(facade.savingSignal()).toBeFalse();
      expect(facade.errorSignal()).toBeTruthy();
    });
  });

  describe('shuffleCards', () => {
    it('should shuffle and reset index', () => {
      facade.selectSet(null);
      facade.shuffleCards();
      expect(facade.isShuffledSignal()).toBeTrue();
      expect(facade.currentIndexSignal()).toBe(0);
    });
  });

  describe('restoreOrder', () => {
    it('should restore original order', () => {
      facade.selectSet(null);
      facade.shuffleCards();
      facade.restoreOrder();
      expect(facade.isShuffledSignal()).toBeFalse();
    });
  });

  describe('toggleTrackProgress', () => {
    it('should toggle and clear failed cards when off', () => {
      facade.selectSet(null);
      facade.flip();
      facade.answer(1);
      expect(facade.failedCardsSignal().length).toBe(1);
      facade.toggleTrackProgress();
      expect(facade.trackProgressSignal()).toBeFalse();
      expect(facade.failedCardsSignal().length).toBe(0);
    });
  });

  describe('toggleDirection', () => {
    it('should toggle reversed', () => {
      facade.toggleDirection();
      expect(facade.isReversedSignal()).toBeTrue();
      facade.toggleDirection();
      expect(facade.isReversedSignal()).toBeFalse();
    });
  });

  describe('restartSession', () => {
    it('should reset session state', () => {
      facade.selectSet(null);
      facade.flip();
      facade.answer(4);
      facade.restartSession();
      expect(facade.currentIndexSignal()).toBe(0);
      expect(facade.isSessionCompleteSignal()).toBeFalse();
      expect(facade.sessionResultsSignal().total).toBe(0);
    });
  });

  describe('restartWithFailedCards', () => {
    it('should restart with failed cards only', () => {
      facade.selectSet(null);
      facade.flip();
      facade.answer(1);
      facade.flip();
      facade.answer(4);
      facade.restartWithFailedCards();
      expect(facade.dueCardsSignal().length).toBe(1);
      expect(facade.currentIndexSignal()).toBe(0);
      expect(facade.isSessionCompleteSignal()).toBeFalse();
    });
  });

  describe('computed signals', () => {
    beforeEach(() => {
      facade.selectSet(null);
    });

    it('should compute currentCard', () => {
      expect(facade.currentCardSignal()).toBeTruthy();
      expect(facade.currentCardSignal()!.flashcard.front).toBe('Hello');
    });

    it('should compute progress', () => {
      expect(facade.progressPercentSignal()).toBe(50);
    });

    it('should compute displayFront and displayBack', () => {
      expect(facade.displayFrontSignal()).toBe('Hello');
      expect(facade.displayBackSignal()).toBe('Cześć');
    });

    it('should compute currentSetName', () => {
      facade.loadSets();
      facade.selectSet(1);
      expect(facade.currentSetNameSignal()).toBe('Set A');
    });

    it('should compute filteredSets', () => {
      facade.loadSets();
      facade.updateSetSearch('b');
      expect(facade.filteredSetsSignal().length).toBe(1);
      expect(facade.filteredSetsSignal()[0].name).toBe('Set B');
    });
  });

  describe('loadExtraPractice', () => {
    it('should load all cards', () => {
      reviewApiMock.getAllCardsWithReviews.and.returnValue(of(mockCards));
      facade.loadExtraPractice();
      expect(facade.dueCardsSignal().length).toBe(2);
      expect(facade.loadingSignal()).toBeFalse();
    });

    it('should handle error', () => {
      reviewApiMock.getAllCardsWithReviews.and.returnValue(throwError(() => new Error('fail')));
      facade.loadExtraPractice();
      expect(facade.loadingSignal()).toBeFalse();
      expect(facade.errorSignal()).toBeTruthy();
    });
  });
});
