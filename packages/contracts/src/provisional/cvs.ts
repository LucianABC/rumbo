import { z } from 'zod';

import { Id } from '../ids.js';
import { Certification, Education, Experience, type Profile, ProfileSkill } from '../profile.js';
import type { Roadmap } from '../roadmap.js';

/**
 * Provisional (#191): the CV tailored to one target, as Profile's sub-tab for that target reads it,
 * until the F4 spec (#44) decides the real shape. It only picks and rewords what the profile holds:
 * facts are edited in the profile, never here (docs/product/views.md, Profile, CV per target).
 *
 * It keeps its own copy of the facts it was written from, so editing Base never changes a saved
 * CV: it goes out of date and still downloads as it was, until the user regenerates it.
 */

export const TailoredCv = z.object({
  targetId: Id,
  generatedAt: z.iso.datetime(),
  /** The profile version it was written from, so later edits show it as out of date. */
  profileUpdatedAt: z.iso.datetime(),
  headline: z.string().min(1),
  /** Null when this CV has no about text. */
  about: z.string().min(1).nullable(),
  /**
   * The positions this CV keeps, in the profile's order, as they stood then: the profile's facts
   * and the bullets written for this target. The rest are left out.
   */
  experiences: z.array(Experience),
  education: z.array(Education),
  certifications: z.array(Certification),
  /** The profile's skills this CV lists, with their evidence then; the rest are left out. */
  skills: z.array(ProfileSkill),
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
 * Problems tying the CVs to this profile and roadmap; empty when they fit. A CV written from this
 * version of the profile must copy its facts as they are, rewording only the bullets: anything
 * else would claim something rumbo cannot back. A CV written from an earlier version is out of
 * date, not invalid: it still shows as it was, with Regenerate (docs/product/views.md, Profile, CV
 * per target).
 */
export function checkCvs(tailored: TailoredCvs, profile: Profile, roadmap: Roadmap): string[] {
  const targets = new Set(roadmap.targets.map((t) => t.id));
  return tailored.cvs.flatMap((cv) => [
    ...(targets.has(cv.targetId) ? [] : [`CV for unknown target "${cv.targetId}"`]),
    ...(cv.profileUpdatedAt !== profile.updatedAt ? [] : unbackedFacts(cv, profile)),
  ]);
}

function unbackedFacts(cv: TailoredCv, profile: Profile): string[] {
  const facts = ({ highlights: _bullets, ...rest }: Experience) => rest;
  return [
    ...unbacked(cv, 'position', cv.experiences, profile.experiences, facts),
    ...unbacked(cv, 'education', cv.education, profile.education, (e) => e),
    ...unbacked(cv, 'certification', cv.certifications, profile.certifications, (c) => c),
    ...unbacked(cv, 'skill', cv.skills, profile.skills, (s) => s),
  ];
}

/** Entries of the CV missing from the profile, or whose facts differ from the profile's. */
function unbacked<T extends { readonly id: string }>(
  cv: TailoredCv,
  kind: string,
  copies: readonly T[],
  originals: readonly T[],
  facts: (entry: T) => unknown,
): string[] {
  const byId = new Map(originals.map((o) => [o.id, o]));
  return copies.flatMap((copy) => {
    const original = byId.get(copy.id);
    if (!original) return [`CV for "${cv.targetId}" names unknown ${kind} "${copy.id}"`];
    return sameValue(facts(copy), facts(original))
      ? []
      : [`CV for "${cv.targetId}" changes the facts of ${kind} "${copy.id}"`];
  });
}

/** Structural equality, ignoring key order: parsed JSON and spread objects order keys differently. */
export function sameValue(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (Array.isArray(a) || Array.isArray(b)) {
    return (
      Array.isArray(a) &&
      Array.isArray(b) &&
      a.length === b.length &&
      a.every((item, i) => sameValue(item, b[i]))
    );
  }
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false;
  const entries = (o: object) => Object.entries(o).filter(([, v]) => v !== undefined);
  const left = entries(a);
  const right = new Map(entries(b));
  return (
    left.length === right.size && left.every(([k, v]) => right.has(k) && sameValue(v, right.get(k)))
  );
}
