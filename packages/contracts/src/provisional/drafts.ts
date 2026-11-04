import { z } from 'zod';

import { Id } from '../ids.js';
import type { Profile } from '../profile.js';
import type { Roadmap } from '../roadmap.js';

/**
 * Provisional (spec 01, #113): suggested profile changes as the views read them until the F4 spec
 * (#44) decides the real shape. Each one rewrites a piece of the profile for one target, and the
 * user applies it on LinkedIn, because rumbo cannot write there (docs/product/views.md).
 */

const ChangeBase = z.object({
  id: Id,
  /** The target this text is written for. */
  targetId: Id,
  createdAt: z.iso.datetime(),
  after: z.string().min(1),
  /** A fact the text would be better with and the profile lacks; rumbo asks, never invents it. */
  question: z.string().min(1).optional(),
});

export const DraftChange = z.discriminatedUnion('section', [
  ChangeBase.extend({ section: z.literal('headline'), before: z.string().min(1) }),
  /** `before` is null when the profile has no about text yet. */
  ChangeBase.extend({ section: z.literal('about'), before: z.string().min(1).nullable() }),
  /** One bullet of a position; `before` is null for a new bullet. */
  ChangeBase.extend({
    section: z.literal('experience'),
    experienceId: Id,
    before: z.string().min(1).nullable(),
  }),
]);
export type DraftChange = z.infer<typeof DraftChange>;

export const Drafts = z.object({ changes: z.array(DraftChange) }).superRefine((drafts, ctx) => {
  const ids = drafts.changes.map((c) => c.id);
  for (const id of new Set(ids.filter((v, i) => ids.indexOf(v) !== i))) {
    ctx.addIssue({ code: 'custom', message: `duplicate change id "${id}"`, path: ['changes'] });
  }
});
export type Drafts = z.infer<typeof Drafts>;

/** Whether the text a change replaces is still in the profile. */
function stillInProfile(change: DraftChange, profile: Profile): boolean {
  switch (change.section) {
    case 'headline':
      return change.before === profile.headline;
    case 'about':
      return change.before === (profile.about ?? null);
    case 'experience': {
      const experience = profile.experiences.find((e) => e.id === change.experienceId);
      if (!experience) return false;
      return change.before === null || experience.highlights.includes(change.before);
    }
  }
}

/**
 * Problems tying the drafts to this profile and roadmap; empty when they fit. A change against
 * text the profile no longer has would show the user a diff of something that is not there.
 */
export function checkDrafts(drafts: Drafts, profile: Profile, roadmap: Roadmap): string[] {
  const targets = new Set(roadmap.targets.map((t) => t.id));
  return drafts.changes.flatMap((change) => [
    ...(targets.has(change.targetId)
      ? []
      : [`change "${change.id}" is for unknown target "${change.targetId}"`]),
    ...(stillInProfile(change, profile)
      ? []
      : [`change "${change.id}" replaces text that is not in the profile`]),
  ]);
}
