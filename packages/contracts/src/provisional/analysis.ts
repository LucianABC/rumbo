import { z } from 'zod';

import type { Profile } from '../profile.js';

/**
 * Provisional (spec 01, #113): what rumbo says about a profile, as the views read it until the F1
 * spec (#41) decides the real shape. The summary and the feedback are the Profile analyst's
 * opinion. Completeness is a number code computes from a fixed rubric, never the model's
 * (docs/product/agents.md).
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
  summary: z.string().min(1),
  feedback: z.array(ProfileFeedback),
  /** Percentage of the rubric the profile meets. */
  completeness: z.int().min(0).max(100),
});
export type ProfileAnalysis = z.infer<typeof ProfileAnalysis>;

/** Problems tying the analysis to this profile; empty when it read this version. */
export function checkAnalysis(analysis: ProfileAnalysis, profile: Profile): string[] {
  return analysis.profileUpdatedAt === profile.updatedAt
    ? []
    : ['the analysis read another version of the profile'];
}
