'use client';

import { cn } from 'cn';
import { RefreshCw } from 'lucide-react';

import { formatDay } from '../../lib/format';
import {
  REVIEW_STATE_LABEL,
  type ReviewState,
  WEEKLY_REVIEWS,
} from '../../lib/profile/review-limit';
import { Button } from '../ui/button';

const FIELD = 'text-2xs font-semibold tracking-wide text-primary uppercase';

const STATE_STYLE: Readonly<Record<ReviewState, string>> = {
  never: 'border-border text-muted-foreground',
  current: 'border-success/40 bg-success/10 text-success',
  outdated: 'border-attention/40 bg-attention/10 text-attention',
};

/**
 * When the profile was last edited and reviewed, and whether those match (docs/product/views.md,
 * #170), with the manual review. The review is a sample until F1 (#41): it runs nothing and says
 * so.
 */
export function ProfileReviewBar({
  editedAt,
  reviewedAt,
  state,
  left,
  nextAt,
  reviewing,
  sampled,
  onReview,
}: {
  readonly editedAt: string;
  readonly reviewedAt: string | null;
  readonly state: ReviewState;
  readonly left: number;
  /** When the next review frees up, while none are left. */
  readonly nextAt: string | null;
  readonly reviewing: boolean;
  /** A sample review ran on this visit. */
  readonly sampled: boolean;
  readonly onReview: () => void;
}) {
  const blocked = reviewing || left === 0;
  const label = reviewing ? 'Reviewing…' : 'Review my profile';
  return (
    <section
      aria-label="Profile review"
      className="mb-4 flex flex-wrap items-center gap-x-8 gap-y-3 rounded-xl border bg-card px-4 py-3"
    >
      <dl className="flex flex-wrap gap-x-8 gap-y-2">
        <div className="flex flex-col gap-0.5">
          <dt className={FIELD}>Last edited</dt>
          <dd className="font-mono text-sm tabular-nums">{formatDay(editedAt)}</dd>
        </div>
        <div className="flex flex-col gap-0.5">
          <dt className={FIELD}>Last reviewed</dt>
          <dd className="font-mono text-sm tabular-nums">
            {reviewedAt ? formatDay(reviewedAt) : 'Never'}
          </dd>
        </div>
      </dl>
      <p
        className={cn(
          'inline-flex h-6 items-center rounded-full border px-2.5 text-xs font-medium',
          STATE_STYLE[state],
        )}
      >
        {REVIEW_STATE_LABEL[state]}
      </p>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 md:ml-auto">
        <p role="status" className="text-xs text-muted-foreground">
          {nextAt
            ? `No reviews left until ${formatDay(nextAt)}. You can still edit and save.`
            : `${String(left)} of ${String(WEEKLY_REVIEWS)} reviews left this week`}
          {sampled ? ' · Sample review: the real one arrives with Profile (F1).' : null}
        </p>
        <Button
          type="button"
          size="sm"
          variant="outline"
          aria-disabled={blocked}
          className="aria-disabled:cursor-not-allowed aria-disabled:opacity-50"
          onClick={() => {
            if (!blocked) onReview();
          }}
        >
          <RefreshCw aria-hidden className={reviewing ? 'motion-safe:animate-spin' : undefined} />
          {label}
        </Button>
      </div>
    </section>
  );
}
