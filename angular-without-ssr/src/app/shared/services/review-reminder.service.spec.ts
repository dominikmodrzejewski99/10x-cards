import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ReviewReminderService } from './review-reminder.service';
import { ReviewApiService } from '../../services/api/review-api.service';
import { StudyCardDTO, FlashcardDTO, FlashcardReviewDTO } from '../../../types';

function createMockStudyCard(id: number): StudyCardDTO {
  const flashcard: FlashcardDTO = {
    id,
    front: `Front ${id}`,
    back: `Back ${id}`,
    front_image_url: null,
    back_audio_url: null,
    front_language: null,
    back_language: null,
    source: 'manual',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    user_id: 'user-123',
    generation_id: null,
    set_id: 1,
    position: 0
  };

  const review: FlashcardReviewDTO = {
    id,
    flashcard_id: id,
    user_id: 'user-123',
    ease_factor: 2.5,
    interval: 1,
    repetitions: 1,
    next_review_date: '2026-03-23T00:00:00Z',
    last_reviewed_at: '2026-03-22T00:00:00Z',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-03-22T00:00:00Z'
  };

  return { flashcard, review };
}

describe('ReviewReminderService', () => {
  let service: ReviewReminderService;
  let reviewApiSpy: jasmine.SpyObj<ReviewApiService>;

  beforeEach(() => {
    reviewApiSpy = jasmine.createSpyObj<ReviewApiService>('ReviewApiService', ['getDueCards']);

    TestBed.configureTestingModule({
      providers: [
        ReviewReminderService,
        { provide: ReviewApiService, useValue: reviewApiSpy }
      ]
    });
    service = TestBed.inject(ReviewReminderService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('checkDueCards', () => {
    it('should return the count of due cards', (done: DoneFn) => {
      const dueCards: StudyCardDTO[] = [
        createMockStudyCard(1),
        createMockStudyCard(2),
        createMockStudyCard(3)
      ];
      reviewApiSpy.getDueCards.and.returnValue(of(dueCards));

      service.checkDueCards().subscribe({
        next: (count: number) => {
          expect(count).toBe(3);
          done();
        },
        error: done.fail
      });
    });

    it('should return 0 when no due cards', (done: DoneFn) => {
      reviewApiSpy.getDueCards.and.returnValue(of([]));

      service.checkDueCards().subscribe({
        next: (count: number) => {
          expect(count).toBe(0);
          done();
        },
        error: done.fail
      });
    });

    it('should return 0 without calling API after markAsShown', (done: DoneFn) => {
      service.markAsShown();

      service.checkDueCards().subscribe({
        next: (count: number) => {
          expect(count).toBe(0);
          expect(reviewApiSpy.getDueCards).not.toHaveBeenCalled();
          done();
        },
        error: done.fail
      });
    });

    it('should call API on first check', (done: DoneFn) => {
      reviewApiSpy.getDueCards.and.returnValue(of([]));

      service.checkDueCards().subscribe({
        next: () => {
          expect(reviewApiSpy.getDueCards).toHaveBeenCalledTimes(1);
          done();
        },
        error: done.fail
      });
    });

    it('should call API on second check if not marked as shown', (done: DoneFn) => {
      reviewApiSpy.getDueCards.and.returnValue(of([createMockStudyCard(1)]));

      service.checkDueCards().subscribe({
        next: () => {
          service.checkDueCards().subscribe({
            next: (count: number) => {
              expect(count).toBe(1);
              expect(reviewApiSpy.getDueCards).toHaveBeenCalledTimes(2);
              done();
            },
            error: done.fail
          });
        },
        error: done.fail
      });
    });
  });

  describe('markAsShown', () => {
    it('should prevent subsequent checkDueCards from calling API', (done: DoneFn) => {
      reviewApiSpy.getDueCards.and.returnValue(of([createMockStudyCard(1)]));

      // First check should work normally
      service.checkDueCards().subscribe({
        next: (count: number) => {
          expect(count).toBe(1);

          // Mark as shown
          service.markAsShown();

          // Second check should return 0 without API call
          service.checkDueCards().subscribe({
            next: (secondCount: number) => {
              expect(secondCount).toBe(0);
              // getDueCards should have been called only once (the first time)
              expect(reviewApiSpy.getDueCards).toHaveBeenCalledTimes(1);
              done();
            },
            error: done.fail
          });
        },
        error: done.fail
      });
    });
  });
});
