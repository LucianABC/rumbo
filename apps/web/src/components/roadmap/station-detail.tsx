import type { EvidenceRef, RoadmapItem } from '@rumbo/contracts';
import { cn } from 'cn';
import {
  BriefcaseBusiness,
  CircleCheck,
  Circle,
  FolderGit2,
  GraduationCap,
  type LucideIcon,
} from 'lucide-react';

import { formatDay } from '../../lib/format';
import {
  EDUCATION_KIND_LABEL,
  EVIDENCE_SOURCE_LABEL,
  evidenceStatusLabel,
  ITEM_TYPE_LABEL,
} from '../../lib/labels';
import { LINE_BG } from '../../lib/line-colors';
import type { SingleLineRow } from '../../lib/roadmap/single-line';
import { StatusChip } from '../status-chip';

type MilestoneRow = Extract<SingleLineRow, { kind: 'milestone' }>;

const ITEM_ICON: Readonly<Record<RoadmapItem['type'], LucideIcon>> = {
  project: FolderGit2,
  education: GraduationCap,
  work_experience: BriefcaseBusiness,
};

/**
 * What a station holds (spec 01, M2, #109): the targets it advances, then each item with its
 * type, status, `doneWhen`, the gaps it closes, tasks, evidence with its approval state, and
 * dates, with an explicit state wherever something is missing.
 */
export function StationDetail({
  row,
  gapNames,
}: {
  readonly row: MilestoneRow;
  readonly gapNames: Readonly<Record<string, string>>;
}) {
  const served = row.cells.filter((cell) => cell.stop);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-2">
        <StatusChip status={row.status} />
        {row.current ? (
          <span className="inline-flex h-5 items-center rounded-full bg-primary px-2 text-2xs font-semibold text-primary-foreground">
            You are here
          </span>
        ) : null}
      </div>
      {row.milestone.summary ? (
        <p className="text-sm text-muted-foreground">{row.milestone.summary}</p>
      ) : null}

      <section aria-labelledby="station-targets" className="flex flex-col gap-2">
        <h3 id="station-targets" className="text-xs font-semibold text-muted-foreground uppercase">
          Moves you toward
        </h3>
        <ul role="list" className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
          {served.map((cell) => (
            <li key={cell.lane.target.id} className="inline-flex items-center gap-2">
              <span aria-hidden className={cn('h-1 w-4 rounded-full', LINE_BG[cell.lane.color])} />
              {cell.lane.target.roleFamily.name}
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="station-items" className="flex flex-col gap-3">
        <h3 id="station-items" className="text-xs font-semibold text-muted-foreground uppercase">
          What closes it
        </h3>
        {row.milestone.items.length === 0 ? (
          <p className="text-sm text-muted-foreground">No items planned for this station yet.</p>
        ) : (
          <ul role="list" className="flex flex-col gap-3">
            {row.milestone.items.map((item) => (
              <li key={item.id}>
                <Item item={item} gapNames={gapNames} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Item({
  item,
  gapNames,
}: {
  readonly item: RoadmapItem;
  readonly gapNames: Readonly<Record<string, string>>;
}) {
  const Icon = ITEM_ICON[item.type];
  const kind =
    item.type === 'education'
      ? `${EDUCATION_KIND_LABEL[item.kind]} · ${item.provider}`
      : ITEM_TYPE_LABEL[item.type];

  return (
    <article className="flex flex-col gap-3 rounded-lg border bg-card p-4">
      <header className="flex flex-col gap-1">
        <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <Icon aria-hidden className="size-3.5" />
          {kind}
        </span>
        <div className="flex flex-wrap items-center gap-2">
          <h4 className="font-heading text-base leading-6 font-semibold">{item.title}</h4>
          <StatusChip status={item.status} />
        </div>
        {item.type === 'work_experience' ? (
          <p className="text-sm text-muted-foreground">{item.context}</p>
        ) : null}
      </header>

      <dl className="grid grid-cols-[max-content_minmax(0,1fr)] gap-x-3 gap-y-1.5 text-sm">
        <dt className="text-muted-foreground">Done when</dt>
        <dd>{item.doneWhen}</dd>
        <dt className="text-muted-foreground">Closes</dt>
        <dd>{item.gapIds.map((id) => gapNames[id] ?? id).join(', ')}</dd>
        <dt className="text-muted-foreground">Expected</dt>
        <dd
          className={cn(
            'font-mono text-xs leading-5',
            !item.expectedEnd && 'text-muted-foreground',
          )}
        >
          {item.expectedEnd ? formatDay(item.expectedEnd) : 'No date yet'}
        </dd>
        <dt className="text-muted-foreground">Last progress</dt>
        <dd
          className={cn(
            'font-mono text-xs leading-5',
            !item.lastProgressAt && 'text-muted-foreground',
          )}
        >
          {item.lastProgressAt ? formatDay(item.lastProgressAt) : 'None yet'}
        </dd>
        {item.type === 'project' && item.repo ? (
          <>
            <dt className="text-muted-foreground">Repository</dt>
            <dd className="min-w-0 truncate">
              <a
                href={item.repo}
                target="_blank"
                rel="noreferrer"
                className="rounded-sm text-primary underline underline-offset-2 outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {item.repo.replace(/^https?:\/\//, '')}
              </a>
            </dd>
          </>
        ) : null}
      </dl>

      {item.type === 'project' ? <Tasks tasks={item.tasks} /> : null}
      <Evidence evidence={item.evidence} />
    </article>
  );
}

function Tasks({ tasks }: { readonly tasks: Extract<RoadmapItem, { type: 'project' }>['tasks'] }) {
  if (tasks.length === 0) {
    return <p className="text-sm text-muted-foreground">No tasks yet.</p>;
  }
  const done = tasks.filter((t) => t.done).length;
  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-xs font-medium text-muted-foreground">
        Tasks ·{' '}
        <span className="font-mono tabular-nums">{`${String(done)}/${String(tasks.length)}`}</span>
      </p>
      <ul role="list" className="flex flex-col gap-1 text-sm">
        {tasks.map((task) => (
          <li key={task.id} className="flex items-start gap-2">
            {task.done ? (
              <CircleCheck aria-hidden className="mt-0.5 size-4 shrink-0 text-success" />
            ) : (
              <Circle aria-hidden className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            )}
            <span className={cn(task.done && 'text-muted-foreground line-through')}>
              <span className="sr-only">{task.done ? 'Done: ' : 'To do: '}</span>
              {task.title}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Evidence and whether the user approved it: nothing counts until they do (AI rule 2). Skills &
 * gaps reuses it (#111).
 */
export function Evidence({
  evidence,
  experienceNames = {},
}: {
  readonly evidence: readonly EvidenceRef[];
  /** "Title · Organization" per experience id, so experience evidence never shows a raw id. */
  readonly experienceNames?: Readonly<Record<string, string>>;
}) {
  if (evidence.length === 0) {
    return <p className="text-sm text-muted-foreground">No evidence yet.</p>;
  }
  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-xs font-medium text-muted-foreground">Evidence</p>
      <ul role="list" className="flex flex-col gap-2 text-sm">
        {evidence.map((e) => {
          const awaiting = e.approvedAt === null;
          return (
            <li key={e.id} className="flex flex-col gap-0.5">
              <span className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{EVIDENCE_SOURCE_LABEL[e.sourceType]}</span>
                <span
                  className={cn(
                    'inline-flex h-5 items-center rounded-full border px-2 text-2xs font-medium',
                    awaiting
                      ? 'border-attention/40 text-attention'
                      : 'border-success/40 text-success',
                  )}
                >
                  {evidenceStatusLabel(e.approvedAt)}
                </span>
              </span>
              <span className="text-muted-foreground">
                {e.excerpt ?? sourceText(e, experienceNames)}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function sourceText(e: EvidenceRef, experienceNames: Readonly<Record<string, string>>): string {
  if (e.sourceType === 'commit') return e.sourceRef.slice(0, 7);
  if (e.sourceType === 'experience') return experienceNames[e.sourceRef] ?? e.sourceRef;
  return e.sourceRef;
}
