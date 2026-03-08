import { Injectable } from '@angular/core';
import { FlashcardReviewDTO, ReviewQuality } from '../../types';

export interface Sm2Result {
  ease_factor: number;
  interval: number;
  repetitions: number;
  next_review_date: string;
}

@Injectable({
  providedIn: 'root'
})
export class SpacedRepetitionService {

  private static readonly MIN_EASE_FACTOR: number = 1.3;
  private static readonly DEFAULT_EASE_FACTOR: number = 2.5;

  public calculateNextReview(
    current: Pick<FlashcardReviewDTO, 'ease_factor' | 'interval' | 'repetitions'> | null,
    quality: ReviewQuality
  ): Sm2Result {
    const ef: number = current?.ease_factor ?? SpacedRepetitionService.DEFAULT_EASE_FACTOR;
    const prevInterval: number = current?.interval ?? 0;
    const prevReps: number = current?.repetitions ?? 0;

    const newEf: number = this.calculateEaseFactor(ef, quality);

    let newInterval: number;
    let newReps: number;

    if (quality >= 3) {
      newReps = prevReps + 1;
      if (newReps === 1) {
        newInterval = 1;
      } else if (newReps === 2) {
        newInterval = 6;
      } else {
        newInterval = Math.round(prevInterval * newEf);
      }
    } else {
      newReps = 0;
      newInterval = 1;
    }

    const nextDate: Date = new Date();
    nextDate.setDate(nextDate.getDate() + newInterval);

    return {
      ease_factor: Math.round(newEf * 100) / 100,
      interval: newInterval,
      repetitions: newReps,
      next_review_date: nextDate.toISOString()
    };
  }

  private calculateEaseFactor(currentEf: number, quality: ReviewQuality): number {
    const newEf: number = currentEf + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
    return Math.max(SpacedRepetitionService.MIN_EASE_FACTOR, newEf);
  }
}
