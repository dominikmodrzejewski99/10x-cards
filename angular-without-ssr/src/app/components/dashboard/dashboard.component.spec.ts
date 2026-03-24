import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA, signal } from '@angular/core';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';

import { DashboardComponent } from './dashboard.component';
import { StreakService } from '../../shared/services/streak.service';
import { ReviewReminderService } from '../../shared/services/review-reminder.service';
import { ReviewApiService } from '../../services/review-api.service';
import { FlashcardSetApiService } from '../../services/flashcard-set-api.service';
import { FlashcardSetDTO, StudyCardDTO } from '../../../types';

describe('DashboardComponent', () => {
  let component: DashboardComponent;
  let fixture: ComponentFixture<DashboardComponent>;

  let streakServiceMock: jasmine.SpyObj<StreakService> & {
    currentStreak: ReturnType<typeof signal>;
    longestStreak: ReturnType<typeof signal>;
    totalSessions: ReturnType<typeof signal>;
    totalCardsReviewed: ReturnType<typeof signal>;
    studiedToday: ReturnType<typeof signal>;
  };
  let reviewApiMock: jasmine.SpyObj<ReviewApiService>;
  let setApiMock: jasmine.SpyObj<FlashcardSetApiService>;
  let reminderServiceMock: jasmine.SpyObj<ReviewReminderService>;
  let routerMock: jasmine.SpyObj<Router>;

  const mockSets: FlashcardSetDTO[] = [
    {
      id: 1,
      user_id: 'user-1',
      name: 'English',
      description: null,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z'
    }
  ];

  const mockCards: StudyCardDTO[] = [
    {
      flashcard: {
        id: 1, front: 'Hello', back: 'Cześć', front_image_url: null, back_audio_url: null,
        front_language: 'en', back_language: 'pl', source: 'manual',
        created_at: '', updated_at: '', user_id: 'user-1', generation_id: null, set_id: 1
      },
      review: null
    },
    {
      flashcard: {
        id: 2, front: 'World', back: 'Świat', front_image_url: null, back_audio_url: null,
        front_language: 'en', back_language: 'pl', source: 'manual',
        created_at: '', updated_at: '', user_id: 'user-1', generation_id: null, set_id: 1
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

  beforeEach(async () => {
    const currentStreakSig = signal(3);
    const longestStreakSig = signal(10);
    const totalSessionsSig = signal(25);
    const totalCardsReviewedSig = signal(150);
    const studiedTodaySig = signal(true);

    streakServiceMock = {
      ...jasmine.createSpyObj<StreakService>('StreakService', ['loadFromDb', 'recordSession', 'reset']),
      currentStreak: currentStreakSig,
      longestStreak: longestStreakSig,
      totalSessions: totalSessionsSig,
      totalCardsReviewed: totalCardsReviewedSig,
      studiedToday: studiedTodaySig
    } as jasmine.SpyObj<StreakService> & {
      currentStreak: ReturnType<typeof signal>;
      longestStreak: ReturnType<typeof signal>;
      totalSessions: ReturnType<typeof signal>;
      totalCardsReviewed: ReturnType<typeof signal>;
      studiedToday: ReturnType<typeof signal>;
    };

    reviewApiMock = jasmine.createSpyObj<ReviewApiService>(
      'ReviewApiService',
      ['getAllCardsWithReviews', 'getNextReviewDate', 'getDueCards']
    );
    setApiMock = jasmine.createSpyObj<FlashcardSetApiService>(
      'FlashcardSetApiService',
      ['getSets']
    );
    reminderServiceMock = jasmine.createSpyObj<ReviewReminderService>(
      'ReviewReminderService',
      ['checkDueCards', 'markAsShown']
    );
    routerMock = jasmine.createSpyObj<Router>('Router', ['navigate']);

    reviewApiMock.getAllCardsWithReviews.and.returnValue(of(mockCards));
    setApiMock.getSets.and.returnValue(of(mockSets));
    reviewApiMock.getNextReviewDate.and.returnValue(of('2026-04-01T10:00:00Z'));
    reminderServiceMock.checkDueCards.and.returnValue(of(0));

    await TestBed.configureTestingModule({
      imports: [DashboardComponent],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        { provide: StreakService, useValue: streakServiceMock },
        { provide: ReviewApiService, useValue: reviewApiMock },
        { provide: FlashcardSetApiService, useValue: setApiMock },
        { provide: ReviewReminderService, useValue: reminderServiceMock },
        { provide: Router, useValue: routerMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('ngOnInit', () => {
    it('should load data and compute breakdown on init', () => {
      fixture.detectChanges();

      expect(streakServiceMock.loadFromDb).toHaveBeenCalled();
      expect(reviewApiMock.getAllCardsWithReviews).toHaveBeenCalled();
      expect(setApiMock.getSets).toHaveBeenCalled();
      expect(component.loading()).toBeFalse();
      expect(component.sets().length).toBe(1);
      expect(component.totalCards()).toBe(2);
    });

    it('should compute card breakdown correctly', () => {
      fixture.detectChanges();

      const breakdown = component.breakdown();
      // card 1 has no review -> newCards=1, due=1
      // card 2 has interval=30, next_review_date in future -> mastered=1, due stays 1
      expect(breakdown.newCards).toBe(1);
      expect(breakdown.mastered).toBe(1);
      expect(breakdown.due).toBe(1);
      expect(breakdown.total).toBe(2);
    });

    it('should set loading to false even on error', () => {
      reviewApiMock.getAllCardsWithReviews.and.returnValue(throwError(() => new Error('fail')));

      fixture.detectChanges();

      expect(component.loading()).toBeFalse();
    });
  });

  describe('greeting', () => {
    it('should return a string', () => {
      fixture.detectChanges();

      const greetingValue: string = component.greeting();
      expect(typeof greetingValue).toBe('string');
      expect(greetingValue.length).toBeGreaterThan(0);
    });
  });

  describe('loading state', () => {
    it('should start with loading true', () => {
      expect(component.loading()).toBeTrue();
    });
  });

  describe('empty state', () => {
    it('should show zero totals when no data', () => {
      reviewApiMock.getAllCardsWithReviews.and.returnValue(of([]));
      setApiMock.getSets.and.returnValue(of([]));
      reviewApiMock.getNextReviewDate.and.returnValue(of(null));

      fixture.detectChanges();

      expect(component.totalSets()).toBe(0);
      expect(component.totalCards()).toBe(0);
      expect(component.dueCount()).toBe(0);
      expect(component.uptodatePercent()).toBe(0);
    });
  });

  describe('reminder', () => {
    it('should show reminder when due cards exist', () => {
      reminderServiceMock.checkDueCards.and.returnValue(of(5));

      fixture.detectChanges();

      expect(component.reminderVisible()).toBeTrue();
      expect(component.reminderDueCount()).toBe(5);
      expect(reminderServiceMock.markAsShown).toHaveBeenCalled();
    });

    it('should navigate to study on reminder study action', () => {
      fixture.detectChanges();

      component.onReminderStudy();

      expect(routerMock.navigate).toHaveBeenCalledWith(['/study']);
      expect(component.reminderVisible()).toBeFalse();
    });

    it('should hide reminder on dismiss', () => {
      reminderServiceMock.checkDueCards.and.returnValue(of(5));
      fixture.detectChanges();

      component.onReminderDismiss();

      expect(component.reminderVisible()).toBeFalse();
    });
  });
});
