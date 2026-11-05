'use client';

import { cn } from 'cn';
import { Check, ChevronRight, ExternalLink, FolderGit2, GitBranch, Undo2, X } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useRef } from 'react';

import { formatDay } from '../../lib/format';
import { DRAFT_STATUS_LABEL, type Decision } from '../../lib/labels';
import { LINE_BG, LINE_TINT } from '../../lib/line-colors';
import {
  decisionOf,
  type EvidenceRow,
  evidenceRows,
  lineInitials,
  type ProjectCard as ProjectCardView,
  projectAnchor,
  type ProjectDeliverable,
  taskRows,
} from '../../lib/projects/projects-view';
import { LINK } from '../skills/shared';
import { DraftStatusChip, StatusChip } from '../status-chip';
import { TaskList } from '../task-list';
import { Button } from '../ui/button';
import { useEvidenceDecisions } from '../../lib/store';

/** How many commits a card lists: the repo holds the rest. */
const RECENT_COMMITS = 3;

const LABEL = 'text-xs font-medium text-muted-foreground';

/** Names a value, so it never reads as part of it. `primary` holds AA on the tinted header. */
const FIELD = 'text-2xs font-semibold tracking-wide text-primary uppercase';

/**
 * One project and what proves its progress (docs/product/views.md, #114). Every project shows the
 * same way, whether it has one deliverable or several: a deliverable is the project's part in one Roadmap
 * station, so each task reads under its station and the gaps that station's item closes.
 */
export function ProjectCard({
  card,
  activityAvailable,
}: {
  readonly card: ProjectCardView;
  readonly activityAvailable: boolean;
}) {
  const { title, status, repo, repoName, expectedEnd, deliverables, lanes } = card;

  return (
    <li className="@container flex min-w-0 flex-col gap-4 rounded-xl border bg-card p-4 md:p-5">
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

      {/* Below the header, not in it: the date would cut the link on a phone. */}
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

      <Activity card={card} activityAvailable={activityAvailable} />

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

      <Deliverables title={title} deliverables={deliverables} />

      <Evidence card={card} />
    </li>
  );
}

/** One deliverable per station, folded so a project stays one card's height: the current one is open. */
function Deliverables({
  title,
  deliverables,
}: {
  readonly title: string;
  readonly deliverables: readonly ProjectDeliverable[];
}) {
  const { decisions } = useEvidenceDecisions();
  const current = deliverables.find((s) => s.item.status !== 'done') ?? deliverables[0];
  const tasks = deliverables.flatMap((s) => taskRows(s.item, decisions));
  const done = tasks.filter((t) => t.done).length;
  const percent = tasks.length > 0 ? Math.round((done / tasks.length) * 100) : 0;

  // Browsers do not open a closed <details> for a fragment, so a link to a deliverable would land on it
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
    <section aria-label={`Deliverables of ${title}`} className="flex min-w-0 flex-col gap-2">
      <p className={cn(LABEL, 'flex items-baseline justify-between gap-2')}>
        Deliverables
        <span role="status" className="font-mono tabular-nums">
          {done} of {tasks.length} tasks done
        </span>
      </p>
      <div aria-hidden className="h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-chart-1 transition-[width] duration-(--duration-quick)"
          style={{ width: `${String(percent)}%` }}
        />
      </div>
      <ol className="flex flex-col gap-2">
        {deliverables.map((deliverable) => (
          <li key={deliverable.item.id}>
            <Deliverable deliverable={deliverable} open={deliverable === current} />
          </li>
        ))}
      </ol>
    </section>
  );
}

function Deliverable({
  deliverable: { item, milestone, stationHref, gaps, lanes },
  open,
}: {
  readonly deliverable: ProjectDeliverable;
  readonly open: boolean;
}) {
  const { decisions } = useEvidenceDecisions();
  const tasks = taskRows(item, decisions);
  return (
    <div className="overflow-hidden rounded-lg border">
      {/* Outside the fold: where a deliverable belongs and what it closes must show while it is
          closed (owner, #114). */}
      <dl className="grid gap-x-8 gap-y-2.5 border-b border-l-4 border-l-chart-1 bg-chart-1/10 px-3 py-2.5 @2xl:grid-cols-[minmax(0,1fr)_11rem_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-1">
          <dt className={FIELD}>Roadmap station</dt>
          <dd className="text-sm font-semibold break-words">
            <Link href={stationHref} className={LINK}>
              {milestone.title}
            </Link>
          </dd>
        </div>
        <div className="flex min-w-0 flex-col gap-1">
          <dt className={FIELD}>Lines</dt>
          <dd>
            <ul role="list" aria-label="Lines it moves forward" className="flex flex-wrap gap-1.5">
              {lanes.map(({ target, color }) => (
                <li
                  key={target.id}
                  title={target.roleFamily.name}
                  className={cn(
                    'inline-flex h-6 items-center gap-1.5 rounded-full border px-2 text-xs font-medium',
                    LINE_TINT[color],
                  )}
                >
                  <span aria-hidden className={cn('size-2 rounded-full', LINE_BG[color])} />
                  <span aria-hidden>{lineInitials(target.roleFamily.name)}</span>
                  <span className="sr-only">{target.roleFamily.name}</span>
                </li>
              ))}
            </ul>
          </dd>
        </div>
        <div className="flex min-w-0 flex-col gap-1">
          <dt className={FIELD}>Closes</dt>
          <dd>
            <ul role="list" aria-label="Gaps it closes" className="flex flex-wrap gap-1.5">
              {gaps.map((gap) => (
                <li key={gap.id}>
                  <Link
                    href={`/skills#gap-${gap.id}`}
                    className="inline-flex h-6 items-center rounded-md border border-chart-1/40 bg-card px-2 text-xs font-medium outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {gap.name}
                  </Link>
                </li>
              ))}
            </ul>
          </dd>
        </div>
      </dl>
      <details id={projectAnchor(item.id)} open={open} className="group scroll-mt-28">
        <summary className="flex cursor-pointer list-none items-center gap-2 p-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset [&::-webkit-details-marker]:hidden">
          <ChevronRight
            aria-hidden
            className="size-3.5 shrink-0 text-muted-foreground transition-transform group-open:rotate-90"
          />
          <span className="min-w-0 flex-1 break-words">
            <span className={cn(FIELD, 'block')}>Deliverable</span>
            <span className="font-medium">{item.title}</span>
          </span>
          <span className="shrink-0 font-mono text-xs text-muted-foreground tabular-nums">
            {tasks.filter((t) => t.done).length}/{tasks.length}
          </span>
          <StatusChip status={item.status} />
        </summary>
        <div className="flex flex-col gap-3 border-t p-2.5">
          <p className="text-sm">
            <span className="font-medium">Done when: </span>
            <span className="text-muted-foreground">{item.doneWhen}</span>
          </p>
          {tasks.length > 0 ? (
            <TaskList tasks={tasks} />
          ) : (
            <p className="text-sm text-muted-foreground">No tasks yet.</p>
          )}
        </div>
      </details>
    </div>
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
    <section
      aria-label={`Activity of ${title}`}
      className="-mt-2 ml-12 flex min-w-0 flex-col gap-1"
    >
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
