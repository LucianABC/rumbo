'use client';

import type { Progress } from '@rumbo/contracts/provisional';
import { FolderGit2 } from 'lucide-react';
import Link from 'next/link';
import { type ReactNode, useMemo } from 'react';

import { type ProjectCard as Card, projectsView } from '../../lib/projects/projects-view';
import { usePlan } from '../../lib/store';
import { HEADING, LINK } from '../skills/shared';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '../ui/empty';
import { ProjectCard } from './project-card';

/**
 * The Projects cards from the plan in the store, so a decision here moves Roadmap and the badges
 * too, and one made elsewhere shows here (#168).
 */
export function ProjectsTab({ progress }: { readonly progress: Progress | null }) {
  const { roadmap, view, lanes } = usePlan();
  const { active, completed } = useMemo(
    () => projectsView(roadmap, view, lanes, progress),
    [roadmap, view, lanes, progress],
  );

  if (active.length + completed.length === 0) {
    return (
      <Empty className="border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <FolderGit2 aria-hidden />
          </EmptyMedia>
          <EmptyTitle>No practice projects yet</EmptyTitle>
          <EmptyDescription>
            When your roadmap closes a gap with a project, it shows up here with its tasks and what
            proves them. <Link href="/roadmap">See your roadmap</Link>.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }
  return (
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
  readonly empty: ReactNode;
}) {
  const headingId = `${id}-heading`;
  return (
    <section id={id} aria-labelledby={headingId} className="flex scroll-mt-20 flex-col gap-3">
      <h2 id={headingId} className={HEADING}>
        {title} <span className="font-mono tabular-nums">({cards.length})</span>
      </h2>
      {cards.length > 0 ? (
        <ul role="list" className="flex flex-col gap-4">
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
