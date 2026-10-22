'use client';

import type { RoadmapItem } from '@rumbo/contracts';
import { cn } from 'cn';
import { BriefcaseBusiness, FolderGit2, GraduationCap, type LucideIcon } from 'lucide-react';
import { type CSSProperties, type KeyboardEvent, useId, useRef, useState } from 'react';

import { formatDay } from '../../lib/format';
import { rovingIndex } from '../../lib/roadmap/roving';
import { LINE_BG, LINE_BG_AHEAD, LINE_BORDER } from '../../lib/line-colors';
import {
  type LaneCell,
  type SingleLine,
  type SingleLineRow,
  stationLabel,
} from '../../lib/roadmap/single-line';
import { StatusChip } from '../status-chip';

/*
 * Track geometry in px. MARKER_Y is the middle of a station's title line (card margin 4 + padding
 * 8 + half of a 24px line), so markers sit on the title whatever the card's height (#108).
 */
const LANE_START = 12;
const LANE_GAP = 20;
const MARKER_Y = 24;

const laneX = (index: number) => LANE_START + index * LANE_GAP;

const ITEM_ICON: Readonly<Record<RoadmapItem['type'], LucideIcon>> = {
  project: FolderGit2,
  education: GraduationCap,
  work_experience: BriefcaseBusiness,
};

const WORK_MODE_LABEL = { remote: 'Remote', hybrid: 'Hybrid', onsite: 'On site' } as const;

/**
 * The roadmap as one vertical line (spec 01, M2): the permanent phone view and the fallback when
 * there is no map layout. One lane per target; a target that does not stop at a station passes
 * through it (#108).
 */
export function SingleLineView({
  line,
  withMap = false,
  onActivate,
  onOpen,
}: {
  readonly line: SingleLine;
  /** The subway map is shown from `lg` (#117): the list keeps the stations and drops its lanes. */
  readonly withMap?: boolean;
  /** Highlights a station's targets on the map while it is hovered or focused (#117). */
  readonly onActivate?: (targetIds: readonly string[] | null) => void;
  /** Opens a station's panel (#109). */
  readonly onOpen?: (stationId: string) => void;
}) {
  const gutter = laneX(line.lanes.length - 1) + LANE_START;
  const hint = useId();
  const list = useRef<HTMLOListElement>(null);
  // Roving tabindex (#110): the list is one Tab stop, entered at "you are here" (or the first
  // station), and the arrow keys move between stations.
  const stations = line.rows.flatMap((row) => (row.kind === 'milestone' ? [row] : []));
  const entry = (stations.find((row) => row.current) ?? stations[0])?.id;
  const [focusId, setFocusId] = useState(entry);
  // If that station is gone (new data), fall back to the entry so the list stays reachable.
  const tabbableId = stations.some((row) => row.id === focusId) ? focusId : entry;
  const move = (event: KeyboardEvent<HTMLButtonElement>, id: string) => {
    const next = rovingIndex(
      event.key,
      stations.findIndex((row) => row.id === id),
      stations.length,
    );
    const target = next === null ? undefined : stations[next];
    if (!target) return;
    event.preventDefault();
    setFocusId(target.id);
    list.current
      ?.querySelector<HTMLButtonElement>(`[data-station-id="${CSS.escape(target.id)}"]`)
      ?.focus();
  };

  return (
    <>
      <p id={hint} className="sr-only">
        Use the arrow keys to move between stations, and Home or End for the first or last.
      </p>
      {/* role="list": Safari drops list semantics under Tailwind's `list-style: none` (#108). */}
      <ol ref={list} role="list" aria-label="Stations" className="flex flex-col">
        {line.rows.map((row) => (
          <li
            key={row.id}
            data-testid="station"
            data-kind={row.kind}
            className={cn(
              'grid grid-cols-[var(--gutter)_minmax(0,1fr)] gap-x-3',
              withMap && 'lg:grid-cols-1',
            )}
            style={{ '--gutter': `${String(gutter)}px` } as CSSProperties}
          >
            <Track row={row} hidden={withMap} />
            {row.kind === 'milestone' ? (
              <MilestoneStation
                row={row}
                hint={hint}
                tabbable={row.id === tabbableId}
                onKeyDown={(event) => {
                  move(event, row.id);
                }}
                onFocus={() => {
                  setFocusId(row.id);
                }}
                onActivate={onActivate}
                onOpen={onOpen}
              />
            ) : row.kind === 'terminal' ? (
              <Terminal row={row} />
            ) : (
              <Origin row={row} />
            )}
          </li>
        ))}
      </ol>
    </>
  );
}

/**
 * Transit-map markers (#108): a white station on its line, interchanges as ink-ringed stations
 * joined by an ink link, terminals as larger rings around their line's color. Status is told by
 * the chip and by the line (traveled solid, ahead faded), not by the marker.
 */
function Track({ row, hidden }: { readonly row: SingleLineRow; readonly hidden: boolean }) {
  const stops = row.cells.flatMap((cell, i) => (cell.stop ? [i] : []));
  const first = stops[0] ?? 0;
  const last = stops.at(-1) ?? first;
  const center = (laneX(first) + laneX(last)) / 2;
  const interchange = stops.length > 1;

  return (
    <div aria-hidden className={cn('relative', hidden && 'lg:hidden')}>
      {row.cells.map((cell, i) => (
        <Segments key={cell.lane.target.id} cell={cell} x={laneX(i)} />
      ))}
      {row.kind === 'milestone' && row.current ? (
        <span
          className="absolute size-9 -translate-1/2 animate-here-pulse rounded-full border-2 border-primary motion-reduce:hidden"
          style={at(center, MARKER_Y)}
        />
      ) : null}
      {interchange ? (
        <span
          className="absolute h-2 -translate-y-1/2 rounded-full bg-foreground"
          style={{ left: laneX(first), width: laneX(last) - laneX(first), top: MARKER_Y }}
        />
      ) : null}
      {stops.map((i) => {
        const cell = row.cells[i];
        if (!cell) return null;
        const color = cell.lane.color;
        if (row.kind !== 'milestone') {
          // Line ends: the starting point (ink center) and each target's terminal (its color).
          return (
            <span
              key={i}
              className="absolute flex size-[22px] -translate-1/2 items-center justify-center rounded-full border-4 border-foreground bg-card"
              style={at(laneX(i), MARKER_Y)}
            >
              <span
                className={cn(
                  'size-2 rounded-full',
                  row.kind === 'origin' ? 'bg-foreground' : LINE_BG[color],
                )}
              />
            </span>
          );
        }
        return (
          <span
            key={i}
            className={cn(
              'absolute -translate-1/2 rounded-full border-[3px] bg-card',
              interchange ? 'size-4 border-foreground' : cn('size-3.5', LINE_BORDER[color]),
            )}
            style={at(laneX(i), MARKER_Y)}
          />
        );
      })}
    </div>
  );
}

function Segments({ cell, x }: { readonly cell: LaneCell; readonly x: number }) {
  const style = (stretch: 'traveled' | 'ahead') =>
    cn(
      'absolute w-(--map-stroke) -translate-x-1/2',
      (stretch === 'traveled' ? LINE_BG : LINE_BG_AHEAD)[cell.lane.color],
    );
  return (
    <>
      {cell.top ? (
        <span className={style(cell.top)} style={{ left: x, top: 0, height: MARKER_Y }} />
      ) : null}
      {cell.bottom ? (
        <span className={style(cell.bottom)} style={{ left: x, top: MARKER_Y, bottom: 0 }} />
      ) : null}
    </>
  );
}

function MilestoneStation({
  row,
  hint,
  tabbable,
  onKeyDown,
  onFocus,
  onActivate,
  onOpen,
}: {
  readonly row: Extract<SingleLineRow, { kind: 'milestone' }>;
  /** Id of the instructions for the arrow keys. */
  readonly hint: string;
  readonly tabbable: boolean;
  readonly onKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => void;
  readonly onFocus: () => void;
  readonly onActivate: ((targetIds: readonly string[] | null) => void) | undefined;
  readonly onOpen: ((stationId: string) => void) | undefined;
}) {
  const { milestone } = row;
  const served = row.cells.filter((cell) => cell.stop);
  const activate = () => onActivate?.(row.serves.map((t) => t.id));
  const release = () => onActivate?.(null);

  return (
    // The button is only the title, so its accessible name starts with what it shows (WCAG 2.5.3);
    // its ::after stretches over the card, so the whole card still opens the panel (#110).
    <div
      onMouseEnter={activate}
      onMouseLeave={release}
      className="relative my-1 flex min-w-0 flex-col items-start gap-1.5 rounded-lg px-3 py-2 transition-colors duration-(--duration-quick) hover:bg-muted has-[button:focus-visible]:ring-2 has-[button:focus-visible]:ring-ring"
    >
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <button
          type="button"
          aria-label={stationLabel(row)}
          aria-haspopup="dialog"
          aria-describedby={hint}
          data-station-id={row.id}
          tabIndex={tabbable ? 0 : -1}
          onClick={() => onOpen?.(row.id)}
          onKeyDown={onKeyDown}
          onFocus={() => {
            onFocus();
            activate();
          }}
          onBlur={release}
          className="text-left font-heading text-base leading-6 font-semibold outline-none after:absolute after:inset-0 after:rounded-lg"
        >
          {milestone.title}
        </button>
        <StatusChip status={row.status} />
        {row.current ? (
          <span className="inline-flex h-5 items-center rounded-full bg-primary px-2 text-2xs font-semibold text-primary-foreground">
            You are here
          </span>
        ) : null}
      </div>
      {milestone.summary ? (
        <p className="text-sm text-muted-foreground">{milestone.summary}</p>
      ) : null}
      <ul
        role="list"
        aria-label="Targets"
        className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground"
      >
        {served.map((cell) => (
          <li key={cell.lane.target.id} className="inline-flex items-center gap-1.5">
            <span aria-hidden className={cn('size-2 rounded-full', LINE_BG[cell.lane.color])} />
            {cell.lane.target.roleFamily.name}
          </li>
        ))}
      </ul>
      <ul role="list" aria-label="Items" className="flex w-full flex-col gap-1">
        {milestone.items.map((item) => {
          const Icon = ITEM_ICON[item.type];
          return (
            <li key={item.id} className="flex items-start gap-2 text-sm">
              <Icon aria-hidden className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              <span className="min-w-0 flex-1">{item.title}</span>
              {item.expectedEnd ? (
                <span className="shrink-0 font-mono text-2xs leading-5 text-muted-foreground tabular-nums">
                  {formatDay(item.expectedEnd)}
                </span>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Terminal({ row }: { readonly row: Extract<SingleLineRow, { kind: 'terminal' }> }) {
  const { target } = row;
  const details = [
    target.seniority,
    target.workMode && WORK_MODE_LABEL[target.workMode],
    target.region,
  ].filter(Boolean);

  return (
    <div
      aria-label={stationLabel(row)}
      role="group"
      className="my-1 flex min-w-0 flex-col gap-1 px-3 py-2"
    >
      <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className="font-heading text-base leading-6 font-bold">{target.roleFamily.name}</span>
        <span className="text-2xs font-medium tracking-wide text-muted-foreground uppercase">
          Target role
        </span>
        {target.isPrimary ? (
          <span className="inline-flex h-5 items-center rounded-full border border-foreground/30 px-2 text-2xs font-medium">
            Primary
          </span>
        ) : null}
      </span>
      {details.length > 0 ? (
        <span className="font-mono text-xs text-muted-foreground">{details.join(' · ')}</span>
      ) : null}
    </div>
  );
}

function Origin({ row }: { readonly row: Extract<SingleLineRow, { kind: 'origin' }> }) {
  return (
    <div
      aria-label={stationLabel(row)}
      role="group"
      className="my-1 flex min-w-0 flex-col gap-0.5 px-3 py-2"
    >
      <span className="font-heading text-base leading-6 font-bold">{row.from}</span>
      <span className="text-2xs font-medium tracking-wide text-muted-foreground uppercase">
        Starting point
      </span>
    </div>
  );
}

function at(x: number, y: number): CSSProperties {
  return { left: x, top: y };
}
