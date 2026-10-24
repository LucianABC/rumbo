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
 * One target's market (docs/product/views.md, #111): the snapshot, then the skills its postings
 * ask for most as a ranked list. Each row has its percentage as text, so the bars are decoration
 * and the list reads the same without them.
 */
export function MarketSection({
  lanes,
  selectedId,
  market,
}: {
  readonly lanes: readonly Lane[];
  /** The target whose market shows: `?target=`, else the primary. */
  readonly selectedId: string;
  /** Null when the market data could not be read. */
  readonly market: MarketView | null;
}) {
  const color = lanes.find((l) => l.target.id === selectedId)?.color ?? 'line-1';
  return (
    <section aria-labelledby="market-heading" className="flex min-w-0 flex-col gap-3">
      <h2 id="market-heading" className={HEADING}>
        Market
      </h2>
      <LineSwitcher lanes={lanes} selectedId={selectedId} param="target" label="Show market for" />
      {market ? (
        <Snapshot market={market} color={color} />
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
    <div className="flex min-w-0 flex-col gap-3 rounded-xl border bg-card p-4">
      <div>
        <h3 className="font-semibold">{name}</h3>
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
        <RankedList rows={asked} color={color} label={`Skills ${name} postings ask for most`} />
      ) : (
        <p className="text-sm text-muted-foreground">
          No skill appears in {Math.round(ASKED_MIN_SHARE * 100)}% of these postings yet.
        </p>
      )}
      {less.length > 0 ? (
        <details className="group text-sm">
          <summary className="cursor-pointer rounded-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring">
            Asked less often ({less.length})
          </summary>
          <RankedList
            rows={less}
            color={color}
            label={`Skills ${name} postings ask for less often`}
            className="mt-3"
          />
        </details>
      ) : null}
    </div>
  );
}

function RankedList({
  rows,
  color,
  label,
  className,
}: {
  readonly rows: readonly MarketRow[];
  readonly color: LineColorToken;
  readonly label: string;
  readonly className?: string;
}) {
  return (
    <ol aria-label={label} start={rows[0]?.rank} className={cn('flex flex-col gap-3', className)}>
      {rows.map((row) => (
        <li
          key={row.skill.id}
          className="grid grid-cols-[1.5rem_minmax(0,1fr)_auto] items-baseline gap-x-2 gap-y-1 md:grid-cols-[1.5rem_minmax(0,16rem)_minmax(4rem,1fr)_3rem] md:items-center"
        >
          <span className="font-mono text-xs tabular-nums text-muted-foreground">{row.rank}</span>
          <div className="min-w-0">
            <p className="text-sm font-medium break-words">{row.skill.name}</p>
            <Mark row={row} />
          </div>
          <span className="text-right font-mono text-sm font-semibold tabular-nums md:order-last">
            {formatShare(row.share)}
          </span>
          {/* Decoration: the percentage beside it says the same. */}
          <div
            aria-hidden
            className="col-start-2 col-end-4 h-1.5 overflow-hidden rounded-full bg-muted md:col-auto"
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
