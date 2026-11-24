import { PageHeader } from '../../../components/page-header';
import { tabMetadata } from '../../../components/planned';
import { ProjectsSummary } from '../../../components/projects/projects-summary';
import { ProjectsTab } from '../../../components/projects/projects-tab';
import { getProgress, getRoadmap } from '../../../lib/data';
import { formatDay } from '../../../lib/format';

export const metadata = tabMetadata('projects');

/**
 * Projects (docs/product/views.md, #114): the practice projects in the roadmap and what proves
 * their progress. The plan comes from the store the tabs layout hydrates (#168); this page reads
 * only the repo activity, which degrades on its own, since the cards can show the rest without it.
 */
export default async function ProjectsPage() {
  const progress = await getProgress(await getRoadmap());

  return (
    <>
      <PageHeader
        title="Projects"
        provenance={
          progress
            ? `Repo activity synced ${formatDay(progress.syncedAt)}`
            : 'Repo activity is unavailable right now'
        }
        action={<ProjectsSummary />}
      />
      <ProjectsTab progress={progress} />
    </>
  );
}
