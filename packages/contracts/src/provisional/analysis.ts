import { z } from 'zod';

import type { Profile } from '../profile.js';

/**
 * Provisional (spec 01, #113): what rumbo says about a profile, as the views read it until the F1
 * spec (#41) decides the real shape. The subtitle, the summary and the feedback come from the
 * Drafter's review mode (docs/product/agents.md).
 */

export const ProfileFeedback = z.object({
  kind: z.enum(['strength', 'improve']),
  text: z.string().min(1),
});
export type ProfileFeedback = z.infer<typeof ProfileFeedback>;

export const ProfileAnalysis = z.object({
  /** The profile version analyzed, so an analysis never outlives the profile it read. */
  profileUpdatedAt: z.iso.datetime(),
  analyzedAt: z.iso.datetime(),
  /** The short line under the user's name; LinkedIn headlines run too long for it. */
  subtitle: z.string().min(1).max(80),
  summary: z.string().min(1),
  feedback: z.array(ProfileFeedback),
});
export type ProfileAnalysis = z.infer<typeof ProfileAnalysis>;

/** Problems tying the analysis to this profile; empty when it read this version. */
export function checkAnalysis(analysis: ProfileAnalysis, profile: Profile): string[] {
  return analysis.profileUpdatedAt === profile.updatedAt
    ? []
    : ['the analysis read another version of the profile'];
}
