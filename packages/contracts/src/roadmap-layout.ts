import { z } from 'zod';

import type { Roadmap } from './roadmap.js';
import { targetRoute } from './roadmap-derive.js';

/**
 * Where the subway map draws a roadmap (spec 01). Presentation only, kept apart from `Roadmap`:
 * no agent produces coordinates, so the domain can come from the API while the layout is
 * hand-authored, computed or dropped on its own.
 */

const Id = z.string().regex(/^[a-z0-9-]+$/);

/** Grid units; the layout is hand-authored, not computed. */
export const GridPoint = z.object({ x: z.int(), y: z.int() });
export type GridPoint = z.infer<typeof GridPoint>;

/** Line colors are slots mapped to design tokens: data never carries a raw color. */
export const LineColorToken = z.enum(['line-1', 'line-2', 'line-3']);
export type LineColorToken = z.infer<typeof LineColorToken>;

export const RoadmapLayout = z.object({
  lines: z.array(z.object({ targetId: Id, colorToken: LineColorToken })).min(1),
  /** Milestone ids, plus target ids for the terminals. */
  stations: z.array(z.object({ id: Id, at: GridPoint })),
  /** Corner points between `after` and the next station on that target's route. */
  bends: z.array(z.object({ targetId: Id, after: Id, points: z.array(GridPoint).min(1) })),
  /** Parallel lane for a target between two consecutive stations where lines share a stretch. */
  offsets: z.array(z.object({ targetId: Id, from: Id, to: Id, lane: z.int().min(-2).max(2) })),
});
export type RoadmapLayout = z.infer<typeof RoadmapLayout>;

/** Segments may only run horizontally, vertically or at 45°. */
export function isOctilinear(a: GridPoint, b: GridPoint): boolean {
  const dx = Math.abs(b.x - a.x);
  const dy = Math.abs(b.y - a.y);
  return (dx > 0 || dy > 0) && (dx === 0 || dy === 0 || dx === dy);
}

/** The points a target's line passes through, bends included, in order. */
export function routePoints(
  roadmap: Roadmap,
  layout: RoadmapLayout,
  targetId: string,
): GridPoint[] {
  const at = new Map(layout.stations.map((s) => [s.id, s.at]));
  const points: GridPoint[] = [];
  for (const id of targetRoute(roadmap, targetId)) {
    const point = at.get(id);
    if (point) points.push(point);
    const bend = layout.bends.find((b) => b.targetId === targetId && b.after === id);
    if (bend) points.push(...bend.points);
  }
  return points;
}

/**
 * Checks a layout against the roadmap it draws; returns readable problems, empty when it fits.
 * The view falls back to the single-line list instead of failing when this is not empty.
 */
export function checkLayout(roadmap: Roadmap, layout: RoadmapLayout): string[] {
  const problems: string[] = [];
  const placed = new Set(layout.stations.map((s) => s.id));
  const targetIds = roadmap.targets.map((t) => t.id);

  for (const id of [...roadmap.milestones.map((m) => m.id), ...targetIds]) {
    if (!placed.has(id)) problems.push(`station "${id}" has no position`);
  }

  for (const targetId of targetIds) {
    if (!layout.lines.some((l) => l.targetId === targetId)) {
      problems.push(`target "${targetId}" has no line color`);
    }
  }
  const tokens = layout.lines.map((l) => l.colorToken);
  for (const token of new Set(tokens.filter((t, i) => tokens.indexOf(t) !== i))) {
    problems.push(`color "${token}" is used by more than one line`);
  }

  for (const bend of layout.bends) {
    const route = targetRoute(roadmap, bend.targetId);
    const index = route.indexOf(bend.after);
    if (index < 0 || index === route.length - 1) {
      problems.push(`bend after "${bend.after}" is not between two stations of "${bend.targetId}"`);
    }
  }

  for (const offset of layout.offsets) {
    const route = targetRoute(roadmap, offset.targetId);
    if (
      route.indexOf(offset.to) !== route.indexOf(offset.from) + 1 ||
      !route.includes(offset.from)
    ) {
      problems.push(
        `offset "${offset.from}"→"${offset.to}" is not a segment of "${offset.targetId}"`,
      );
    }
  }

  for (const targetId of targetIds) {
    const points = routePoints(roadmap, layout, targetId);
    for (let i = 1; i < points.length; i++) {
      const from = points[i - 1];
      const to = points[i];
      if (from && to && !isOctilinear(from, to)) {
        problems.push(
          `line "${targetId}" has a non-octilinear segment (${String(from.x)},${String(from.y)})→(${String(to.x)},${String(to.y)})`,
        );
      }
    }
  }

  return problems;
}
