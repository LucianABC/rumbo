import type { Gap, LineColorToken, Roadmap, RoadmapItem, Target } from '@rumbo/contracts';
import type { Market } from '@rumbo/contracts/provisional';

import type { TargetCoverage } from '../coverage';
import type { Lane } from './single-line';
import { joinNames } from './single-line';

/**
 * The Roadmap summary band (docs/product/views.md, #112): per target, how much of what its
 * postings ask for most the profile covers, and the mocked Change targets preview. Pure, so the
 * numbers are tested apart from the view; they come from lib/coverage.ts like Skills & gaps.
 */

export interface TargetSummary {
  readonly target: Target;
  readonly color: LineColorToken;
  readonly covered: number;
  readonly asked: number;
  readonly toClose: number;
  /** Other targets missing some of this target's missing skills, with how many. */
  readonly shared: readonly { readonly name: string; readonly count: number }[];
  /** How many of this target's missing skills any other target also misses, each counted once. */
  readonly sharedCount: number;
  /** Postings in the target's snapshot, for the state where none of its skills reach 30%. */
  readonly postings: number;
  /** Skills & gaps filtered to this target; #111 reads `target`. */
  readonly href: string;
}

/** One row per target in lane order (primary first), skipping any target without coverage. */
export function targetSummaries(
  lanes: readonly Lane[],
  coverage: readonly TargetCoverage[],
): TargetSummary[] {
  const names = new Map(lanes.map((l) => [l.target.id, l.target.roleFamily.name]));
  return lanes.flatMap(({ target, color }) => {
    const entry = coverage.find((c) => c.targetId === target.id);
    if (!entry) return [];
    const shared = entry.sharedWith.map((s) => ({
      name: names.get(s.targetId) ?? s.targetId,
      count: s.count,
    }));
    const othersMissing = new Set(
      coverage
        .filter((c) => c.targetId !== target.id)
        .flatMap((c) => c.missing.map((m) => m.skill.id)),
    );
    return [
      {
        target,
        color,
        covered: entry.covered.length,
        asked: entry.asked.length,
        toClose: entry.missing.length,
        shared,
        sharedCount: entry.missing.filter((m) => othersMissing.has(m.skill.id)).length,
        postings: entry.snapshot.postingCount,
        href: `/skills?target=${encodeURIComponent(target.id)}`,
      },
    ];
  });
}

/**
 * "5 to close, 2 shared", or "nothing to close": short enough for one line of the band, which
 * reads as a header; who shares them is in sharedDetail (#112).
 */
export function closingClause(s: Pick<TargetSummary, 'toClose' | 'sharedCount'>): string {
  if (s.toClose === 0) return 'nothing to close';
  const shared = s.sharedCount > 0 ? `, ${String(s.sharedCount)} shared` : '';
  return `${String(s.toClose)} to close${shared}`;
}

/** "Also missing for Business Analyst (2) and Support Lead (1)", or null when nothing is shared. */
export function sharedDetail(s: Pick<TargetSummary, 'shared'>): string | null {
  if (s.shared.length === 0) return null;
  return `Also missing for ${joinNames(s.shared.map((x) => `${x.name} (${String(x.count)})`))}`;
}

/** Where the market numbers come from, for the page header (views.md, "Page header"). */
export function marketProvenance(market: Market): { postings: number; checkedAt: string } | null {
  if (market.snapshots.length === 0) return null;
  return {
    postings: market.snapshots.reduce((sum, s) => sum + s.postingCount, 0),
    checkedAt:
      market.snapshots
        .map((s) => s.checkedAt)
        .sort()
        .at(-1) ?? '',
  };
}

/**
 * What applying a target change would do to the plan (views.md, "Changing the goal"): pending or
 * in-progress items whose gaps all disappear are dropped; done ones stay, marked not needed.
 */
export type ItemOutcome = 'kept' | 'dropped' | 'not_needed';

export interface ChangePreview {
  readonly dropped: Target;
  readonly gapsGone: readonly { readonly gap: Gap; readonly share: number }[];
  /** Gaps still open or in progress after the change. */
  readonly gapsKept: number;
  readonly items: readonly {
    readonly item: RoadmapItem;
    readonly milestone: string;
    readonly outcome: ItemOutcome;
  }[];
}

/**
 * The demo's sample preview: what dropping the last non-primary target would change, derived
 * from the loaded roadmap so it matches the rest of the page with any mocks (#112, #137). Null
 * with a single target, since there is nothing to drop.
 */
export function changePreview(roadmap: Roadmap, lanes: readonly Lane[]): ChangePreview | null {
  const dropped = lanes.findLast((l) => !l.target.isPrimary)?.target;
  if (!dropped) return null;

  const gone = new Set(
    roadmap.gaps.filter((g) => g.demand.every((d) => d.targetId === dropped.id)).map((g) => g.id),
  );
  const gapsGone = roadmap.gaps
    .filter((g) => gone.has(g.id))
    .map((gap) => ({ gap, share: gap.demand[0]?.share ?? 0 }));

  const items = roadmap.milestones.flatMap((m) =>
    m.items.map((item) => {
      const needed = item.gapIds.some((id) => !gone.has(id));
      const outcome: ItemOutcome = needed
        ? 'kept'
        : item.status === 'done'
          ? 'not_needed'
          : 'dropped';
      return { item, milestone: m.title, outcome };
    }),
  );

  // Closed gaps are not work that stays; counting them overstated what is left (#112).
  const gapsKept = roadmap.gaps.filter((g) => !gone.has(g.id) && g.status !== 'closed').length;

  return { dropped, gapsGone, gapsKept, items };
}
