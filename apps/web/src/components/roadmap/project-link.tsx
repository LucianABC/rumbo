import type { ProjectItem } from '@rumbo/contracts';
import { cn } from 'cn';
import { ChevronRight, FolderGit2 } from 'lucide-react';
import Link from 'next/link';

import { projectHref } from '../../lib/projects/projects-view';
import type { SingleLineRow } from '../../lib/roadmap/single-line';
import { StatusChip } from '../status-chip';

const ACCENT =
  'rounded-sm text-primary underline underline-offset-2 outline-none focus-visible:ring-2 focus-visible:ring-ring';

/** From a project on Roadmap to its place on Projects (owner, #114). */
export function ProjectLink({
  item,
  className,
}: {
  readonly item: Pick<ProjectItem, 'id' | 'title'>;
  readonly className?: string;
}) {
  return (
    <Link
      href={projectHref(item.id)}
      aria-label={`See ${item.title} on Projects`}
      className={cn(ACCENT, 'inline-flex w-fit shrink-0 items-center gap-0.5 text-sm', className)}
    >
      See project
      <ChevronRight aria-hidden className="size-3.5" />
    </Link>
  );
}

/**
 * Every practice project beside its station, for the desktop view before a line is picked: the map
 * has no room for links and the station list waits, so without this the only way to a project is
 * opening stations one by one (owner, #114).
 */
export function StationProjects({
  stations,
  className,
}: {
  readonly stations: readonly Extract<SingleLineRow, { kind: 'milestone' }>[];
  readonly className?: string;
}) {
  const rows = stations.flatMap((station) =>
    station.milestone.items.flatMap((item) =>
      item.type === 'project' ? [{ item, station: station.milestone.title }] : [],
    ),
  );
  if (rows.length === 0) return null;

  return (
    <section aria-labelledby="station-projects" className={cn('flex-col gap-2', className)}>
      <h2 id="station-projects" className="text-xs font-semibold text-muted-foreground uppercase">
        Practice projects by station
      </h2>
      <ul role="list" className="grid gap-2 lg:grid-cols-2">
        {rows.map(({ item, station }) => (
          <li
            key={item.id}
            className="flex min-w-0 items-center gap-3 rounded-lg border bg-card px-3 py-2"
          >
            <FolderGit2 aria-hidden className="size-4 shrink-0 text-chart-1" />
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="text-xs text-muted-foreground">
                <span className="sr-only">Station: </span>
                {station}
              </span>
              <span className="text-sm font-medium break-words">{item.title}</span>
            </span>
            <StatusChip status={item.status} />
            <ProjectLink item={item} />
          </li>
        ))}
      </ul>
    </section>
  );
}
