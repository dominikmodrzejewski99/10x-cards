export interface Sm2Input {
  ease_factor: number;
  interval: number;
  repetitions: number;
}

export interface Sm2Result {
  ease_factor: number;
  interval: number;
  repetitions: number;
  next_review_date: string;
}

const MIN_EASE_FACTOR = 1.3;
const DEFAULT_EASE_FACTOR = 2.5;

export function calculateNextReview(
  current: Sm2Input | null,
  quality: number,
): Sm2Result {
  const ef = current?.ease_factor ?? DEFAULT_EASE_FACTOR;
  const prevInterval = current?.interval ?? 0;
  const prevReps = current?.repetitions ?? 0;

  const newEf = Math.max(
    MIN_EASE_FACTOR,
    ef + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)),
  );

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

  const nextDate = new Date();
  nextDate.setDate(nextDate.getDate() + newInterval);

  return {
    ease_factor: Math.round(newEf * 100) / 100,
    interval: newInterval,
    repetitions: newReps,
    next_review_date: nextDate.toISOString(),
  };
}
