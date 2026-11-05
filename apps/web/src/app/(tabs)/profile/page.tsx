import { tabMetadata } from '../../../components/planned';
import { ProfileView } from '../../../components/profile/profile-view';
import {
  getProfile,
  getProfileAnalysis,
  getRoadmap,
  getRoadmapLayout,
  getSuggestedChanges,
  getTargetColors,
} from '../../../lib/data';
import { suggestions } from '../../../lib/profile/profile-view';
import { lanesOf } from '../../../lib/roadmap/single-line';

export const metadata = tabMetadata('profile');

/**
 * Profile (docs/product/views.md, #113): where the profile came from, what rumbo makes of it,
 * then the CV, under a bar with how complete it is. Suggested changes live in the app header and
 * move that bar. The analysis and the changes degrade on their own; without a profile there is
 * nothing to show, so its failure fails the page, as on Roadmap.
 */
export default async function ProfilePage() {
  const roadmap = await getRoadmap();
  const pendingProfile = getProfile();
  const [profile, layout, changes, analysis] = await Promise.all([
    pendingProfile,
    getRoadmapLayout(roadmap),
    getSuggestedChanges(pendingProfile, roadmap),
    getProfileAnalysis(pendingProfile),
  ]);
  const lanes = lanesOf(roadmap, getTargetColors(roadmap, layout));

  return (
    <ProfileView
      imported={profile}
      analysis={analysis}
      suggestions={changes ? suggestions(changes, profile, lanes) : []}
      now={new Date()}
    />
  );
}
