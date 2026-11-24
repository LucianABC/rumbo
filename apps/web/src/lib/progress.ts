import type { EvidenceRef, ItemStatus, ProjectItem, Roadmap, RoadmapItem } from '@rumbo/contracts';

import type { Decision } from './labels';

/**
 * The plan after the user's decisions on evidence (owner, #168): the one place progress is
 * derived, so every view that reads the result tells the same story. It returns a roadmap, so the
 * map, the station list, Projects, Skills & gaps and the badges derive from it unchanged.
 *
 * - Approving the evidence matched to a task completes that task; taking the approval back undoes it.
 * - A deliverable with tasks is done when all of them are, in progress when at least one is, and
 *   keeps its stored status when none is.
 * - A deliverable without tasks (education, work experience) and every gap keep their stored
 *   status: what completes or closes them is open for F3 (#43) and F5 (#45).
 * - A station's status is derived from its deliverables (milestoneStatus, packages/contracts).
 *
 * Decisions are keyed by evidence id. `now` stands in for the approval date until the feature
 * stores one.
 */
export function decidePlan(
  roadmap: Roadmap,
  decisions: Readonly<Record<string, Decision>>,
  now: string,
): Roadmap {
  return {
    ...roadmap,
    milestones: roadmap.milestones.map((milestone) => ({
      ...milestone,
      items: milestone.items.map((item) => decideItem(item, decisions, now)),
    })),
  };
}

function decideItem(
  item: RoadmapItem,
  decisions: Readonly<Record<string, Decision>>,
  now: string,
): RoadmapItem {
  const evidence = decidedEvidence(item.evidence, decisions, now);
  if (item.type !== 'project') return { ...item, evidence };
  const tasks = item.tasks.map((task) => ({
    ...task,
    done: task.done || evidence.some((e) => e.taskId === task.id && e.approvedAt !== null),
  }));
  return { ...item, evidence, tasks, status: projectStatus(item, tasks) };
}

function projectStatus(item: ProjectItem, tasks: ProjectItem['tasks']): ItemStatus {
  const done = tasks.filter((t) => t.done).length;
  if (done === 0) return item.status;
  return done === tasks.length ? 'done' : 'in_progress';
}

/**
 * Evidence after the decisions: an approval counts from `now` and a rejection stops being
 * evidence. A stored approval is the record, so no decision changes it.
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
