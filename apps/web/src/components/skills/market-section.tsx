import type { LineColorToken } from '@rumbo/contracts';
import { cn } from 'cn';

import { ASKED_MIN_SHARE } from '../../lib/coverage';
import { formatDay, formatShare } from '../../lib/format';
import { GAP_STATUS_LABEL } from '../../lib/labels';
import { LINE_BG } from '../../lib/line-colors';
import type { Lane } from '../../lib/roadmap/single-line';
import type { MarketRow, MarketView } from '../../lib/skills/skills-view';
import { LineSwitcher } from '../roadmap/line-switcher';
import { HEADING, LINK, Unavailable } from './shared';

/**
 * The market across the top of Skills & gaps (docs/product/views.md, #111): every target's
 * snapshot side by side, or one target's across the full width with its ranking in two columns.
 * Each row has its percentage as text, so the bars are decoration and the list reads the same
 * without them.
 */
export function MarketSection({
  lanes,
  selectedId,
  markets,
}: {
  readonly lanes: readonly Lane[];
  /** The target the tab is narrowed to, or null for every target. */
  readonly selectedId: string | null;
  /** One per target shown, in lane order; null when the market data could not be read. */
  readonly markets: readonly { readonly lane: Lane; readonly view: MarketView }[] | null;
}) {
  return (
    <section
      id="market"
      aria-labelledby="market-heading"
      className="flex min-w-0 scroll-mt-20 flex-col gap-3"
    >
      <h2 id="market-heading" className={HEADING}>
        Market
      </h2>
      <LineSwitcher
        lanes={lanes}
        selectedId={selectedId}
        param="target"
        label="Show"
        all={{ label: 'All targets', href: '/skills' }}
      />
      {markets ? (
        <>
          {/* The percentage alone read as a score; this says what it counts (#111). */}
          <p className="text-sm text-muted-foreground">
            Each percentage is the share of that target&apos;s postings that ask for the skill.
          </p>
          <div className={cn('grid gap-3', selectedId === null && 'md:grid-cols-2 xl:grid-cols-3')}>
            {markets.map(({ lane, view }) => (
              <Snapshot key={lane.target.id} market={view} color={lane.color} />
            ))}
          </div>
        </>
      ) : (
        <Unavailable title="Market data unavailable">
          The market snapshots could not be read or do not match your targets. The gaps below still
          show the numbers stored with each one.
        </Unavailable>
      )}
    </section>
  );
}

function Snapshot({
  market: { snapshot, asked, less, stale },
  color,
}: {
  readonly market: MarketView;
  readonly color: LineColorToken;
}) {
  const name = snapshot.roleFamily.name;
  return (
    <div className="@container flex min-w-0 flex-col gap-3 rounded-xl border bg-card p-4">
      <div>
        <h3 className="flex items-center gap-2 font-semibold">
          <span aria-hidden className={cn('h-1 w-4 shrink-0 rounded-full', LINE_BG[color])} />
          {name}
        </h3>
        <p className="text-sm text-muted-foreground">
          {snapshot.region} ·{' '}
          <span className="font-mono tabular-nums text-foreground">{snapshot.postingCount}</span>{' '}
          postings · checked {formatDay(snapshot.checkedAt)}
        </p>
        {stale ? (
          <p className="mt-1 text-sm text-attention">
            This snapshot is over a month old; refreshing it comes with live market data.
          </p>
        ) : null}
      </div>
      {asked.length > 0 ? (
        <RankedList
          rows={asked}
          color={color}
          postings={snapshot.postingCount}
          label={`Skills ${name} postings ask for most`}
        />
      ) : (
        <p className="text-sm text-muted-foreground">
          No skill appears in {Math.round(ASKED_MIN_SHARE * 100)}% of these postings yet.
        </p>
      )}
      {less.length > 0 ? (
        <details className="text-sm">
          <summary className="cursor-pointer rounded-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring">
            Asked less often ({less.length})
          </summary>
          <RankedList
            rows={less}
            color={color}
            postings={snapshot.postingCount}
            label={`Skills ${name} postings ask for less often`}
            className="mt-3"
          />
        </details>
      ) : null}
    </div>
  );
}

/**
 * Two columns once the card is wide (one target across the page), read top to bottom then
 * across, like the rank. Rows put the bar beside the name when the card has room, else under it.
 */
function RankedList({
  rows,
  color,
  postings,
  label,
  className,
}: {
  readonly rows: readonly MarketRow[];
  readonly color: LineColorToken;
  readonly postings: number;
  readonly label: string;
  readonly className?: string;
}) {
  return (
    <ol
      aria-label={label}
      start={rows[0]?.rank}
      className={cn('gap-x-10 @3xl:columns-2', className)}
    >
      {rows.map((row) => (
        <li
          key={row.skill.id}
          className="mb-3 grid break-inside-avoid grid-cols-[1.5rem_minmax(0,1fr)_auto] items-baseline gap-x-2 gap-y-1 last:mb-0 @lg:grid-cols-[1.5rem_minmax(0,16rem)_minmax(4rem,1fr)_3rem] @lg:items-center"
        >
          <span className="font-mono text-xs tabular-nums text-muted-foreground">{row.rank}</span>
          <div className="min-w-0">
            <p className="text-sm font-medium break-words">{row.skill.name}</p>
            <Mark row={row} />
          </div>
          <span
            className="text-right font-mono text-sm font-semibold tabular-nums @lg:order-last"
            title={`Asked in ${formatShare(row.share)} of ${String(postings)} postings`}
          >
            {formatShare(row.share)}
            <span className="sr-only"> of {postings} postings</span>
          </span>
          {/* Decoration: the percentage beside it says the same. */}
          <div
            aria-hidden
            className="col-start-2 col-end-4 h-1.5 overflow-hidden rounded-full bg-muted @lg:col-auto"
          >
            <div
              className={cn('h-full rounded-full', LINE_BG[color])}
              style={{ width: formatShare(row.share) }}
            />
          </div>
        </li>
      ))}
    </ol>
  );
}

function Mark({ row: { mark } }: { readonly row: MarketRow }) {
  switch (mark.kind) {
    case 'unknown':
      return null;
    case 'missing':
      return <p className="text-xs text-muted-foreground">No evidence yet</p>;
    case 'gap':
      return (
        <p className="text-xs">
          <a href={`#gap-${mark.gap.id}`} className={cn(LINK, 'text-attention')}>
            Gap
          </a>
          <span className="text-muted-foreground"> · {GAP_STATUS_LABEL[mark.gap.status]}</span>
        </p>
      );
    case 'have':
      return (
        <p className="text-xs">
          <span className="font-medium text-success">You have it</span>
          <span className="text-muted-foreground">
            {' '}
            · {mark.evidenceCount} evidence
            {mark.gap && mark.gap.status !== 'closed' ? (
              <>
                {' '}
                ·{' '}
                <a href={`#gap-${mark.gap.id}`} className={LINK}>
                  still a gap
                </a>{' '}
                ({GAP_STATUS_LABEL[mark.gap.status]})
              </>
            ) : null}
          </span>
        </p>
      );
  }
}
