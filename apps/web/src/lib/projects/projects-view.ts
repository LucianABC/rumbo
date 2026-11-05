import type {
  EvidenceRef,
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
 * The Projects tab as data (docs/product/views.md, #114): one card per project item, in plan
 * order, finished ones apart. Pure, so every rule is unit-tested here.
 */

export interface ProjectGap {
  readonly id: string;
  readonly name: string;
}

export interface ProjectCard {
  readonly item: ProjectItem;
  readonly milestone: Milestone;
  readonly stationHref: string;
  readonly gaps: readonly ProjectGap[];
  /** The targets those gaps serve, primary first. */
  readonly lanes: readonly Lane[];
  /** "example-user/sales-dashboard", or null when no repo is linked. */
  readonly repoName: string | null;
  /** The newest of the repo's last push and the item's own date; null before any progress. */
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
  const cards = roadmap.milestones.flatMap((milestone) =>
    milestone.items.flatMap((item): ProjectCard[] => {
      if (item.type !== 'project') return [];
      const gaps = roadmap.gaps.filter((g) => item.gapIds.includes(g.id));
      const served = new Set(gaps.flatMap((g) => g.demand.map((d) => d.targetId)));
      const activity = progress?.projects.find((p) => p.itemId === item.id);
      return [
        {
          item,
          milestone,
          stationHref: stationHref(milestone.id, null, view),
          gaps: gaps.map((g) => ({ id: g.id, name: g.skill.name })),
          lanes: lanes.filter((lane) => served.has(lane.target.id)),
          repoName: item.repo ? repoName(item.repo) : null,
          lastActivity: newest(activity?.lastPushAt, item.lastProgressAt),
          commits: activity?.commits ?? [],
        },
      ];
    }),
  );
  return {
    active: cards.filter((c) => c.item.status !== 'done'),
    completed: cards.filter((c) => c.item.status === 'done'),
  };
}

/** The path of a repo URL, which reads the same on any host. */
function repoName(repo: string): string {
  return new URL(repo).pathname.replace(/^\/|\/$/g, '') || repo;
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
  const { item, commits } = card;
  return [...item.evidence]
    .sort((a, b) => Number(a.approvedAt !== null) - Number(b.approvedAt !== null))
    .map((evidence) => ({
      evidence,
      name: evidenceName(evidence),
      href: evidenceHref(evidence, item.repo),
      message:
        evidence.sourceType === 'commit'
          ? (commits.find((c) => c.sha === evidence.sourceRef)?.message ?? null)
          : null,
      taskTitle: item.tasks.find((t) => t.id === evidence.taskId)?.title ?? null,
    }));
}

function evidenceName({ sourceType, sourceRef }: EvidenceRef): string {
  const label = EVIDENCE_SOURCE_LABEL[sourceType];
  return sourceType === 'commit' ? `${label} ${sourceRef.slice(0, 7)}` : label;
}

/** Only a commit in a linked repo or a URL the contract checked is ever a link. */
function evidenceHref({ sourceType, sourceRef }: EvidenceRef, repo?: string): string | null {
  if (sourceType === 'commit') return repo ? `${repo}/commit/${sourceRef}` : null;
  return sourceType === 'project' || sourceType === 'education' ? sourceRef : null;
}
