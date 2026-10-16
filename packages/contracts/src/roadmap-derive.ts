import type { ItemStatus, Milestone, Roadmap } from './roadmap.js';

/**
 * Everything the map shows that is not stored (spec 01): deriving it keeps interchanges, routes
 * and statuses from ever disagreeing with the items and gaps they come from.
 */

/** Targets a milestone serves: those whose market demand backs the gaps its items close. */
export function milestoneTargetIds(roadmap: Roadmap, milestone: Milestone): string[] {
  const gaps = new Map(roadmap.gaps.map((g) => [g.id, g]));
  const served = new Set(
    milestone.items.flatMap((item) =>
      item.gapIds.flatMap((gapId) => gaps.get(gapId)?.demand.map((d) => d.targetId) ?? []),
    ),
  );
  // Keep the roadmap's target order so lines and labels are stable.
  return roadmap.targets.map((t) => t.id).filter((id) => served.has(id));
}

export function isInterchange(roadmap: Roadmap, milestone: Milestone): boolean {
  return milestoneTargetIds(roadmap, milestone).length > 1;
}

/** All items done → done; any started → in progress; otherwise pending. */
export function milestoneStatus(milestone: Milestone): ItemStatus {
  const statuses = milestone.items.map((i) => i.status);
  if (statuses.every((s) => s === 'done')) return 'done';
  if (statuses.some((s) => s !== 'pending')) return 'in_progress';
  return 'pending';
}

/** "You are here": the first milestone in plan order that is not done; null when all are. */
export function currentMilestoneId(roadmap: Roadmap): string | null {
  return roadmap.milestones.find((m) => milestoneStatus(m) !== 'done')?.id ?? null;
}

/** A target's line: the milestones that serve it in plan order, then its terminal (the target). */
export function targetRoute(roadmap: Roadmap, targetId: string): string[] {
  const stops = roadmap.milestones
    .filter((m) => milestoneTargetIds(roadmap, m).includes(targetId))
    .map((m) => m.id);
  return [...stops, targetId];
}
