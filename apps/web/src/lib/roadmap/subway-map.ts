import type {
  GridPoint,
  ItemStatus,
  LineColorToken,
  Roadmap,
  RoadmapLayout,
  RoadmapView,
} from '@rumbo/contracts';

import { laneOrder, ORIGIN_ID, type Stretch } from './single-line';

/**
 * The desktop subway map as plain geometry (spec 01, M3, #117): every derived route drawn from the
 * hand-authored layout, plus the starting point every line leaves from. Pure, so the SVG is a
 * direct render of this and the rules are unit-tested here.
 */

/** Pixels per grid unit, and between parallel lanes on a shared stretch. */
export const UNIT = 64;
export const LANE = 10;
/** Room for the terminal labels to the right; the top fits the rotated labels (labelTop). */
const PAD = { right: 250, bottom: 60, left: 60 };

export interface Point {
  readonly x: number;
  readonly y: number;
}

export interface MapSegment {
  readonly key: string;
  readonly targetId: string;
  /** The stations the stretch joins, in route order. */
  readonly from: string;
  readonly to: string;
  readonly color: LineColorToken;
  readonly points: readonly Point[];
  readonly stretch: Stretch;
  /** Position along its line, for the draw-in animation's stagger. */
  readonly order: number;
}

export interface MapStation {
  readonly id: string;
  readonly kind: 'origin' | 'milestone' | 'terminal';
  readonly label: string;
  /** Targets that stop here, in lane order. */
  readonly targetIds: readonly string[];
  /** The glyph: a ring at `from`, or a capsule from `from` to `to` when lines stop side by side. */
  readonly from: Point;
  readonly to: Point;
  readonly color: LineColorToken | null;
  readonly status: ItemStatus | null;
  readonly current: boolean;
  /** Label rotation in degrees: steeper where a line leaves up and to the right, so they never cross. */
  readonly labelAngle: number;
}

export interface SubwayMap {
  readonly viewBox: {
    readonly x: number;
    readonly y: number;
    readonly w: number;
    readonly h: number;
  };
  readonly segments: readonly MapSegment[];
  readonly stations: readonly MapStation[];
}

export function subwayMap(
  roadmap: Roadmap,
  layout: RoadmapLayout,
  view: RoadmapView,
  colors: ReadonlyMap<string, LineColorToken>,
  /** The station marked "you are here": the selected line's (#148), else the plan's. */
  currentId: string | null = view.currentMilestoneId,
): SubwayMap {
  const targets = laneOrder(roadmap);
  const at = new Map(layout.stations.map((s) => [s.id, s.at]));
  const primary = targets[0];
  const firstOfPrimary = at.get(view.routes.get(primary?.id ?? '')?.[0] ?? '');
  const minX = Math.min(...layout.stations.map((s) => s.at.x));
  // The starting point sits two units before the leftmost station, level with the main line.
  const origin: GridPoint = { x: minX - 2, y: firstOfPrimary?.y ?? 0 };
  at.set(ORIGIN_ID, origin);

  const statusOf = (id: string): ItemStatus | undefined =>
    id === ORIGIN_ID ? 'done' : view.statusByMilestone.get(id);

  // Each line keeps one lane for its whole route, in lane order with the primary on top (lane -1
  // is above on a rightward stretch), and its corners are mitred: lines that share a stretch run
  // side by side and never jump between lanes at a station or bend (#117). This replaces the
  // layout's authored offsets, which shifted each stretch on its own and broke lines at stations.
  const segments: MapSegment[] = [];
  targets.forEach((target, laneIndex) => {
    const color = colors.get(target.id) ?? 'line-1';
    const lane = laneIndex - (targets.length - 1) / 2;
    const route = [ORIGIN_ID, ...(view.routes.get(target.id) ?? [])].filter((id) => at.has(id));

    const grid: GridPoint[] = [];
    const stationIndex: number[] = [];
    route.forEach((id, i) => {
      const point = at.get(id);
      const previous = route[i - 1];
      if (!point) return;
      if (previous !== undefined) {
        const start = at.get(previous);
        grid.push(
          ...(previous === ORIGIN_ID && start
            ? originBend(start, point)
            : (layout.bends.find((bend) => bend.targetId === target.id && bend.after === previous)
                ?.points ?? [])),
        );
      }
      stationIndex.push(grid.length);
      grid.push(point);
    });
    const points = offsetPolyline(grid.map(toPx), lane * LANE);

    route.slice(1).forEach((to, i) => {
      const from = route[i] ?? ORIGIN_ID;
      segments.push({
        key: `${target.id}|${from}|${to}`,
        targetId: target.id,
        from,
        to,
        color,
        points: points.slice(stationIndex[i], (stationIndex[i + 1] ?? points.length - 1) + 1),
        stretch: statusOf(from) === 'done' ? 'traveled' : 'ahead',
        order: i,
      });
    });
  });

  const stationIds = [
    ORIGIN_ID,
    ...roadmap.milestones.map((m) => m.id),
    ...targets.map((t) => t.id),
  ];
  const stations = stationIds.flatMap((id): MapStation[] => {
    const touching = segments.filter((s) => s.from === id || s.to === id);
    const ends = touching.map((s) => (s.from === id ? s.points[0] : s.points.at(-1)));
    const [glyphFrom, glyphTo] = extremes(ends.filter((p): p is Point => p !== undefined));
    if (!glyphFrom || !glyphTo) return [];

    const stopping = targets.filter((t) => touching.some((s) => s.targetId === t.id));
    const climbs = touching.some((s) => {
      const [here, next] =
        s.from === id ? [s.points[0], s.points[1]] : [s.points.at(-1), s.points.at(-2)];
      return here && next && next.x > here.x && next.y < here.y;
    });
    const milestone = roadmap.milestones.find((m) => m.id === id);
    const target = targets.find((t) => t.id === id);
    return [
      {
        id,
        kind: id === ORIGIN_ID ? 'origin' : target ? 'terminal' : 'milestone',
        label: milestone?.title ?? target?.roleFamily.name ?? roadmap.from,
        targetIds: stopping.map((t) => t.id),
        from: glyphFrom,
        to: glyphTo,
        color: stopping.length === 1 ? (colors.get(stopping[0]?.id ?? '') ?? null) : null,
        status: milestone ? (view.statusByMilestone.get(id) ?? 'pending') : null,
        current: id === currentId,
        labelAngle: climbs ? -60 : -35,
      },
    ];
  });

  const all = segments.flatMap((s) => s.points);
  const xs = all.map((p) => p.x);
  const ys = all.map((p) => p.y);
  const left = Math.min(...xs) - PAD.left;
  // Only as much room above as the tallest rotated label needs, not a fixed band: a fixed one left
  // a large gap above maps whose top stations carry short labels (#148).
  const top = Math.min(Math.min(...ys) - PAD.bottom, ...stations.map(labelTop)) - LABEL_MARGIN;
  return {
    viewBox: {
      x: left,
      y: top,
      w: Math.max(...xs) + PAD.right - left,
      h: Math.max(...ys) + PAD.bottom - top,
    },
    segments,
    stations,
  };
}

/** Average glyph widths of the label fonts (13px medium, 15px heading bold), for the label fit. */
const CHAR_PX = { station: 7.2, heading: 9 };
/** The rotated label starts this far above its station (subway-map-view's Label). */
const LABEL_LIFT = 20;
const LABEL_MARGIN = 12;

/**
 * The highest point a station's label reaches. Terminal labels read straight, beside their
 * station; the others are rotated and rise with their length.
 */
export function labelTop(station: MapStation): number {
  const y = (station.from.y + station.to.y) / 2;
  if (station.kind === 'terminal') return y - LABEL_LIFT;
  const char = station.kind === 'origin' ? CHAR_PX.heading : CHAR_PX.station;
  const rise =
    station.label.length * char * Math.sin((Math.abs(station.labelAngle) * Math.PI) / 180);
  return y - LABEL_LIFT - rise;
}

/** Grid to pixels. */
function toPx(p: GridPoint): Point {
  return { x: p.x * UNIT, y: p.y * UNIT };
}

/**
 * Corner points from the starting point to a line's first station, keeping every segment
 * horizontal, vertical or at 45°: along the main line first, then diagonally to the station.
 */
export function originBend(from: GridPoint, to: GridPoint): GridPoint[] {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  if (dy === 0 || Math.abs(dx) === Math.abs(dy)) return [];
  if (Math.abs(dx) > Math.abs(dy)) {
    return [{ x: to.x - Math.sign(dx) * Math.abs(dy), y: from.y }];
  }
  return [{ x: to.x, y: from.y + Math.sign(dy) * Math.abs(dx) }];
}

/**
 * The polyline moved `distance` px to its left (negative: to its right), as a parallel line:
 * each corner sits where the two shifted edges meet (a miter), so the line stays continuous.
 */
export function offsetPolyline(points: readonly Point[], distance: number): Point[] {
  if (distance === 0) return [...points];
  const normal = (a: Point, b: Point): Point | null => {
    const length = Math.hypot(b.x - a.x, b.y - a.y);
    return length === 0 ? null : { x: -(b.y - a.y) / length, y: (b.x - a.x) / length };
  };
  return points.map((p, i) => {
    const before = i > 0 ? normal(points[i - 1] ?? p, p) : null;
    const after = i < points.length - 1 ? normal(p, points[i + 1] ?? p) : null;
    const n1 = before ?? after;
    const n2 = after ?? before;
    if (!n1 || !n2) return p;
    const dot = n1.x * n2.x + n1.y * n2.y;
    // A near-reversal would send the miter to infinity: fall back to the incoming edge's normal.
    const m = dot < -0.9 ? n1 : { x: (n1.x + n2.x) / (1 + dot), y: (n1.y + n2.y) / (1 + dot) };
    return { x: p.x + m.x * distance, y: p.y + m.y * distance };
  });
}

/** The two points farthest apart: the ends of a station's capsule. */
function extremes(points: readonly Point[]): [Point | undefined, Point | undefined] {
  let best: [Point | undefined, Point | undefined] = [points[0], points[0]];
  let distance = -1;
  for (const p of points) {
    for (const q of points) {
      const d = Math.hypot(p.x - q.x, p.y - q.y);
      if (d > distance) {
        distance = d;
        best = [p, q];
      }
    }
  }
  return best;
}
