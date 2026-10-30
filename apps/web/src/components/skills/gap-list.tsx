import { cn } from 'cn';
import { ChevronRight } from 'lucide-react';
import Link from 'next/link';

import { formatShare } from '../../lib/format';
import { itemKindLabel } from '../../lib/labels';
import { LINE_BG } from '../../lib/line-colors';
import type { GapCard } from '../../lib/skills/skills-view';
import { GapStatusChip, StatusChip } from '../status-chip';
import { HEADING } from './shared';

/**
 * Every gap by priority (docs/product/views.md, #111). The market numbers that justify a gap are
 * data, set in mono figures; the model's rationale is opinion, set apart and labeled, and
 * described by those numbers so a screen reader hears what it rests on.
 */
export function GapList({ cards }: { readonly cards: readonly GapCard[] }) {
  return (
    <section
      id="gaps"
      aria-labelledby="gaps-heading"
      className="flex min-w-0 scroll-mt-20 flex-col gap-3"
    >
      <h2 id="gaps-heading" className={HEADING}>
        Gaps <span className="font-mono tabular-nums">({cards.length})</span>
      </h2>
      {cards.length > 0 ? (
        <ol aria-label="Gaps in priority order" className="flex flex-col gap-3">
          {cards.map((card) => (
            <GapItem key={card.gap.id} card={card} />
          ))}
        </ol>
      ) : (
        <p className="rounded-xl border bg-card p-4 text-sm">
          Your evidence covers what these postings ask for.
        </p>
      )}
    </section>
  );
}

function GapItem({ card: { gap, demand, sharedBy, items } }: { readonly card: GapCard }) {
  const numbersId = `gap-${gap.id}-numbers`;
  return (
    <li
      id={`gap-${gap.id}`}
      className="flex min-w-0 scroll-mt-20 flex-col gap-3 rounded-xl border bg-card p-4"
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-xs tabular-nums text-muted-foreground">
          <span className="sr-only">Priority </span>#{gap.priority}
        </span>
        <h3 className="font-semibold break-words">{gap.skill.name}</h3>
        <GapStatusChip status={gap.status} />
        {sharedBy > 1 ? (
          <span className="text-xs text-muted-foreground">Shared by {sharedBy} targets</span>
        ) : null}
      </div>

      <ul id={numbersId} role="list" aria-label="Market numbers" className="flex flex-col gap-1">
        {demand.map((d) => (
          <li
            key={d.lane.target.id}
            className="flex items-center gap-2 text-sm text-muted-foreground"
          >
            <span
              aria-hidden
              className={cn('h-1 w-4 shrink-0 rounded-full', LINE_BG[d.lane.color])}
            />
            <span className="min-w-0">
              Asked in{' '}
              <span className="font-mono font-semibold tabular-nums text-foreground">
                {formatShare(d.share)}
              </span>{' '}
              of <span className="font-mono tabular-nums">{d.postingCount}</span>{' '}
              {d.lane.target.roleFamily.name} postings
            </span>
          </li>
        ))}
      </ul>

      <figure className="border-l-2 border-border pl-3">
        <figcaption className="text-2xs font-medium text-muted-foreground uppercase">
          rumbo&apos;s reading
        </figcaption>
        <blockquote aria-describedby={numbersId} className="text-sm text-muted-foreground italic">
          {gap.rationale}
        </blockquote>
      </figure>

      <div className="flex flex-col gap-1.5">
        <p className="text-xs font-medium text-muted-foreground">Closed by</p>
        <ul role="list" className="flex flex-col gap-1.5">
          {items.map(({ item, milestone, href }) => (
            <li key={item.id}>
              <Link
                href={href}
                className="group flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 rounded-md border px-3 py-2 text-sm outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span className="text-xs text-muted-foreground">{itemKindLabel(item)}</span>
                <span className="min-w-0 font-medium break-words">{item.title}</span>
                <StatusChip status={item.status} />
                <span className="ml-auto inline-flex items-center gap-1 text-xs text-muted-foreground group-hover:text-foreground">
                  {milestone.title}
                  <ChevronRight aria-hidden className="size-3.5" />
                </span>
                <span className="sr-only">, open its station on Roadmap</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </li>
  );
}
