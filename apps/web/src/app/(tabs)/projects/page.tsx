import { deriveRoadmapView } from '@rumbo/contracts';
import { FolderGit2 } from 'lucide-react';
import Link from 'next/link';

import { PageHeader } from '../../../components/page-header';
import { tabMetadata } from '../../../components/planned';
import { ProjectCard } from '../../../components/projects/project-card';
import { ProjectsSummary } from '../../../components/projects/projects-summary';
import { HEADING, LINK } from '../../../components/skills/shared';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '../../../components/ui/empty';
import { getProgress, getRoadmap, getRoadmapLayout, getTargetColors } from '../../../lib/data';
import { formatDay } from '../../../lib/format';
import { type ProjectCard as Card, projectsView } from '../../../lib/projects/projects-view';
import { lanesOf } from '../../../lib/roadmap/single-line';
import { evidenceTasks, tabBadges } from '../../../lib/tabs';

export const metadata = tabMetadata('projects');

/**
 * Projects (docs/product/views.md, #114): the practice projects in the roadmap and what proves
 * their progress. Activity degrades on its own, since the cards can show the rest without it;
 * without a roadmap there is nothing to show, so its failure fails the page, as on Roadmap.
 */
export default async function ProjectsPage() {
  const roadmap = await getRoadmap();
  const [layout, progress] = await Promise.all([getRoadmapLayout(roadmap), getProgress(roadmap)]);
  const lanes = lanesOf(roadmap, getTargetColors(roadmap, layout));
  const { active, completed } = projectsView(roadmap, deriveRoadmapView(roadmap), lanes, progress);

  return (
    <>
      <PageHeader
        title="Projects"
        provenance={
          progress
            ? `Repo activity synced ${formatDay(progress.syncedAt)}`
            : 'Repo activity is unavailable right now'
        }
        action={
          <ProjectsSummary badge={tabBadges(roadmap).projects} tasks={evidenceTasks(roadmap)} />
        }
      />
      {active.length + completed.length === 0 ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <FolderGit2 aria-hidden />
            </EmptyMedia>
            <EmptyTitle>No practice projects yet</EmptyTitle>
            <EmptyDescription>
              When your roadmap closes a gap with a project, it shows up here with its tasks and
              what proves them. <Link href="/roadmap">See your roadmap</Link>.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="flex flex-col gap-8">
          <ProjectSection
            id="active"
            title="Active"
            cards={active}
            activityAvailable={progress !== null}
            empty={
              <>
                Every project is done.{' '}
                <Link className={LINK} href="/roadmap">
                  See what is next
                </Link>
                .
              </>
            }
          />
          <ProjectSection
            id="completed"
            title="Completed"
            cards={completed}
            activityAvailable={progress !== null}
            empty="Nothing finished yet. A project is done once its evidence is approved."
          />
        </div>
      )}
    </>
  );
}

function ProjectSection({
  id,
  title,
  cards,
  activityAvailable,
  empty,
}: {
  readonly id: string;
  readonly title: string;
  readonly cards: readonly Card[];
  readonly activityAvailable: boolean;
  readonly empty: React.ReactNode;
}) {
  const headingId = `${id}-heading`;
  return (
    <section id={id} aria-labelledby={headingId} className="flex scroll-mt-20 flex-col gap-3">
      <h2 id={headingId} className={HEADING}>
        {title} <span className="font-mono tabular-nums">({cards.length})</span>
      </h2>
      {cards.length > 0 ? (
        <ul role="list" className="grid items-start gap-4 lg:grid-cols-2">
          {cards.map((card) => (
            <ProjectCard key={card.id} card={card} activityAvailable={activityAvailable} />
          ))}
        </ul>
      ) : (
        <p className="rounded-xl border bg-card p-4 text-sm text-muted-foreground">{empty}</p>
      )}
    </section>
  );
}
