/**
 * How many profile reviews a user has left, and whether the last one read the latest edit
 * (docs/product/views.md, #170). Pure, so every rule is unit-tested here. The real limit lives in
 * `packages/router` config with the feature.
 */

export const WEEKLY_REVIEWS = 5;

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/** The reviews still counting: each one frees up seven days after it ran. */
function counted(reviews: readonly string[], now: Date): string[] {
  return reviews.filter((at) => now.getTime() - Date.parse(at) < WEEK_MS);
}

export function reviewsLeft(reviews: readonly string[], now: Date): number {
  return Math.max(WEEKLY_REVIEWS - counted(reviews, now).length, 0);
}

/** When the next review frees up, or null while there are reviews left. */
export function nextReviewAt(reviews: readonly string[], now: Date): string | null {
  if (reviewsLeft(reviews, now) > 0) return null;
  const [oldest] = counted(reviews, now).sort((a, b) => Date.parse(a) - Date.parse(b));
  return oldest ? new Date(Date.parse(oldest) + WEEK_MS).toISOString() : null;
}

export type ReviewState = 'never' | 'current' | 'outdated';

/** Whether the last review read the profile as it is now. */
export function reviewState(editedAt: string, reviewedAt: string | null): ReviewState {
  if (reviewedAt === null) return 'never';
  return Date.parse(reviewedAt) >= Date.parse(editedAt) ? 'current' : 'outdated';
}

export const REVIEW_STATE_LABEL: Readonly<Record<ReviewState, string>> = {
  never: 'Not reviewed yet',
  current: 'Review matches your latest edit',
  outdated: 'Edited after the last review',
};
