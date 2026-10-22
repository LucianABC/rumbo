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
 * The single-line view as rows and lanes (spec 01, M2, #108): milestones in plan order, then one
 * terminal per target, each crossed by one vertical lane per target. Pure, so the drawing is a
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

export type SingleLineRow =
  | {
      readonly kind: 'milestone';
      readonly id: string;
      readonly milestone: Milestone;
      readonly status: ItemStatus;
      readonly current: boolean;
      /** The targets that stop here, in lane order. */
      readonly serves: readonly Target[];
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

export function singleLine(
  roadmap: Roadmap,
  view: RoadmapView,
  colors: ReadonlyMap<string, LineColorToken>,
): SingleLine {
  const lanes = laneOrder(roadmap).map((target, i) => ({
    target,
    // getTargetColors covers every target (at most three, one slot each); the fallback only keeps
    // the type honest.
    color: colors.get(target.id) ?? (['line-1', 'line-2', 'line-3'] as const)[i] ?? 'line-1',
  }));

  const ids = [...roadmap.milestones.map((m) => m.id), ...lanes.map((l) => l.target.id)];
  const rowOf = new Map(ids.map((id, i) => [id, i]));
  const statusOf = (id: string) => view.statusByMilestone.get(id);

  // Each lane's stretches as row ranges: [from, to) with the style of the stop it leaves.
  const stretches = new Map(
    lanes.map((lane) => {
      const stops = (view.routes.get(lane.target.id) ?? []).map((id) => rowOf.get(id) ?? -1);
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
      const route = view.routes.get(lane.target.id) ?? [];
      return {
        lane,
        top: own.find((s) => s.from < row && row <= s.to)?.style ?? null,
        bottom: own.find((s) => s.from <= row && row < s.to)?.style ?? null,
        stop: route.includes(ids[row] ?? ''),
      };
    });

  const milestoneRows = roadmap.milestones.map((milestone, row): SingleLineRow => {
    const serves = view.targetsByMilestone.get(milestone.id) ?? [];
    return {
      kind: 'milestone',
      id: milestone.id,
      milestone,
      status: statusOf(milestone.id) ?? 'pending',
      current: milestone.id === view.currentMilestoneId,
      serves: lanes.map((l) => l.target).filter((t) => serves.includes(t.id)),
      cells: cellsAt(row),
    };
  });

  const terminalRows = lanes.map((lane, i): SingleLineRow => {
    const route = view.routes.get(lane.target.id) ?? [];
    return {
      kind: 'terminal',
      id: lane.target.id,
      target: lane.target,
      reached: route.slice(0, -1).every((id) => statusOf(id) === 'done'),
      cells: cellsAt(roadmap.milestones.length + i),
    };
  });

  return { lanes, rows: [...milestoneRows, ...terminalRows] };
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
