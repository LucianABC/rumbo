import type { Profile, SkillRef } from '@rumbo/contracts';
import type { Market, MarketSnapshotView, SkillDemand } from '@rumbo/contracts/provisional';

/**
 * How much of each target's demand the profile's evidence covers (docs/product/views.md, #145).
 * "Asked for most" means the skills in at least 30% of the target's snapshot postings, capped at
 * 12; covered means the profile has approved evidence for the skill; the rest are the target's
 * gaps. Summary band, Skills & gaps and the roadmap all read these numbers from here.
 */

export const ASKED_MIN_SHARE = 0.3;
export const ASKED_CAP = 12;

export interface TargetCoverage {
  readonly targetId: string;
  readonly snapshot: MarketSnapshotView;
  /** Most asked first. */
  readonly asked: readonly SkillDemand[];
  readonly covered: readonly SkillDemand[];
  readonly missing: readonly SkillDemand[];
  /** For each other target, how many of this target's missing skills it is missing too. */
  readonly sharedWith: readonly { readonly targetId: string; readonly count: number }[];
}

/** Skills with at least one approved piece of evidence: nothing counts until the user approves it. */
export function evidencedSkills(profile: Profile): ReadonlySet<SkillRef['id']> {
  return new Set(
    profile.skills
      .filter((s) => s.evidence.some((e) => e.approvedAt !== null))
      .map((s) => s.skill.id),
  );
}

export function askedForMost(snapshot: MarketSnapshotView): SkillDemand[] {
  return [...snapshot.skills]
    .sort((a, b) => b.share - a.share)
    .filter((s) => s.share >= ASKED_MIN_SHARE)
    .slice(0, ASKED_CAP);
}

/** Every skill any of these targets asks for most: what makes experience relevant (#145). */
export function skillsAskedForMost(market: Market, targetIds: readonly string[]): Set<string> {
  return new Set(
    market.snapshots
      .filter((s) => targetIds.includes(s.targetId))
      .flatMap((s) => askedForMost(s).map((d) => d.skill.id)),
  );
}

/** One entry per target that has a snapshot, in the order given (lane order, primary first). */
export function coverage(
  profile: Profile,
  market: Market,
  targetIds: readonly string[],
): TargetCoverage[] {
  const have = evidencedSkills(profile);
  const base = targetIds.flatMap((targetId) => {
    const snapshot = market.snapshots.find((s) => s.targetId === targetId);
    if (!snapshot) return [];
    const asked = askedForMost(snapshot);
    return [
      {
        targetId,
        snapshot,
        asked,
        covered: asked.filter((s) => have.has(s.skill.id)),
        missing: asked.filter((s) => !have.has(s.skill.id)),
      },
    ];
  });

  return base.map((entry) => {
    const mine = new Set(entry.missing.map((s) => s.skill.id));
    return {
      ...entry,
      sharedWith: base
        .filter((other) => other.targetId !== entry.targetId)
        .map((other) => ({
          targetId: other.targetId,
          count: other.missing.filter((s) => mine.has(s.skill.id)).length,
        }))
        .filter((shared) => shared.count > 0),
    };
  });
}
