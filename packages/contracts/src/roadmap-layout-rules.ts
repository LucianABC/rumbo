import type { Roadmap } from './roadmap.js';
import { deriveRoadmapView, type RoadmapView } from './roadmap-derive.js';
import type { GridPoint, LineColorToken, RoadmapLayout } from './roadmap-layout.js';

/**
 * The rules a layout must follow and what the tabs derive from it, kept free of Zod: the browser
 * runs `targetColors` on every tab, and importing the schemas would ship Zod to every page (#119).
 */

/** Line colors are slots mapped to design tokens: data never carries a raw color. */
export const LINE_COLOR_TOKENS = ['line-1', 'line-2', 'line-3'] as const;

/** Segments may only run horizontally, vertically or at 45°. */
export function isOctilinear(a: GridPoint, b: GridPoint): boolean {
  const dx = Math.abs(b.x - a.x);
  const dy = Math.abs(b.y - a.y);
  return (dx > 0 || dy > 0) && (dx === 0 || dy === 0 || dx === dy);
}

/** The points a target's line passes through, bends included, in order. */
export function routePoints(
  view: RoadmapView,
  layout: RoadmapLayout,
  targetId: string,
): GridPoint[] {
  const at = new Map(layout.stations.map((s) => [s.id, s.at]));
  const points: GridPoint[] = [];
  for (const id of view.routes.get(targetId) ?? []) {
    const point = at.get(id);
    if (point) points.push(point);
    const bend = layout.bends.find((b) => b.targetId === targetId && b.after === id);
    if (bend) points.push(...bend.points);
  }
  return points;
}

function duplicates(values: readonly string[]): string[] {
  return [...new Set(values.filter((v, i) => values.indexOf(v) !== i))];
}

/**
 * Checks a layout against the roadmap it draws; returns readable problems, empty when it fits.
 * The view falls back to the single-line list instead of failing when this is not empty.
 */
export function checkLayout(
  roadmap: Roadmap,
  layout: RoadmapLayout,
  view: RoadmapView = deriveRoadmapView(roadmap),
): string[] {
  const problems: string[] = [];
  const targetIds = roadmap.targets.map((t) => t.id);
  const stationIds = new Set([...roadmap.milestones.map((m) => m.id), ...targetIds]);
  const placed = layout.stations.map((s) => s.id);

  for (const id of stationIds) {
    if (!placed.includes(id)) problems.push(`station "${id}" has no position`);
  }
  for (const id of placed) {
    if (!stationIds.has(id)) problems.push(`layout places unknown station "${id}"`);
  }
  for (const id of duplicates(placed)) problems.push(`station "${id}" is placed twice`);
  for (const point of duplicates(
    layout.stations.map((s) => `${String(s.at.x)},${String(s.at.y)}`),
  )) {
    problems.push(`more than one station sits at (${point})`);
  }

  for (const targetId of targetIds) {
    if (!layout.lines.some((l) => l.targetId === targetId)) {
      problems.push(`target "${targetId}" has no line color`);
    }
  }
  for (const line of layout.lines) {
    if (!targetIds.includes(line.targetId)) {
      problems.push(`line color for unknown target "${line.targetId}"`);
    }
  }
  for (const id of duplicates(layout.lines.map((l) => l.targetId))) {
    problems.push(`target "${id}" has more than one line color`);
  }
  for (const token of duplicates(layout.lines.map((l) => l.colorToken))) {
    problems.push(`color "${token}" is used by more than one line`);
  }

  for (const bend of layout.bends) {
    const route = view.routes.get(bend.targetId) ?? [];
    const index = route.indexOf(bend.after);
    if (index < 0 || index === route.length - 1) {
      problems.push(`bend after "${bend.after}" is not between two stations of "${bend.targetId}"`);
    }
  }

  for (const offset of layout.offsets) {
    const route = view.routes.get(offset.targetId) ?? [];
    const from = route.indexOf(offset.from);
    if (from < 0 || route.indexOf(offset.to) !== from + 1) {
      problems.push(
        `offset "${offset.from}"→"${offset.to}" is not a segment of "${offset.targetId}"`,
      );
    }
  }
  // Lines sharing a stretch need different lanes, or one hides the other.
  const lanes = layout.offsets.map(
    (o) => `${[o.from, o.to].sort().join('↔')} lane ${String(o.lane)}`,
  );
  for (const lane of duplicates(lanes)) problems.push(`two lines share ${lane}`);

  for (const targetId of targetIds) {
    const points = routePoints(view, layout, targetId);
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

/**
 * Each target's color slot, for every tab (views.md): the layout's choice when the layout fits
 * the roadmap, otherwise target order with the primary first, so a missing map never costs a
 * target its identity.
 */
export function targetColors(
  roadmap: Roadmap,
  layout?: RoadmapLayout,
): ReadonlyMap<string, LineColorToken> {
  if (layout && checkLayout(roadmap, layout).length === 0) {
    return new Map(layout.lines.map((l) => [l.targetId, l.colorToken]));
  }
  const ordered = [...roadmap.targets].sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary));
  return new Map(
    ordered.flatMap((t, i) => {
      const slot = LINE_COLOR_TOKENS[i];
      return slot ? [[t.id, slot] as const] : [];
    }),
  );
}
