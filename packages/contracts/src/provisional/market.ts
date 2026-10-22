import { z } from 'zod';

import { Id } from '../ids.js';
import { RoleFamilyRef, SkillRef } from '../roadmap.js';

/**
 * Provisional (spec 01, #145): the market as the views read it until the F2 spec (#42) decides
 * the real shape. One snapshot per active target: real postings for its role family and region,
 * and how often they ask for each skill (ADR 0004's `MarketSnapshot` + `SnapshotSkillFreq`).
 */

export const SkillDemand = z.object({
  skill: SkillRef,
  /** Share of the snapshot's postings that ask for the skill. */
  share: z.number().min(0).max(1),
});
export type SkillDemand = z.infer<typeof SkillDemand>;

export const MarketSnapshotView = z
  .object({
    /** Referenced by the roadmap's `GapDemand.snapshotId`. */
    id: Id,
    targetId: Id,
    roleFamily: RoleFamilyRef,
    region: z.string().min(1),
    checkedAt: z.iso.datetime(),
    postingCount: z.int().min(1),
    /** Most asked first. */
    skills: z.array(SkillDemand),
  })
  .superRefine((snapshot, ctx) => {
    const ids = snapshot.skills.map((s) => s.skill.id);
    for (const id of new Set(ids.filter((v, i) => ids.indexOf(v) !== i))) {
      ctx.addIssue({ code: 'custom', message: `skill "${id}" is listed twice`, path: ['skills'] });
    }
    snapshot.skills.slice(1).forEach((s, i) => {
      if (s.share > (snapshot.skills[i]?.share ?? 1)) {
        ctx.addIssue({
          code: 'custom',
          message: `skills must be ordered by share, most asked first ("${s.skill.id}")`,
          path: ['skills', i + 1],
        });
      }
    });
  });
export type MarketSnapshotView = z.infer<typeof MarketSnapshotView>;

export const Market = z
  .object({ snapshots: z.array(MarketSnapshotView) })
  .superRefine((market, ctx) => {
    const targets = market.snapshots.map((s) => s.targetId);
    for (const id of new Set(targets.filter((v, i) => targets.indexOf(v) !== i))) {
      ctx.addIssue({
        code: 'custom',
        message: `target "${id}" has more than one snapshot`,
        path: ['snapshots'],
      });
    }
  });
export type Market = z.infer<typeof Market>;
