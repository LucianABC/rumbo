import type {
  ItemStatus,
  LineColorToken,
  Milestone,
  Roadmap,
  RoadmapView,
  Target,
} from '@rumbo/contracts';

import { ITEM_STATUS_LABEL } from '../labels';

/**
 * The single-line view as rows and lanes (spec 01, M2, #108): the starting point, milestones in
 * plan order, then one terminal per target, each crossed by one vertical lane per target. Every
 * line leaves from the starting point. Pure, so the drawing is a
 * direct render of this and every rule is unit-tested here.
 */

/** A stretch is traveled once the user has left the stop it starts from (that stop is done). */
export type Stretch = 'traveled' | 'ahead';

export interface Lane {
  readonly target: Target;
  readonly color: LineColorToken;
}

export interface LaneCell {
  readonly lane: Lane;
  /** The stretch arriving from above, or null where the line has not started yet. */
  readonly top: Stretch | null;
  /** The stretch leaving downwards, or null where the line has ended. */
  readonly bottom: Stretch | null;
  /** Whether this target stops here; otherwise the line passes through. */
  readonly stop: boolean;
}

/** Row id of the starting point; `:` keeps it apart from contract ids (kebab-case). */
export const ORIGIN_ID = 'origin:start';

export type SingleLineRow =
  | {
      readonly kind: 'origin';
      readonly id: typeof ORIGIN_ID;
      /** Where the user starts, e.g. their current role (`Roadmap.from`). */
      readonly from: string;
      readonly cells: readonly LaneCell[];
    }
  | {
      readonly kind: 'milestone';
      readonly id: string;
      readonly milestone: Milestone;
      readonly status: ItemStatus;
      readonly current: boolean;
      /** The targets that stop here, in lane order. */
      readonly serves: readonly Target[];
      /**
       * Those targets' lanes, for the station's target chips: kept whole when the list shows one
       * line, so a station still shows every target it advances (#148).
       */
      readonly servedLanes: readonly Lane[];
      readonly cells: readonly LaneCell[];
    }
  | {
      readonly kind: 'terminal';
      readonly id: string;
      readonly target: Target;
      /** Every milestone on the target's route is done. */
      readonly reached: boolean;
      readonly cells: readonly LaneCell[];
    };

export interface SingleLine {
  readonly lanes: readonly Lane[];
  readonly rows: readonly SingleLineRow[];
}

/** Primary first, then the roadmap's order: the main line is always the first lane. */
export function laneOrder(roadmap: Roadmap): Target[] {
  return [...roadmap.targets].sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary));
}

/** Every target with its color, primary first: the order every tab lists targets in. */
export function lanesOf(roadmap: Roadmap, colors: ReadonlyMap<string, LineColorToken>): Lane[] {
  return laneOrder(roadmap).map((target, i) => ({
    target,
    // getTargetColors covers every target (at most three, one slot each); the fallback only keeps
    // the type honest.
    color: colors.get(target.id) ?? (['line-1', 'line-2', 'line-3'] as const)[i] ?? 'line-1',
  }));
}

export function singleLine(
  roadmap: Roadmap,
  view: RoadmapView,
  colors: ReadonlyMap<string, LineColorToken>,
): SingleLine {
  const lanes = lanesOf(roadmap, colors);

  const ids = [ORIGIN_ID, ...roadmap.milestones.map((m) => m.id), ...lanes.map((l) => l.target.id)];
  const rowOf = new Map(ids.map((id, i) => [id, i]));
  // The user has already left the starting point, so the first stretch of every line is traveled.
  const statusOf = (id: string) => (id === ORIGIN_ID ? 'done' : view.statusByMilestone.get(id));
  const routeOf = (targetId: string) => [ORIGIN_ID, ...(view.routes.get(targetId) ?? [])];

  // Each lane's stretches as row ranges: [from, to) with the style of the stop it leaves.
  const stretches = new Map(
    lanes.map((lane) => {
      const stops = routeOf(lane.target.id).map((id) => rowOf.get(id) ?? -1);
      return [
        lane.target.id,
        stops.slice(1).map((to, i) => {
          const from = stops[i] ?? -1;
          const style: Stretch = statusOf(ids[from] ?? '') === 'done' ? 'traveled' : 'ahead';
          return { from, to, style };
        }),
      ] as const;
    }),
  );

  const cellsAt = (row: number): LaneCell[] =>
    lanes.map((lane) => {
      const own = stretches.get(lane.target.id) ?? [];
      const route = routeOf(lane.target.id);
      return {
        lane,
        top: own.find((s) => s.from < row && row <= s.to)?.style ?? null,
        bottom: own.find((s) => s.from <= row && row < s.to)?.style ?? null,
        stop: route.includes(ids[row] ?? ''),
      };
    });

  const origin: SingleLineRow = {
    kind: 'origin',
    id: ORIGIN_ID,
    from: roadmap.from,
    cells: cellsAt(0),
  };

  const milestoneRows = roadmap.milestones.map((milestone, i): SingleLineRow => {
    const serves = view.targetsByMilestone.get(milestone.id) ?? [];
    return {
      kind: 'milestone',
      id: milestone.id,
      milestone,
      status: statusOf(milestone.id) ?? 'pending',
      current: milestone.id === view.currentMilestoneId,
      serves: lanes.map((l) => l.target).filter((t) => serves.includes(t.id)),
      servedLanes: lanes.filter((l) => serves.includes(l.target.id)),
      cells: cellsAt(i + 1),
    };
  });

  const terminalRows = lanes.map((lane, i): SingleLineRow => {
    const route = view.routes.get(lane.target.id) ?? [];
    return {
      kind: 'terminal',
      id: lane.target.id,
      target: lane.target,
      reached: route.slice(0, -1).every((id) => statusOf(id) === 'done'),
      cells: cellsAt(roadmap.milestones.length + 1 + i),
    };
  });

  return { lanes, rows: [origin, ...milestoneRows, ...terminalRows] };
}

/**
 * The line the user chose: the `line` query param when it names an active target, else null, so
 * nothing is selected until the user picks a line (#148). Anything else in the URL (unknown,
 * repeated) counts as no choice.
 */
export function selectedTargetId(
  roadmap: Roadmap,
  raw: string | string[] | undefined,
): string | null {
  const known = typeof raw === 'string' && roadmap.targets.some((t) => t.id === raw);
  return known ? raw : null;
}

/**
 * The station to open on load: the `station` query param when it names a milestone of this
 * roadmap, else null. Skills & gaps links each item to its station this way (#111).
 */
export function selectedStationId(
  roadmap: Roadmap,
  raw: string | string[] | undefined,
): string | null {
  const known = typeof raw === 'string' && roadmap.milestones.some((m) => m.id === raw);
  return known ? raw : null;
}

/**
 * "You are here" on one line: the first milestone on its route that is not done, or null when the
 * whole route is (#148). Per line, so every line has its own marker even when the plan's first
 * open milestone does not serve it.
 */
export function lineCurrent(view: RoadmapView, targetId: string): string | null {
  const route = view.routes.get(targetId) ?? [];
  // The route ends with the terminal, which is never a milestone.
  return route.slice(0, -1).find((id) => view.statusByMilestone.get(id) !== 'done') ?? null;
}

/**
 * One target's line out of the whole single line (#148): its lane only, and only the rows it
 * stops at (the starting point, its milestones, its terminal). Its stretches already run between
 * those stops, so dropping the rows it passes through keeps the track continuous. `serves` stays
 * whole, so a station still says which other targets it advances.
 */
export function lineFor(line: SingleLine, view: RoadmapView, targetId: string): SingleLine {
  const lane = line.lanes.find((l) => l.target.id === targetId);
  if (!lane) return line;
  const current = lineCurrent(view, targetId);
  const ownCells = (cells: readonly LaneCell[]) =>
    cells.filter((c) => c.lane.target.id === targetId);

  const rows = line.rows.flatMap((row): SingleLineRow[] => {
    const cells = ownCells(row.cells);
    if (row.kind === 'origin') return [{ ...row, cells }];
    if (row.kind === 'terminal') return row.target.id === targetId ? [{ ...row, cells }] : [];
    if (!cells[0]?.stop) return [];
    return [{ ...row, current: row.id === current, cells }];
  });

  return { lanes: [lane], rows };
}

/** "A", "A and B", "A, B and C": the spec's wording for station names (spec 01). */
export function joinNames(names: readonly string[]): string {
  if (names.length <= 1) return names.join('');
  return `${names.slice(0, -1).join(', ')} and ${names.at(-1) ?? ''}`;
}

/**
 * A station's accessible name: title, status, targets and "you are here", e.g. "Own the weekly
 * support report, in progress, serves Data Analyst and Business Analyst, you are here" (spec 01).
 */
export function stationLabel(row: SingleLineRow): string {
  if (row.kind === 'origin') return `${row.from}, starting point`;
  if (row.kind === 'terminal') {
    const parts = [row.target.roleFamily.name, 'target role'];
    if (row.target.isPrimary) parts.push('primary');
    if (row.reached) parts.push('reached');
    return parts.join(', ');
  }
  const parts = [
    row.milestone.title,
    ITEM_STATUS_LABEL[row.status],
    `serves ${joinNames(row.serves.map((t) => t.roleFamily.name))}`,
  ];
  if (row.current) parts.push('you are here');
  return parts.join(', ');
}
