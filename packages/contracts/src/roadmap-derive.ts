import type { ItemStatus, Milestone, Roadmap } from './roadmap.js';

/**
 * Everything the map shows that is not stored (spec 01): deriving it keeps interchanges, routes
 * and statuses from ever disagreeing with the items and gaps they come from. Computed once per
 * roadmap and passed down, so views and checks do not recompute it per station.
 */
export interface RoadmapView {
  /** Known targets each milestone serves, in the roadmap's target order. */
  readonly targetsByMilestone: ReadonlyMap<string, readonly string[]>;
  /** Each target's line: the milestones that serve it in plan order, then its terminal. */
  readonly routes: ReadonlyMap<string, readonly string[]>;
  readonly statusByMilestone: ReadonlyMap<string, ItemStatus>;
  /** "You are here": the first milestone in plan order that is not done; null when all are. */
  readonly currentMilestoneId: string | null;
}

/** All items done → done; any started → in progress; otherwise pending. */
export function milestoneStatus(milestone: Milestone): ItemStatus {
  const statuses = milestone.items.map((i) => i.status);
  if (statuses.every((s) => s === 'done')) return 'done';
  if (statuses.some((s) => s !== 'pending')) return 'in_progress';
  return 'pending';
}

export function deriveRoadmapView(roadmap: Roadmap): RoadmapView {
  const targetOrder = roadmap.targets.map((t) => t.id);
  const demandTargets = new Map(roadmap.gaps.map((g) => [g.id, g.demand.map((d) => d.targetId)]));

  const targetsByMilestone = new Map<string, readonly string[]>();
  const statusByMilestone = new Map<string, ItemStatus>();
  for (const milestone of roadmap.milestones) {
    const served = new Set(
      milestone.items.flatMap((item) => item.gapIds.flatMap((id) => demandTargets.get(id) ?? [])),
    );
    targetsByMilestone.set(
      milestone.id,
      targetOrder.filter((id) => served.has(id)),
    );
    statusByMilestone.set(milestone.id, milestoneStatus(milestone));
  }

  const routes = new Map<string, readonly string[]>();
  for (const targetId of targetOrder) {
    const stops = roadmap.milestones
      .filter((m) => targetsByMilestone.get(m.id)?.includes(targetId))
      .map((m) => m.id);
    routes.set(targetId, [...stops, targetId]);
  }

  const current = roadmap.milestones.find((m) => statusByMilestone.get(m.id) !== 'done');
  return { targetsByMilestone, routes, statusByMilestone, currentMilestoneId: current?.id ?? null };
}

export function isInterchange(view: RoadmapView, milestoneId: string): boolean {
  return (view.targetsByMilestone.get(milestoneId)?.length ?? 0) > 1;
}
