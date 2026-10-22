'use client';

import { cn } from 'cn';
import type { CSSProperties } from 'react';

import { LINE_FILL, LINE_STROKE } from '../../lib/line-colors';
import type { MapStation, Point, SubwayMap } from '../../lib/roadmap/subway-map';

const STROKE = 8;
/** Stagger between consecutive stretches of a line as it draws in (#117). */
const DRAW_STAGGER_MS = 140;

/**
 * The roadmap as a subway map (spec 01, M3, #117). Decoration only (`aria-hidden`): the station
 * list below it is what keyboards and screen readers use, as in M2. Hovering a line or a station
 * highlights its targets and dims the rest; the list's stations do the same on hover and focus.
 */
export function SubwayMapView({
  map,
  active,
  onActivate,
  onOpen,
}: {
  readonly map: SubwayMap;
  readonly active: readonly string[] | null;
  readonly onActivate: (targetIds: readonly string[] | null) => void;
  /** Mouse shortcut to a station's panel; keyboards open it from the list (#109). */
  readonly onOpen?: (stationId: string) => void;
}) {
  const { x, y, w, h } = map.viewBox;
  const dimmed = (targetIds: readonly string[]) =>
    active !== null && !targetIds.some((id) => active.includes(id));

  return (
    <svg
      aria-hidden
      data-testid="subway-map"
      viewBox={`${String(x)} ${String(y)} ${String(w)} ${String(h)}`}
      className="h-auto w-full"
      onMouseLeave={() => {
        onActivate(null);
      }}
    >
      <g fill="none" strokeLinecap="round" strokeLinejoin="round">
        {map.segments.map((segment) => (
          <path
            key={segment.key}
            d={path(segment.points)}
            pathLength={1}
            strokeWidth={STROKE}
            className={cn(
              'animate-draw-line cursor-pointer transition-opacity duration-(--duration-base) [stroke-dasharray:1]',
              LINE_STROKE[segment.color],
              dimmed([segment.targetId])
                ? 'opacity-15'
                : segment.stretch === 'ahead'
                  ? 'opacity-45'
                  : 'opacity-100',
            )}
            style={{ animationDelay: `${String(segment.order * DRAW_STAGGER_MS)}ms` }}
            onMouseEnter={() => {
              onActivate([segment.targetId]);
            }}
          />
        ))}
      </g>
      {map.stations.map((station) => (
        <Station
          key={station.id}
          station={station}
          dimmed={dimmed(station.targetIds)}
          onEnter={() => {
            onActivate(station.targetIds);
          }}
          onClick={
            station.kind === 'milestone' && onOpen
              ? () => {
                  onOpen(station.id);
                }
              : undefined
          }
        />
      ))}
    </svg>
  );
}

function Station({
  station,
  dimmed,
  onEnter,
  onClick,
}: {
  readonly station: MapStation;
  readonly dimmed: boolean;
  readonly onEnter: () => void;
  readonly onClick: (() => void) | undefined;
}) {
  const { from, to } = station;
  const center = { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 };
  const capsule = from.x !== to.x || from.y !== to.y;
  const end = station.kind !== 'milestone';

  return (
    <g
      data-station={station.id}
      className={cn(
        'transition-opacity duration-(--duration-base)',
        dimmed ? 'opacity-30' : 'opacity-100',
      )}
      onMouseEnter={onEnter}
      onClick={onClick}
    >
      {station.current ? (
        <circle
          cx={center.x}
          cy={center.y}
          r={18}
          fill="none"
          strokeWidth={2.5}
          className="animate-here-pulse stroke-primary [transform-box:fill-box] origin-center motion-reduce:hidden"
        />
      ) : null}
      {capsule || end ? (
        <>
          <line
            x1={from.x}
            y1={from.y}
            x2={to.x}
            y2={to.y}
            strokeLinecap="round"
            strokeWidth={end ? 26 : 22}
            className="stroke-foreground"
          />
          <line
            x1={from.x}
            y1={from.y}
            x2={to.x}
            y2={to.y}
            strokeLinecap="round"
            strokeWidth={end ? 16 : 14}
            className="stroke-card"
          />
          {end ? (
            <circle
              cx={center.x}
              cy={center.y}
              r={4.5}
              className={
                station.kind === 'origin' || !station.color
                  ? 'fill-foreground'
                  : LINE_FILL[station.color]
              }
            />
          ) : null}
        </>
      ) : (
        <circle
          cx={center.x}
          cy={center.y}
          r={8}
          strokeWidth={3.5}
          className={cn(
            'fill-card',
            station.color ? LINE_STROKE[station.color] : 'stroke-foreground',
          )}
        />
      )}
      {/* A wider invisible target, so hovering a station is easy. */}
      <circle cx={center.x} cy={center.y} r={20} className="cursor-pointer fill-transparent" />
      <Label station={station} at={center} />
    </g>
  );
}

/** Station names rotated as on a transit map; target roles read straight, after their terminal. */
function Label({ station, at }: { readonly station: MapStation; readonly at: Point }) {
  const terminal = station.kind === 'terminal';
  const style: CSSProperties = { paintOrder: 'stroke' };
  return (
    <text
      transform={
        terminal
          ? `translate(${String(at.x + 22)} ${String(at.y + 5)})`
          : `translate(${String(at.x + 6)} ${String(at.y - 20)}) rotate(${String(station.labelAngle)})`
      }
      strokeWidth={5}
      strokeLinejoin="round"
      style={style}
      className={cn(
        'fill-foreground stroke-background',
        terminal || station.kind === 'origin'
          ? 'font-heading text-[15px] font-bold'
          : 'text-[13px] font-medium',
      )}
    >
      {station.label}
    </text>
  );
}

function path(points: readonly Point[]): string {
  return points
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(' ');
}
