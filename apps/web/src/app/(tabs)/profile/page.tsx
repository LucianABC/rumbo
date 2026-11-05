import { PageHeader } from '../../../components/page-header';
import { tabMetadata } from '../../../components/planned';
import { ProfileCv } from '../../../components/profile/profile-cv';
import { ProfileSources } from '../../../components/profile/profile-sources';
import { SuggestedChanges } from '../../../components/profile/suggested-changes';
import {
  getProfile,
  getProfileAnalysis,
  getRoadmap,
  getRoadmapLayout,
  getSuggestedChanges,
  getTargetColors,
} from '../../../lib/data';
import { profileProvenance, suggestions } from '../../../lib/profile/profile-view';
import { lanesOf } from '../../../lib/roadmap/single-line';

export const metadata = tabMetadata('profile');

/**
 * Profile (docs/product/views.md, #113): where the profile came from, what rumbo makes of it,
 * then the CV, with suggested changes and completeness behind a bell. The analysis and the changes
 * degrade on their own; without a profile there is nothing to show, so its failure fails the page,
 * as on Roadmap.
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
    <>
      <PageHeader
        title="Profile"
        provenance={profileProvenance(profile)}
        action={
          <SuggestedChanges
            suggestions={changes ? suggestions(changes, profile, lanes) : null}
            completeness={analysis?.completeness ?? null}
          />
        }
      />
      <ProfileSources profile={profile} />
      <ProfileCv profile={profile} analysis={analysis} now={new Date()} />
    </>
  );
}
