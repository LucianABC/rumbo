import { z } from 'zod';

import { Id } from '../ids.js';
import type { Profile } from '../profile.js';
import type { Roadmap } from '../roadmap.js';

/**
 * Provisional (#191): the CV tailored to one target, as Profile's sub-tab for that target reads it,
 * until the F4 spec (#44) decides the real shape. It only picks and rewords what the profile holds:
 * facts are edited in the profile, never here (docs/product/views.md, Profile, CV per target).
 */

export const TailoredCvPosition = z.object({
  experienceId: Id,
  /** The position's bullets as written for this target. */
  highlights: z.array(z.string().min(1)),
});
export type TailoredCvPosition = z.infer<typeof TailoredCvPosition>;

export const TailoredCv = z.object({
  targetId: Id,
  generatedAt: z.iso.datetime(),
  /** The profile version it was written from, so later edits show it as out of date. */
  profileUpdatedAt: z.iso.datetime(),
  headline: z.string().min(1),
  /** Null when this CV has no about text. */
  about: z.string().min(1).nullable(),
  /** The positions this CV keeps, in the profile's order; the rest are left out. */
  positions: z.array(TailoredCvPosition),
  /** Profile skill ids this CV lists; the rest are left out. */
  skillIds: z.array(Id),
});
export type TailoredCv = z.infer<typeof TailoredCv>;

export const TailoredCvs = z.object({ cvs: z.array(TailoredCv) }).superRefine((tailored, ctx) => {
  const ids = tailored.cvs.map((cv) => cv.targetId);
  for (const id of new Set(ids.filter((v, i) => ids.indexOf(v) !== i))) {
    ctx.addIssue({ code: 'custom', message: `two CVs for target "${id}"`, path: ['cvs'] });
  }
});
export type TailoredCvs = z.infer<typeof TailoredCvs>;

/**
 * Problems tying the CVs to this profile and roadmap; empty when they fit. A CV that names a
 * position or skill the profile lacks would claim something rumbo cannot back.
 */
export function checkCvs(tailored: TailoredCvs, profile: Profile, roadmap: Roadmap): string[] {
  const targets = new Set(roadmap.targets.map((t) => t.id));
  const positions = new Set(profile.experiences.map((e) => e.id));
  const skills = new Set(profile.skills.map((s) => s.id));
  return tailored.cvs.flatMap((cv) => [
    ...(targets.has(cv.targetId) ? [] : [`CV for unknown target "${cv.targetId}"`]),
    ...(cv.profileUpdatedAt === profile.updatedAt
      ? []
      : [`CV for "${cv.targetId}" was written from another version of the profile`]),
    ...cv.positions
      .filter((p) => !positions.has(p.experienceId))
      .map((p) => `CV for "${cv.targetId}" names unknown position "${p.experienceId}"`),
    ...cv.skillIds
      .filter((id) => !skills.has(id))
      .map((id) => `CV for "${cv.targetId}" names unknown skill "${id}"`),
  ]);
}
