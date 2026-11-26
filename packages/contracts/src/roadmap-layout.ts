import { z } from 'zod';

import { Id } from './ids.js';
import { LINE_COLOR_TOKENS } from './roadmap-layout-rules.js';

/**
 * Where the subway map draws a roadmap (spec 01). Presentation only, kept apart from `Roadmap`:
 * no agent produces coordinates, so the domain can come from the API while the layout is
 * hand-authored, computed or dropped on its own. The checks and color slots live in
 * roadmap-layout-rules.ts, which the browser imports without Zod (#119).
 */

/** Grid units; the layout is hand-authored, not computed. */
export const GridPoint = z.object({ x: z.int(), y: z.int() });
export type GridPoint = z.infer<typeof GridPoint>;

/** Line colors are slots mapped to design tokens: data never carries a raw color. */
export const LineColorToken = z.enum(LINE_COLOR_TOKENS);
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
