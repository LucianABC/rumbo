'use client';

import { usePlan } from '../../lib/store';
import { countText, tabBadges } from '../../lib/tabs';

const CHIP = 'inline-flex h-6 items-center rounded-full border px-2.5 text-xs font-medium';

/**
 * What the tab's badge stands for, in words (owner, #114): the rail has room for a number only, so
 * this is where it gets its meaning. Reads the same plan as the badge, so both move together (#168).
 */
export function ProjectsSummary() {
  const badge = tabBadges(usePlan().roadmap).projects;
  const openTasks = badge?.count;
  const awaiting = badge?.attention;
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
