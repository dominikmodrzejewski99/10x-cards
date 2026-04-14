import { TestBed } from '@angular/core/testing';
import { SpacedRepetitionService, Sm2Result } from './spaced-repetition.service';
import { FlashcardReviewDTO, ReviewQuality } from '../../../types';

type ReviewInput = Pick<FlashcardReviewDTO, 'ease_factor' | 'interval' | 'repetitions'>;

describe('SpacedRepetitionService', () => {
  let service: SpacedRepetitionService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [SpacedRepetitionService]
    });
    service = TestBed.inject(SpacedRepetitionService);
  });

  describe('calculateNextReview — new card (null current)', () => {
    it('should use default ease factor 2.5 for new card with quality 5', () => {
      const result: Sm2Result = service.calculateNextReview(null, 5);
      expect(result.ease_factor).toBe(2.6);
      expect(result.interval).toBe(1);
      expect(result.repetitions).toBe(1);
    });

    it('should reset to interval 1 and reps 0 for quality 0 (blackout)', () => {
      const result: Sm2Result = service.calculateNextReview(null, 0);
      expect(result.interval).toBe(1);
      expect(result.repetitions).toBe(0);
    });

    it('should reset to interval 1 and reps 0 for quality 1', () => {
      const result: Sm2Result = service.calculateNextReview(null, 1);
      expect(result.interval).toBe(1);
      expect(result.repetitions).toBe(0);
    });

    it('should reset to interval 1 and reps 0 for quality 2', () => {
      const result: Sm2Result = service.calculateNextReview(null, 2);
      expect(result.interval).toBe(1);
      expect(result.repetitions).toBe(0);
    });

    it('should set interval 1 and reps 1 for quality 3 (first correct)', () => {
      const result: Sm2Result = service.calculateNextReview(null, 3);
      expect(result.interval).toBe(1);
      expect(result.repetitions).toBe(1);
    });

    it('should set interval 1 and reps 1 for quality 4', () => {
      const result: Sm2Result = service.calculateNextReview(null, 4);
      expect(result.interval).toBe(1);
      expect(result.repetitions).toBe(1);
    });
  });

  describe('calculateNextReview — second repetition', () => {
    it('should set interval to 6 on second successful repetition', () => {
      const current: ReviewInput = { ease_factor: 2.5, interval: 1, repetitions: 1 };
      const result: Sm2Result = service.calculateNextReview(current, 4);
      expect(result.interval).toBe(6);
      expect(result.repetitions).toBe(2);
    });
  });

  describe('calculateNextReview — subsequent repetitions', () => {
    it('should multiply interval by ease factor on third+ repetition', () => {
      const current: ReviewInput = { ease_factor: 2.5, interval: 6, repetitions: 2 };
      const result: Sm2Result = service.calculateNextReview(current, 4);
      // newEf = 2.5 + (0.1 - (5-4) * (0.08 + (5-4)*0.02)) = 2.5 + 0.1 - 0.1 = 2.5
      // interval = round(6 * 2.5) = 15
      expect(result.interval).toBe(15);
      expect(result.repetitions).toBe(3);
      expect(result.ease_factor).toBe(2.5);
    });

    it('should increase ease factor for quality 5', () => {
      const current: ReviewInput = { ease_factor: 2.5, interval: 6, repetitions: 2 };
      const result: Sm2Result = service.calculateNextReview(current, 5);
      // newEf = 2.5 + (0.1 - 0 * (0.08 + 0*0.02)) = 2.5 + 0.1 = 2.6
      expect(result.ease_factor).toBe(2.6);
    });

    it('should decrease ease factor for quality 3', () => {
      const current: ReviewInput = { ease_factor: 2.5, interval: 6, repetitions: 2 };
      const result: Sm2Result = service.calculateNextReview(current, 3);
      // newEf = 2.5 + (0.1 - 2*(0.08 + 2*0.02)) = 2.5 + 0.1 - 2*0.12 = 2.5 - 0.14 = 2.36
      expect(result.ease_factor).toBe(2.36);
    });
  });

  describe('calculateNextReview — failure resets', () => {
    it('should reset repetitions and interval on quality < 3', () => {
      const current: ReviewInput = { ease_factor: 2.5, interval: 15, repetitions: 5 };
      const result: Sm2Result = service.calculateNextReview(current, 2);
      expect(result.interval).toBe(1);
      expect(result.repetitions).toBe(0);
    });

    it('should reset on quality 0 (complete blackout)', () => {
      const current: ReviewInput = { ease_factor: 2.5, interval: 30, repetitions: 8 };
      const result: Sm2Result = service.calculateNextReview(current, 0);
      expect(result.interval).toBe(1);
      expect(result.repetitions).toBe(0);
    });
  });

  describe('calculateNextReview — ease factor floor', () => {
    it('should never go below 1.3 ease factor', () => {
      const current: ReviewInput = { ease_factor: 1.3, interval: 6, repetitions: 2 };
      const result: Sm2Result = service.calculateNextReview(current, 0);
      // Even with quality 0, EF should floor at 1.3
      expect(result.ease_factor).toBeGreaterThanOrEqual(1.3);
    });

    it('should floor at 1.3 after repeated low quality', () => {
      let current: ReviewInput = { ease_factor: 1.5, interval: 1, repetitions: 0 };
      // Apply several low-quality reviews
      for (let i: number = 0; i < 5; i++) {
        const result: Sm2Result = service.calculateNextReview(current, 0);
        current = { ease_factor: result.ease_factor, interval: result.interval, repetitions: result.repetitions };
      }
      expect(current.ease_factor).toBe(1.3);
    });
  });

  describe('calculateNextReview — next_review_date', () => {
    it('should set next_review_date in the future', () => {
      const result: Sm2Result = service.calculateNextReview(null, 5);
      const nextDate: Date = new Date(result.next_review_date);
      const now: Date = new Date();
      expect(nextDate.getTime()).toBeGreaterThan(now.getTime() - 1000);
    });

    it('should be approximately 1 day away for interval=1', () => {
      const result: Sm2Result = service.calculateNextReview(null, 4);
      const nextDate: Date = new Date(result.next_review_date);
      const now: Date = new Date();
      const diffDays: number = (nextDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
      expect(diffDays).toBeGreaterThan(0.9);
      expect(diffDays).toBeLessThan(1.1);
    });

    it('should be approximately 6 days away for second repetition', () => {
      const current: ReviewInput = { ease_factor: 2.5, interval: 1, repetitions: 1 };
      const result: Sm2Result = service.calculateNextReview(current, 4);
      const nextDate: Date = new Date(result.next_review_date);
      const now: Date = new Date();
      const diffDays: number = (nextDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
      expect(diffDays).toBeGreaterThan(5.9);
      expect(diffDays).toBeLessThan(6.1);
    });
  });

  describe('calculateNextReview — all quality ratings from 0 to 5', () => {
    const qualities: ReviewQuality[] = [0, 1, 2, 3, 4, 5];

    qualities.forEach((quality: ReviewQuality) => {
      it(`should return valid Sm2Result for quality ${quality}`, () => {
        const result: Sm2Result = service.calculateNextReview(null, quality);
        expect(result.ease_factor).toBeGreaterThanOrEqual(1.3);
        expect(result.interval).toBeGreaterThanOrEqual(1);
        expect(result.repetitions).toBeGreaterThanOrEqual(0);
        expect(result.next_review_date).toBeTruthy();
        // Verify it's a valid ISO date
        expect(isNaN(new Date(result.next_review_date).getTime())).toBeFalse();
      });
    });
  });
});
