import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { signal } from '@angular/core';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { DashboardFacadeService } from './dashboard-facade.service';
import { ReviewApiService } from './review-api.service';
import { FlashcardSetApiService } from './flashcard-set-api.service';
import { ReviewReminderService } from '../shared/services/review-reminder.service';
import { StreakService } from '../shared/services/streak.service';
import { FlashcardSetDTO, StudyCardDTO } from '../../types';

describe('DashboardFacadeService', () => {
  let facade: DashboardFacadeService;
  let reviewApiMock: jasmine.SpyObj<ReviewApiService>;
  let setApiMock: jasmine.SpyObj<FlashcardSetApiService>;
  let reminderServiceMock: jasmine.SpyObj<ReviewReminderService>;
  let streakServiceMock: jasmine.SpyObj<StreakService> & {
    currentStreak: ReturnType<typeof signal>;
    longestStreak: ReturnType<typeof signal>;
    totalSessions: ReturnType<typeof signal>;
    totalCardsReviewed: ReturnType<typeof signal>;
    studiedToday: ReturnType<typeof signal>;
  };

  const mockSets: FlashcardSetDTO[] = [
    {
      id: 1, user_id: 'user-1', name: 'English', description: null, tags: [],
      is_public: false, copy_count: 0, published_at: null,
      created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z'
    }
  ];

  const mockCards: StudyCardDTO[] = [
    {
      flashcard: {
        id: 1, front: 'Hello', back: 'Cześć', front_image_url: null, back_audio_url: null,
        front_language: 'en', back_language: 'pl', source: 'manual',
        created_at: '', updated_at: '', user_id: 'user-1', generation_id: null, set_id: 1, position: 0
      },
      review: null
    },
    {
      flashcard: {
        id: 2, front: 'World', back: 'Świat', front_image_url: null, back_audio_url: null,
        front_language: 'en', back_language: 'pl', source: 'manual',
        created_at: '', updated_at: '', user_id: 'user-1', generation_id: null, set_id: 1, position: 0
      },
      review: {
        id: 1, flashcard_id: 2, user_id: 'user-1', ease_factor: 2.5,
        interval: 30, repetitions: 5,
        next_review_date: '2026-12-01T00:00:00Z',
        last_reviewed_at: '2026-01-01T00:00:00Z',
        created_at: '', updated_at: ''
      }
    }
  ];

  beforeEach(() => {
    reviewApiMock = jasmine.createSpyObj<ReviewApiService>('ReviewApiService', ['getAllCardsWithReviews', 'getNextReviewDate']);
    setApiMock = jasmine.createSpyObj<FlashcardSetApiService>('FlashcardSetApiService', ['getSets']);
    reminderServiceMock = jasmine.createSpyObj<ReviewReminderService>('ReviewReminderService', ['checkDueCards', 'markAsShown']);

    streakServiceMock = {
      ...jasmine.createSpyObj<StreakService>('StreakService', ['loadFromDb', 'recordSession', 'reset']),
      currentStreak: signal(3),
      longestStreak: signal(10),
      totalSessions: signal(25),
      totalCardsReviewed: signal(150),
      studiedToday: signal(true)
    } as jasmine.SpyObj<StreakService> & {
      currentStreak: ReturnType<typeof signal>;
      longestStreak: ReturnType<typeof signal>;
      totalSessions: ReturnType<typeof signal>;
      totalCardsReviewed: ReturnType<typeof signal>;
      studiedToday: ReturnType<typeof signal>;
    };

    reviewApiMock.getAllCardsWithReviews.and.returnValue(of(mockCards));
    setApiMock.getSets.and.returnValue(of(mockSets));
    reviewApiMock.getNextReviewDate.and.returnValue(of('2026-04-01T10:00:00Z'));
    reminderServiceMock.checkDueCards.and.returnValue(of(0));

    TestBed.configureTestingModule({
      imports: [TranslocoTestingModule.forRoot({ langs: { pl: {} }, translocoConfig: { availableLangs: ['pl'], defaultLang: 'pl' } })],
      providers: [
        DashboardFacadeService,
        { provide: ReviewApiService, useValue: reviewApiMock },
        { provide: FlashcardSetApiService, useValue: setApiMock },
        { provide: ReviewReminderService, useValue: reminderServiceMock },
        { provide: StreakService, useValue: streakServiceMock },
      ],
    });

    facade = TestBed.inject(DashboardFacadeService);
  });

  describe('loadData', () => {
    it('should load sets, breakdown, and next review date', () => {
      facade.loadData();

      expect(facade.loadingSignal()).toBeFalse();
      expect(facade.setsSignal().length).toBe(1);
      expect(facade.totalCardsSignal()).toBe(2);
      expect(facade.nextReviewDateSignal()).toBe('2026-04-01T10:00:00Z');
      expect(facade.errorMessageSignal()).toBeNull();
    });

    it('should compute breakdown correctly', () => {
      facade.loadData();

      const breakdown = facade.breakdownSignal();
      expect(breakdown.newCards).toBe(1);
      expect(breakdown.mastered).toBe(1);
      expect(breakdown.due).toBe(1);
      expect(breakdown.total).toBe(2);
    });

    it('should set loading to false on error', () => {
      reviewApiMock.getAllCardsWithReviews.and.returnValue(throwError(() => new Error('fail')));

      facade.loadData();

      expect(facade.loadingSignal()).toBeFalse();
      expect(facade.errorMessageSignal()).toBeTruthy();
    });
  });

  describe('computed signals', () => {
    it('should compute totalSets', () => {
      facade.loadData();
      expect(facade.totalSetsSignal()).toBe(1);
    });

    it('should compute dueCount', () => {
      facade.loadData();
      expect(facade.dueCountSignal()).toBe(1);
    });

    it('should compute uptodatePercent', () => {
      facade.loadData();
      expect(facade.uptodatePercentSignal()).toBe(50);
    });

    it('should return 0 uptodatePercent when no cards', () => {
      reviewApiMock.getAllCardsWithReviews.and.returnValue(of([]));
      setApiMock.getSets.and.returnValue(of([]));
      reviewApiMock.getNextReviewDate.and.returnValue(of(null));

      facade.loadData();

      expect(facade.uptodatePercentSignal()).toBe(0);
    });
  });

  describe('streak passthrough', () => {
    it('should expose streak service signals', () => {
      expect(facade.currentStreakSignal()).toBe(3);
      expect(facade.longestStreakSignal()).toBe(10);
      expect(facade.studiedTodaySignal()).toBeTrue();
    });

    it('should delegate loadStreaks to streak service', () => {
      facade.loadStreaks();
      expect(streakServiceMock.loadFromDb).toHaveBeenCalled();
    });
  });

  describe('reminder', () => {
    it('should show reminder when due cards exist', () => {
      reminderServiceMock.checkDueCards.and.returnValue(of(5));

      facade.loadData();

      expect(facade.reminderVisibleSignal()).toBeTrue();
      expect(facade.reminderDueCountSignal()).toBe(5);
      expect(reminderServiceMock.markAsShown).toHaveBeenCalled();
    });

    it('should dismiss reminder', () => {
      reminderServiceMock.checkDueCards.and.returnValue(of(5));
      facade.loadData();

      facade.dismissReminder();

      expect(facade.reminderVisibleSignal()).toBeFalse();
    });
  });

  describe('greeting', () => {
    it('should return a non-empty string', () => {
      expect(facade.greetingSignal().length).toBeGreaterThan(0);
    });
  });

  describe('barWidth', () => {
    it('should compute bar width percentage', () => {
      facade.loadData();
      expect(facade.barWidth(1)).toBe(50);
    });

    it('should return 0 when total is 0', () => {
      expect(facade.barWidth(1)).toBe(0);
    });
  });
});
