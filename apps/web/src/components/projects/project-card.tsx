'use client';

import { cn } from 'cn';
import {
  Check,
  CheckCircle2,
  ChevronRight,
  Circle,
  ExternalLink,
  FolderGit2,
  GitBranch,
  Undo2,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { useEffect, useRef } from 'react';

import { formatDay } from '../../lib/format';
import { DRAFT_STATUS_LABEL, type Decision } from '../../lib/labels';
import { LINE_BG } from '../../lib/line-colors';
import {
  decisionOf,
  type EvidenceRow,
  evidenceRows,
  type ProjectCard as ProjectCardView,
  type ProjectStage,
  type TaskRow,
  taskRows,
} from '../../lib/projects/projects-view';
import { LINK } from '../skills/shared';
import { DraftStatusChip, StatusChip } from '../status-chip';
import { Button } from '../ui/button';
import { useEvidenceDecisions } from './evidence-decisions';

/** How many commits a card lists: the repo holds the rest. */
const RECENT_COMMITS = 3;

const LABEL = 'text-xs font-medium text-muted-foreground';

/**
 * One project and what proves its progress (docs/product/views.md, #114). Roadmap items on the same
 * repo show as stages inside it. Each item keeps its `project-<itemId>` anchor, so the sticky
 * header must not cover what a link lands on.
 */
export function ProjectCard({
  card,
  activityAvailable,
}: {
  readonly card: ProjectCardView;
  readonly activityAvailable: boolean;
}) {
  const { decisions } = useEvidenceDecisions();
  const { id, title, status, repo, repoName, expectedEnd, stages, gaps, lanes } = card;
  const only = stages.length === 1 ? stages[0] : undefined;

  return (
    <li
      id={`project-${id}`}
      className="@container flex min-w-0 scroll-mt-20 flex-col gap-4 rounded-xl border bg-card p-4 md:p-5"
    >
      <header className="flex items-start gap-3">
        <span
          aria-hidden
          className="grid size-9 shrink-0 place-items-center rounded-lg bg-chart-1/15 text-chart-1"
        >
          <FolderGit2 className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <h3 className="font-semibold break-words">{title}</h3>
            <StatusChip status={status} />
          </div>
          {only ? (
            <Link href={only.stationHref} className={cn(LINK, 'text-xs text-muted-foreground')}>
              {only.milestone.title}
            </Link>
          ) : null}
        </div>
        {status !== 'done' && expectedEnd ? (
          <p className="shrink-0 text-right text-xs text-muted-foreground">
            Expected
            <span className="block font-mono text-foreground tabular-nums">
              {formatDay(expectedEnd)}
            </span>
          </p>
        ) : null}
      </header>

      {repo ? (
        <a
          href={repo}
          target="_blank"
          rel="noreferrer"
          className={cn(
            LINK,
            '-mt-2 ml-12 flex w-fit max-w-[calc(100%-3rem)] items-center gap-1.5 text-sm',
          )}
        >
          <GitBranch aria-hidden className="size-3.5 shrink-0 text-chart-1" />
          <span className="min-w-0 truncate">{repoName}</span>
          <ExternalLink aria-hidden className="size-3.5 shrink-0" />
          <span className="sr-only"> (opens in a new tab)</span>
        </a>
      ) : null}

      {only ? <DoneWhen text={only.item.doneWhen} /> : null}

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
        <ul role="list" aria-label="Gaps it closes" className="flex flex-wrap gap-1.5">
          {gaps.map((gap) => (
            <li key={gap.id}>
              <Link
                href={`/skills#gap-${gap.id}`}
                className="inline-flex h-6 items-center rounded-md bg-chart-1/15 px-2 text-xs font-medium outline-none hover:bg-chart-1/25 focus-visible:ring-2 focus-visible:ring-ring"
              >
                {gap.name}
              </Link>
            </li>
          ))}
        </ul>
        <ul
          role="list"
          aria-label="Targets it serves"
          className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground"
        >
          {lanes.map(({ target, color }) => (
            <li key={target.id} className="inline-flex items-center gap-1.5">
              <span aria-hidden className={cn('h-1 w-4 shrink-0 rounded-full', LINE_BG[color])} />
              {target.roleFamily.name}
            </li>
          ))}
        </ul>
      </div>

      <div className={cn('grid gap-4', only ? '@lg:grid-cols-2' : '@lg:grid-cols-[3fr_2fr]')}>
        {only ? (
          <Tasks title={title} tasks={taskRows(only.item, decisions)} />
        ) : (
          <Stages title={title} stages={stages} />
        )}
        <Activity card={card} activityAvailable={activityAvailable} />
      </div>

      <Evidence card={card} />
    </li>
  );
}

function DoneWhen({ text }: { readonly text: string }) {
  return (
    <p className="text-sm">
      <span className="font-medium">Done when: </span>
      <span className="text-muted-foreground">{text}</span>
    </p>
  );
}

/** Stages of one repo, folded so a project stays one card's height: the current one is open. */
function Stages({
  title,
  stages,
}: {
  readonly title: string;
  readonly stages: readonly ProjectStage[];
}) {
  const { decisions } = useEvidenceDecisions();
  const current = stages.find((s) => s.item.status !== 'done') ?? stages[0];

  // Browsers do not open a closed <details> for a fragment, so a link to a stage would land on it
  // shut. This module owns those anchors, so it opens the one the URL names.
  useEffect(() => {
    const openTarget = () => {
      const target = document.getElementById(window.location.hash.slice(1));
      if (!(target instanceof HTMLDetailsElement)) return;
      target.open = true;
      target.scrollIntoView();
    };
    openTarget();
    window.addEventListener('hashchange', openTarget);
    return () => {
      window.removeEventListener('hashchange', openTarget);
    };
  }, []);

  return (
    <section aria-label={`Stages of ${title}`} className="flex min-w-0 flex-col gap-2">
      <p className={LABEL}>Stages</p>
      <ol className="flex flex-col gap-2">
        {stages.map((stage, i) => {
          const { item, milestone, stationHref } = stage;
          const tasks = taskRows(item, decisions);
          return (
            <li key={item.id}>
              <details
                // The card holds the first stage's anchor.
                id={i === 0 ? undefined : `project-${item.id}`}
                open={stage === current}
                className="group scroll-mt-20 rounded-lg border"
              >
                <summary className="flex cursor-pointer list-none items-center gap-2 rounded-lg p-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
                  <ChevronRight
                    aria-hidden
                    className="size-3.5 shrink-0 text-muted-foreground transition-transform group-open:rotate-90"
                  />
                  <span className="min-w-0 flex-1 font-medium break-words">{item.title}</span>
                  <span className="shrink-0 font-mono text-xs text-muted-foreground tabular-nums">
                    {tasks.filter((t) => t.done).length}/{tasks.length}
                  </span>
                  <StatusChip status={item.status} />
                </summary>
                <div className="flex flex-col gap-2 border-t p-2.5">
                  <Link
                    href={stationHref}
                    className={cn(LINK, 'w-fit text-xs text-muted-foreground')}
                  >
                    {milestone.title}
                  </Link>
                  <DoneWhen text={item.doneWhen} />
                  <TaskList tasks={tasks} />
                </div>
              </details>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function Tasks({ title, tasks }: { readonly title: string; readonly tasks: readonly TaskRow[] }) {
  const done = tasks.filter((t) => t.done).length;
  const percent = tasks.length > 0 ? Math.round((done / tasks.length) * 100) : 0;
  return (
    <section aria-label={`Tasks of ${title}`} className="flex min-w-0 flex-col gap-2">
      <p className={cn(LABEL, 'flex items-baseline justify-between gap-2')}>
        Tasks
        <span role="status" className="font-mono tabular-nums">
          {done} of {tasks.length} done
        </span>
      </p>
      <div aria-hidden className="h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-chart-1 transition-[width] duration-(--duration-quick)"
          style={{ width: `${String(percent)}%` }}
        />
      </div>
      <TaskList tasks={tasks} />
    </section>
  );
}

function TaskList({ tasks }: { readonly tasks: readonly TaskRow[] }) {
  return (
    <ul role="list" className="flex flex-col gap-1.5 text-sm">
      {tasks.map((task) => (
        <li key={task.id} className="flex items-start gap-2">
          {task.done ? (
            <CheckCircle2 aria-hidden className="mt-0.5 size-4 shrink-0 text-success" />
          ) : (
            <Circle aria-hidden className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          )}
          <span className={cn('min-w-0 break-words', task.done && 'text-muted-foreground')}>
            <span className="sr-only">{task.done ? 'Done: ' : 'Open: '}</span>
            {task.title}
          </span>
          {task.awaitingEvidence ? <DraftStatusChip status="awaiting" /> : null}
        </li>
      ))}
    </ul>
  );
}

function Activity({
  card: { title, repo, lastActivity, commits },
  activityAvailable,
}: {
  readonly card: ProjectCardView;
  readonly activityAvailable: boolean;
}) {
  return (
    <section aria-label={`Activity of ${title}`} className="flex min-w-0 flex-col gap-2">
      <p className={LABEL}>Activity</p>
      {repo ? null : (
        <p className="text-sm text-muted-foreground">
          No repo linked yet. Once it is, rumbo reads its pushes to find evidence.
        </p>
      )}
      {lastActivity ? (
        <p className="text-sm text-muted-foreground">
          Last activity{' '}
          <span className="font-mono text-foreground tabular-nums">{formatDay(lastActivity)}</span>
        </p>
      ) : null}
      {repo && !activityAvailable ? (
        <p className="text-sm text-muted-foreground">Recent commits are unavailable right now.</p>
      ) : null}
      {commits.length > 0 ? (
        <ul role="list" aria-label="Recent commits" className="flex flex-col gap-1 text-sm">
          {commits.slice(0, RECENT_COMMITS).map((commit) => (
            <li key={commit.sha} className="flex min-w-0 items-baseline gap-2">
              <code className="shrink-0 font-mono text-xs text-muted-foreground">
                {commit.sha.slice(0, 7)}
              </code>
              <span className="min-w-0 truncate" title={commit.message}>
                {commit.message}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

function Evidence({ card }: { readonly card: ProjectCardView }) {
  const { decisions, decide } = useEvidenceDecisions();
  const rows = evidenceRows(card);
  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">No evidence yet.</p>;
  }
  return (
    <section aria-label={`Evidence of ${card.title}`} className="flex flex-col gap-2">
      <p className={LABEL}>Evidence</p>
      <ul role="list" className="flex flex-col gap-2">
        {rows.map((row) => (
          <EvidenceItem
            key={row.evidence.id}
            row={row}
            project={card.title}
            status={decisionOf(row.evidence, decisions)}
            onDecide={(decision) => {
              decide(row.evidence.id, decision);
            }}
          />
        ))}
      </ul>
    </section>
  );
}

function EvidenceItem({
  row: { evidence, name, href, message, taskTitle },
  project,
  status,
  onDecide,
}: {
  readonly row: EvidenceRow;
  readonly project: string;
  readonly status: Decision | 'awaiting';
  readonly onDecide: (decision: Decision | null) => void;
}) {
  const actions = useRef<HTMLDivElement>(null);
  const shown = useRef(status);
  const place = `${name}, ${project}`;
  // Stored approvals are the record; only what was decided on this visit can be taken back.
  const undoable = evidence.approvedAt === null && status !== 'awaiting';

  // Deciding removes the button that was just pressed: focus moves to the next action, so a
  // keyboard user does not fall back to the top of the page (same as suggested changes, #113).
  useEffect(() => {
    if (shown.current === status) return;
    shown.current = status;
    actions.current?.querySelector<HTMLElement>('button')?.focus();
  }, [status]);

  return (
    <li
      className={cn(
        'flex min-w-0 flex-col gap-2 rounded-lg border p-3 text-sm @lg:flex-row @lg:items-center @lg:justify-between @lg:gap-4',
        status === 'awaiting' && 'border-attention/30 bg-attention/5',
      )}
    >
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
          {href ? (
            <a href={href} target="_blank" rel="noreferrer" className={cn(LINK, 'font-medium')}>
              {name}
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
          ) : (
            <span className="font-medium">{name}</span>
          )}
          <DraftStatusChip status={status} />
        </span>
        {taskTitle ? (
          <span className="text-xs text-muted-foreground">Matched to: {taskTitle}</span>
        ) : null}
        {(evidence.excerpt ?? message) ? (
          <span className="break-words text-muted-foreground">{evidence.excerpt ?? message}</span>
        ) : null}
      </div>
      {status === 'awaiting' || undoable ? (
        <div ref={actions} className="flex shrink-0 flex-wrap items-center gap-2">
          {status === 'awaiting' ? (
            <>
              <Button
                type="button"
                size="sm"
                aria-label={`Approve: ${place}`}
                onClick={() => {
                  onDecide('approved');
                }}
              >
                <Check aria-hidden />
                Approve
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                aria-label={`Reject: ${place}`}
                onClick={() => {
                  onDecide('rejected');
                }}
              >
                <X aria-hidden />
                Reject
              </Button>
            </>
          ) : (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              aria-label={`Undo ${DRAFT_STATUS_LABEL[status]}: ${place}`}
              onClick={() => {
                onDecide(null);
              }}
            >
              <Undo2 aria-hidden />
              Undo
            </Button>
          )}
        </div>
      ) : null}
    </li>
  );
}
