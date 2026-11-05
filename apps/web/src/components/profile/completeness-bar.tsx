'use client';

import { cn } from 'cn';

import { completeness, type Suggestion } from '../../lib/profile/profile-view';
import { useDraftDecisions } from '../../lib/store';

/**
 * How complete the profile is, moving with the decisions on suggested changes
 * (docs/product/views.md, #113). The darker fill is done, the lighter one what approving the rest
 * would reach; the numbers are always text as well.
 */
export function CompletenessBar({
  percent,
  next,
  suggestions,
  className,
}: {
  /** The rubric's percentage before any decision. */
  readonly percent: number;
  /** The first thing the rubric still misses, or null when nothing is left. */
  readonly next: string | null;
  readonly suggestions: readonly Suggestion[];
  readonly className?: string;
}) {
  const { decisions } = useDraftDecisions();
  const { now, reachable } = completeness(percent, suggestions, decisions);
  return (
    <div className={cn('flex min-w-0 flex-col gap-1.5', className)}>
      <p className="flex items-baseline justify-between gap-3 text-sm font-medium">
        Profile completeness
        <span role="status" className="font-mono font-semibold tabular-nums">
          {now}%
        </span>
      </p>
      <div
        role="progressbar"
        aria-label="Profile completeness"
        aria-valuenow={now}
        aria-valuemin={0}
        aria-valuemax={100}
        className="relative h-2.5 overflow-hidden rounded-full bg-muted"
      >
        <span
          className="absolute inset-y-0 left-0 bg-chart-1/30 transition-[width] duration-(--duration-quick)"
          style={{ width: `${String(reachable)}%` }}
        />
        <span
          className="absolute inset-y-0 left-0 bg-chart-1 transition-[width] duration-(--duration-quick)"
          style={{ width: `${String(now)}%` }}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        {reachable > now ? `Approving what is left takes it to ${String(reachable)}%.` : null}
        {reachable === now && next ? `Next: ${next}.` : null}
      </p>
    </div>
  );
}
