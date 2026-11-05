'use client';

import { useEvidenceDecisions } from '../../lib/store';
import { countText, projectsBadge, type TabBadge } from '../../lib/tabs';

const CHIP = 'inline-flex h-6 items-center rounded-full border px-2.5 text-xs font-medium';

/**
 * What the tab's badge stands for, in words (owner, #114): the rail has room for a number only, so
 * this is where it gets its meaning. Moves with the decisions, like the badge.
 */
export function ProjectsSummary({
  badge,
  tasks,
}: {
  readonly badge: TabBadge | undefined;
  readonly tasks: Readonly<Record<string, string>>;
}) {
  const { decisions } = useEvidenceDecisions();
  const current = projectsBadge(badge, decisions, tasks);
  const openTasks = current?.count;
  const awaiting = current?.attention;
  return (
    <p role="status" className="flex flex-wrap items-center gap-2">
      {openTasks ? <span className={CHIP}>{countText(openTasks)}</span> : null}
      {awaiting?.value ? (
        <span className={`${CHIP} border-attention/40 bg-attention/5 text-attention`}>
          {countText(awaiting)}
        </span>
      ) : null}
    </p>
  );
}
