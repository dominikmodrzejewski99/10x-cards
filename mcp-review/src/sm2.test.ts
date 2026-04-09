import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { calculateNextReview } from './sm2.js';

describe('calculateNextReview', () => {
  it('first review quality 4 → interval 1, reps 1', () => {
    const r = calculateNextReview(null, 4);
    assert.equal(r.interval, 1);
    assert.equal(r.repetitions, 1);
    assert.equal(r.ease_factor, 2.5);
  });

  it('second review quality 4 → interval 6, reps 2', () => {
    const r = calculateNextReview({ ease_factor: 2.5, interval: 1, repetitions: 1 }, 4);
    assert.equal(r.interval, 6);
    assert.equal(r.repetitions, 2);
  });

  it('third review quality 4 → interval = round(6 * ef)', () => {
    const r = calculateNextReview({ ease_factor: 2.5, interval: 6, repetitions: 2 }, 4);
    assert.equal(r.interval, Math.round(6 * 2.5));
    assert.equal(r.repetitions, 3);
  });

  it('quality < 3 resets reps and interval', () => {
    const r = calculateNextReview({ ease_factor: 2.5, interval: 6, repetitions: 2 }, 1);
    assert.equal(r.repetitions, 0);
    assert.equal(r.interval, 1);
  });

  it('ease factor does not drop below 1.3', () => {
    const r = calculateNextReview({ ease_factor: 1.3, interval: 1, repetitions: 0 }, 0);
    assert.ok(r.ease_factor >= 1.3);
  });

  it('quality 3 (hard) still passes — reps increment', () => {
    const r = calculateNextReview(null, 3);
    assert.equal(r.repetitions, 1);
    assert.equal(r.interval, 1);
  });

  it('quality 5 increases ease factor', () => {
    const r = calculateNextReview({ ease_factor: 2.5, interval: 6, repetitions: 2 }, 5);
    assert.ok(r.ease_factor > 2.5);
  });

  it('next_review_date is a valid ISO string in the future', () => {
    const r = calculateNextReview(null, 4);
    const d = new Date(r.next_review_date);
    assert.ok(!isNaN(d.getTime()));
    assert.ok(d > new Date());
  });
});
