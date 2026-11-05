import type {
  EvidenceRef,
  ItemStatus,
  Milestone,
  ProjectItem,
  Roadmap,
  RoadmapView,
  Task,
} from '@rumbo/contracts';
import type { Progress, ProjectCommit } from '@rumbo/contracts/provisional';

import { EVIDENCE_SOURCE_LABEL, type Decision } from '../labels';
import type { Lane } from '../roadmap/single-line';
import { stationHref } from '../skills/skills-view';

/**
 * The Projects tab as data (docs/product/views.md, #114): one card per project, in plan order,
 * finished ones apart. A project is its repo: roadmap items on the same repo are deliverables of one
 * project, not projects of their own (owner, #114), and an item with no repo stands alone. Pure,
 * so every rule is unit-tested here.
 */

export interface ProjectGap {
  readonly id: string;
  readonly name: string;
}

/** One roadmap item of a project, with the station it belongs to. */
export interface ProjectDeliverable {
  readonly item: ProjectItem;
  readonly milestone: Milestone;
  readonly stationHref: string;
  /** What this deliverable closes: tasks have no gaps of their own, they serve their item's (ADR 0004). */
  readonly gaps: readonly ProjectGap[];
  /** The targets those gaps serve, primary first: the lines this deliverable's tasks move forward. */
  readonly lanes: readonly Lane[];
}

export interface ProjectCard {
  /** The first deliverable's item id, also the card's anchor. */
  readonly id: string;
  /** The item's title, or the repo's name once several items share it. */
  readonly title: string;
  readonly status: ItemStatus;
  readonly repo: string | null;
  /** In plan order; at least one. */
  readonly deliverables: readonly ProjectDeliverable[];
  /** The latest date among the deliverables still open; null when none has one. */
  readonly expectedEnd: string | null;
  /** The targets those gaps serve, primary first. */
  readonly lanes: readonly Lane[];
  /** "github.com/example-user/sales-dashboard", any host; null when no repo is linked. */
  readonly repoName: string | null;
  /** The newest of the repo's last push and the items' own dates; null before any progress. */
  readonly lastActivity: string | null;
  /** Newest first; empty when there are none or the activity could not be read. */
  readonly commits: readonly ProjectCommit[];
}

export interface ProjectsView {
  readonly active: readonly ProjectCard[];
  readonly completed: readonly ProjectCard[];
}

export function projectsView(
  roadmap: Roadmap,
  view: RoadmapView,
  lanes: readonly Lane[],
  progress: Progress | null,
): ProjectsView {
  const byProject = new Map<string, ProjectDeliverable[]>();
  for (const milestone of roadmap.milestones) {
    for (const item of milestone.items) {
      if (item.type !== 'project') continue;
      const key = item.repo ? repoKey(item.repo) : `item:${item.id}`;
      const closes = roadmap.gaps.filter((g) => item.gapIds.includes(g.id));
      const served = new Set(closes.flatMap((g) => g.demand.map((d) => d.targetId)));
      const deliverable = {
        item,
        milestone,
        stationHref: stationHref(milestone.id, null, view),
        gaps: closes.map((g) => ({ id: g.id, name: g.skill.name })),
        lanes: lanes.filter((lane) => served.has(lane.target.id)),
      };
      byProject.set(key, [...(byProject.get(key) ?? []), deliverable]);
    }
  }

  const cards = [...byProject.values()].flatMap((deliverables): ProjectCard[] => {
    const [first] = deliverables;
    if (!first) return [];
    const items = deliverables.map((s) => s.item);
    const gapIds = new Set(items.flatMap((i) => i.gapIds));
    const gaps = roadmap.gaps.filter((g) => gapIds.has(g.id));
    const served = new Set(gaps.flatMap((g) => g.demand.map((d) => d.targetId)));
    const activity = (progress?.projects ?? []).filter((p) => items.some((i) => i.id === p.itemId));
    const repo = first.item.repo ?? null;
    const open = items.flatMap((i) =>
      i.status !== 'done' && i.expectedEnd ? [i.expectedEnd] : [],
    );
    return [
      {
        id: first.item.id,
        title: deliverables.length > 1 && repo ? repoTitle(repo) : first.item.title,
        status: projectStatus(items),
        repo,
        deliverables,
        expectedEnd: newest(...open),
        lanes: lanes.filter((lane) => served.has(lane.target.id)),
        repoName: repo ? repoName(repo) : null,
        lastActivity: newest(
          ...activity.map((a) => a.lastPushAt),
          ...items.map((i) => i.lastProgressAt),
        ),
        commits: mergeCommits(activity.flatMap((a) => a.commits)),
      },
    ];
  });
  return {
    active: cards.filter((c) => c.status !== 'done'),
    completed: cards.filter((c) => c.status === 'done'),
  };
}

/** All deliverables done → done; any started → in progress; otherwise pending, like a milestone. */
function projectStatus(items: readonly ProjectItem[]): ItemStatus {
  if (items.every((i) => i.status === 'done')) return 'done';
  return items.some((i) => i.status !== 'pending') ? 'in_progress' : 'pending';
}

/** The same repo, however its URL was written. */
function repoKey(repo: string): string {
  return repoName(repo)
    .replace(/\.git$/, '')
    .toLowerCase();
}

/** "rumbo" from "github.com/owner/rumbo". */
function repoTitle(repo: string): string {
  return (
    repoName(repo)
      .replace(/\.git$/, '')
      .split('/')
      .at(-1) ?? repo
  );
}

/** A commit once however many deliverables list it, newest first. */
function mergeCommits(commits: readonly ProjectCommit[]): ProjectCommit[] {
  return [...new Map(commits.map((c) => [c.sha, c])).values()].sort(
    (a, b) => Date.parse(b.committedAt) - Date.parse(a.committedAt),
  );
}

/** A repo URL without its scheme, so the host says where it lives: GitHub, GitLab or any other. */
function repoName(repo: string): string {
  return repo.replace(/^https?:\/\//, '').replace(/\/$/, '');
}

function newest(...dates: readonly (string | undefined)[]): string | null {
  const known = dates.flatMap((d) => (d === undefined ? [] : [d]));
  return known.sort((a, b) => Date.parse(b) - Date.parse(a))[0] ?? null;
}

/** A task as the card shows it: approving evidence is what completes it (AI rule 2). */
export interface TaskRow extends Task {
  /** Evidence matched to this open task, still waiting for the user. */
  readonly awaitingEvidence: boolean;
}

export function taskRows(
  item: ProjectItem,
  decisions: Readonly<Record<string, Decision>>,
): TaskRow[] {
  return item.tasks.map((task) => {
    const proof = item.evidence.filter((e) => e.taskId === task.id);
    const done = task.done || proof.some((e) => decisionOf(e, decisions) === 'approved');
    return {
      ...task,
      done,
      awaitingEvidence: !done && proof.some((e) => decisionOf(e, decisions) === 'awaiting'),
    };
  });
}

/** "AE" for AI Engineer: goes with a line's color, so color is never the only cue (views.md). */
export function lineInitials(name: string): string {
  return name
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase())
    .join('');
}

/** Every roadmap item is one deliverable on Projects, whatever card it sits in. */
export function projectAnchor(itemId: string): string {
  return `project-${itemId}`;
}

/** What the sample Check repo now reports: it analyzes nothing, and says so (F5, #45). */
export function repoCheckResult(commitCount: number): string {
  const seen =
    commitCount === 0
      ? 'No commits to review'
      : `${String(commitCount)} recent ${commitCount === 1 ? 'commit' : 'commits'} seen`;
  return `Sample check: ${seen}. The real analysis arrives with F5.`;
}

/** Where a roadmap item lives on Projects. */
export function projectHref(itemId: string): string {
  return `/projects#${projectAnchor(itemId)}`;
}

/**
 * Evidence after this visit's decisions, so Roadmap says what Projects says: an approval counts
 * from now and a rejection stops being evidence. `approvedAt` is the decision's stand-in until the
 * feature stores one.
 */
export function decidedEvidence(
  evidence: readonly EvidenceRef[],
  decisions: Readonly<Record<string, Decision>>,
  now: string,
): EvidenceRef[] {
  return evidence.flatMap((e) => {
    const decision = decisionOf(e, decisions);
    if (decision === 'rejected') return [];
    return [decision === 'approved' && e.approvedAt === null ? { ...e, approvedAt: now } : e];
  });
}

/** Stored approval first: it is the record; a decision on this visit only covers the rest. */
export function decisionOf(
  evidence: EvidenceRef,
  decisions: Readonly<Record<string, Decision>>,
): Decision | 'awaiting' {
  if (evidence.approvedAt !== null) return 'approved';
  return decisions[evidence.id] ?? 'awaiting';
}

export interface EvidenceRow {
  readonly evidence: EvidenceRef;
  /** "Commit a3f9c21": names it for the buttons, so each reads alone. */
  readonly name: string;
  readonly href: string | null;
  /** The commit's own message, when the activity has it. */
  readonly message: string | null;
  readonly taskTitle: string | null;
}

/** Awaiting first, then in the order the agent found it: what needs the user stays on top. */
export function evidenceRows(card: ProjectCard): EvidenceRow[] {
  const { deliverables, repo, commits } = card;
  return deliverables
    .flatMap(({ item }) =>
      item.evidence.map((evidence) => ({
        evidence,
        name: evidenceName(evidence),
        href: evidenceHref(evidence, repo),
        message:
          evidence.sourceType === 'commit'
            ? (commits.find((c) => c.sha === evidence.sourceRef)?.message ?? null)
            : null,
        taskTitle: item.tasks.find((t) => t.id === evidence.taskId)?.title ?? null,
      })),
    )
    .sort(
      (a, b) => Number(a.evidence.approvedAt !== null) - Number(b.evidence.approvedAt !== null),
    );
}

function evidenceName({ sourceType, sourceRef }: EvidenceRef): string {
  const label = EVIDENCE_SOURCE_LABEL[sourceType];
  return sourceType === 'commit' ? `${label} ${sourceRef.slice(0, 7)}` : label;
}

/** Only a commit in a linked repo or a URL the contract checked is ever a link. */
function evidenceHref({ sourceType, sourceRef }: EvidenceRef, repo: string | null): string | null {
  if (sourceType === 'commit') return repo ? `${repo}/commit/${sourceRef}` : null;
  return sourceType === 'project' || sourceType === 'education' ? sourceRef : null;
}
