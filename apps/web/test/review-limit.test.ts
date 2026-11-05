import { describe, expect, it } from 'vitest';

import {
  nextReviewAt,
  reviewsLeft,
  reviewState,
  WEEKLY_REVIEWS,
} from '../src/lib/profile/review-limit';

const NOW = new Date('2026-11-10T12:00:00.000Z');

/** A review this many days before NOW. */
const daysAgo = (days: number) => new Date(NOW.getTime() - days * 86_400_000).toISOString();

describe('reviewsLeft', () => {
  it('starts full and counts each review', () => {
    expect(reviewsLeft([], NOW)).toBe(WEEKLY_REVIEWS);
    expect(reviewsLeft([daysAgo(1), daysAgo(2)], NOW)).toBe(WEEKLY_REVIEWS - 2);
  });

  it('frees a review seven days after it ran, not at a weekly reset', () => {
    expect(reviewsLeft([daysAgo(6.9)], NOW)).toBe(WEEKLY_REVIEWS - 1);
    expect(reviewsLeft([daysAgo(7)], NOW)).toBe(WEEKLY_REVIEWS);
  });

  it('never goes below zero', () => {
    const many = Array.from({ length: WEEKLY_REVIEWS + 2 }, (_, i) => daysAgo(i / 10));

    expect(reviewsLeft(many, NOW)).toBe(0);
  });
});

describe('nextReviewAt', () => {
  it('says nothing while there are reviews left', () => {
    expect(nextReviewAt([daysAgo(1)], NOW)).toBeNull();
  });

  it('is seven days after the oldest review that still counts', () => {
    const used = [daysAgo(1), daysAgo(5), daysAgo(2), daysAgo(3), daysAgo(4)];

    expect(nextReviewAt(used, NOW)).toBe(daysAgo(-2));
  });
});

describe('reviewState', () => {
  it('says when there was no review', () => {
    expect(reviewState(daysAgo(1), null)).toBe('never');
  });

  it('matches when the review read the latest edit, and not after another one', () => {
    expect(reviewState(daysAgo(2), daysAgo(1))).toBe('current');
    expect(reviewState(daysAgo(1), daysAgo(1))).toBe('current');
    expect(reviewState(daysAgo(1), daysAgo(2))).toBe('outdated');
  });
});
