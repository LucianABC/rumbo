import type { Profile, Roadmap } from '@rumbo/contracts';

import { getSuggestedChanges } from '../data';
import type { Lane } from '../roadmap/single-line';
import { profileCompleteness, type ProfileReview, suggestions } from './profile-view';

/**
 * What the header's notifications need. It never rejects, so it can stream into the shell without
 * failing a tab that does not use it: each part is null when its data cannot be read (#113).
 */
export async function loadProfileReview(
  pendingProfile: Promise<Profile>,
  forRoadmap: Roadmap,
  lanes: readonly Lane[],
): Promise<ProfileReview> {
  const [profile, changes] = await Promise.all([
    pendingProfile.catch(() => null),
    getSuggestedChanges(pendingProfile, forRoadmap),
  ]);
  return {
    suggestions: profile && changes ? suggestions(changes, profile, lanes) : null,
    completeness: profile ? profileCompleteness(profile) : null,
  };
}
