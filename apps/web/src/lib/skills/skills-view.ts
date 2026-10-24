import type {
  Gap,
  Milestone,
  Profile,
  ProfileSkill,
  Roadmap,
  RoadmapItem,
  RoadmapView,
  SkillRef,
} from '@rumbo/contracts';
import type { Market, MarketSnapshotView } from '@rumbo/contracts/provisional';

import { askedForMost, evidencedSkills } from '../coverage';
import { type Lane, selectedTargetId } from '../roadmap/single-line';

/**
 * The Skills & gaps tab as data (docs/product/views.md, #111): one target's market, every gap with
 * the numbers that justify it, and the skills the user has. Pure, so every rule is unit-tested
 * here. "Asked for most" and "covered" come from lib/coverage.ts, so the numbers match the
 * Roadmap summary band that links here.
 */

/** A snapshot older than this gets a hint to refresh (views.md, "stale snapshot"). */
export const STALE_AFTER_DAYS = 30;

/**
 * The target the tab is narrowed to: the `target` query param when it names an active target,
 * else null, which shows every target's market, gaps and skills (owner, #111). The Roadmap
 * summary band links here with one target.
 */
export function targetFilter(roadmap: Roadmap, raw: string | string[] | undefined): string | null {
  return selectedTargetId(roadmap, raw);
}

export function isStale(checkedAt: string, now: Date): boolean {
  return now.getTime() - new Date(checkedAt).getTime() > STALE_AFTER_DAYS * 24 * 60 * 60 * 1000;
}

/** The roadmap gap for a skill, which a market row links to. */
export interface GapRef {
  readonly id: string;
  readonly status: Gap['status'];
}

/**
 * What a market row says about the user. A skill can be covered and still be a gap the plan is
 * working on (a certificate is evidence, applying it at work is what remains), so `have` keeps
 * the gap. `missing` is a skill the market asks for that no gap covers, which local data can
 * produce; `unknown` means the profile could not be read.
 */
export type MarketMark =
  | { readonly kind: 'have'; readonly evidenceCount: number; readonly gap: GapRef | null }
  | { readonly kind: 'gap'; readonly gap: GapRef }
  | { readonly kind: 'missing' }
  | { readonly kind: 'unknown' };

export interface MarketRow {
  /** 1 is the most asked; continuous across asked-for-most and the rest. */
  readonly rank: number;
  readonly skill: SkillRef;
  readonly share: number;
  readonly mark: MarketMark;
}

export interface MarketView {
  readonly snapshot: MarketSnapshotView;
  /** The skills coverage counts: at least 30% of postings, at most 12. */
  readonly asked: readonly MarketRow[];
  /** Everything else the snapshot lists, most asked first. */
  readonly less: readonly MarketRow[];
  readonly stale: boolean;
}

export function marketView(
  snapshot: MarketSnapshotView,
  profile: Profile | null,
  gaps: readonly Gap[],
  now: Date,
): MarketView {
  const have = profile ? evidencedSkills(profile) : null;
  const approved = new Map(
    (profile?.skills ?? []).map((s) => [s.skill.id, approvedCount(s)] as const),
  );
  const gapBySkill = new Map(gaps.map((g) => [g.skill.id, { id: g.id, status: g.status }]));

  const markOf = (skillId: string): MarketMark => {
    const gap = gapBySkill.get(skillId) ?? null;
    if (have === null) return { kind: 'unknown' };
    if (have.has(skillId)) return { kind: 'have', evidenceCount: approved.get(skillId) ?? 0, gap };
    return gap ? { kind: 'gap', gap } : { kind: 'missing' };
  };

  const asked = askedForMost(snapshot);
  const askedIds = new Set(asked.map((s) => s.skill.id));
  const ordered = [
    ...asked,
    ...[...snapshot.skills]
      .sort((a, b) => b.share - a.share)
      .filter((s) => !askedIds.has(s.skill.id)),
  ];
  const rows = ordered.map((s, i): MarketRow => ({
    rank: i + 1,
    skill: s.skill,
    share: s.share,
    mark: markOf(s.skill.id),
  }));

  return {
    snapshot,
    asked: rows.filter((r) => askedIds.has(r.skill.id)),
    less: rows.filter((r) => !askedIds.has(r.skill.id)),
    stale: isStale(snapshot.checkedAt, now),
  };
}

export interface GapDemandRow {
  readonly lane: Lane;
  readonly share: number;
  readonly postingCount: number;
}

export interface ClosingItem {
  readonly item: RoadmapItem;
  readonly milestone: Milestone;
  /** Where the item lives: a practice project on Projects, anything else at its Roadmap station. */
  readonly href: string;
  readonly destination: 'projects' | 'roadmap';
}

export interface GapCard {
  readonly gap: Gap;
  /** In lane order, primary first; only the selected target's when the tab is narrowed. */
  readonly demand: readonly GapDemandRow[];
  /** How many targets need it; shared gaps rank higher (views.md). */
  readonly sharedBy: number;
  /** In plan order. */
  readonly items: readonly ClosingItem[];
}

/**
 * The gaps by priority, each with its numbers per target and the items that close it: every gap,
 * or only those the selected target needs, with only that target's numbers (owner, #111).
 */
export function gapCards(
  roadmap: Roadmap,
  view: RoadmapView,
  lanes: readonly Lane[],
  selectedId: string | null,
): GapCard[] {
  return [...roadmap.gaps]
    .filter((gap) => selectedId === null || gap.demand.some((d) => d.targetId === selectedId))
    .sort((a, b) => a.priority - b.priority)
    .map((gap) => {
      const demand = shownLanes(lanes, selectedId).flatMap((lane): GapDemandRow[] => {
        const d = gap.demand.find((x) => x.targetId === lane.target.id);
        return d ? [{ lane, share: d.share, postingCount: d.postingCount }] : [];
      });
      const items = roadmap.milestones.flatMap((milestone) =>
        milestone.items
          .filter((item) => item.gapIds.includes(gap.id))
          .map((item): ClosingItem => {
            const project = item.type === 'project';
            return {
              item,
              milestone,
              href: project ? projectHref(item.id) : stationHref(milestone.id, selectedId, view),
              destination: project ? 'projects' : 'roadmap',
            };
          }),
      );
      return { gap, demand, sharedBy: gap.demand.length, items };
    });
}

/** A practice project's card on Projects, which renders `id="project-<itemId>"` (#114). */
export function projectHref(itemId: string): string {
  return `/projects#project-${encodeURIComponent(itemId)}`;
}

/**
 * A station on Roadmap with its panel open (#111): on the selected target when the station serves
 * it, else on the first target it serves, so the list behind the panel holds the station.
 */
export function stationHref(
  milestoneId: string,
  selectedId: string | null,
  view: RoadmapView,
): string {
  const serves = view.targetsByMilestone.get(milestoneId) ?? [];
  const line = selectedId && serves.includes(selectedId) ? selectedId : serves[0];
  const params = new URLSearchParams();
  if (line) params.set('line', line);
  params.set('station', milestoneId);
  return `/roadmap?${params.toString()}`;
}

export interface HaveSkill {
  readonly skill: ProfileSkill;
  /** Only approved evidence counts (AI rule 2); a skill with none is listed but not counted. */
  readonly approved: number;
  /**
   * How often each target's postings ask for it, in lane order, or only the selected target's;
   * null without market data.
   */
  readonly demand: readonly { readonly lane: Lane; readonly share: number }[] | null;
}

/**
 * The profile's skills, the ones the market asks for most first, then by name. Skills whose
 * evidence all awaits approval stay listed, marked as not counted yet. Narrowed to a target, only
 * the skills its postings list; without market data there is nothing to narrow by.
 */
export function haveSkills(
  profile: Profile,
  market: Market | null,
  lanes: readonly Lane[],
  selectedId: string | null = null,
): HaveSkill[] {
  const entries = profile.skills.map((skill): HaveSkill => {
    const demand = market
      ? shownLanes(lanes, selectedId).flatMap((lane) => {
          const share = market.snapshots
            .find((s) => s.targetId === lane.target.id)
            ?.skills.find((s) => s.skill.id === skill.skill.id)?.share;
          return share === undefined ? [] : [{ lane, share }];
        })
      : null;
    return { skill, approved: approvedCount(skill), demand };
  });
  const top = (e: HaveSkill) => Math.max(0, ...(e.demand ?? []).map((d) => d.share));
  const listed = (e: HaveSkill) => selectedId === null || e.demand === null || e.demand.length > 0;
  return entries
    .filter(listed)
    .sort(
      (a, b) =>
        Number(b.approved > 0) - Number(a.approved > 0) ||
        top(b) - top(a) ||
        a.skill.skill.name.localeCompare(b.skill.skill.name),
    );
}

/** Every target, or only the one the tab is narrowed to. */
function shownLanes(lanes: readonly Lane[], selectedId: string | null): readonly Lane[] {
  return selectedId === null ? lanes : lanes.filter((l) => l.target.id === selectedId);
}

function approvedCount(skill: ProfileSkill): number {
  return skill.evidence.filter((e) => e.approvedAt !== null).length;
}
