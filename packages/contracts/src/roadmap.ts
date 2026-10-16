import { z } from 'zod';

import { Id, WebUrl } from './ids.js';
import { deriveRoadmapView } from './roadmap-derive.js';

/**
 * One user's plan as the roadmap view reads it (spec 01, ADR 0004): active targets, the gaps the
 * market says they need, and milestones whose typed items close those gaps. Geometry lives in
 * `RoadmapLayout`; interchanges, routes and statuses are derived in `roadmap-derive.ts`.
 */

const IsoDate = z.iso.date();

/** Catalog entries are global (ADR 0004); the view carries only what the UI shows. */
export const SkillRef = z.object({ id: Id, name: z.string().min(1) });
export type SkillRef = z.infer<typeof SkillRef>;

export const RoleFamilyRef = z.object({
  id: Id,
  name: z.string().min(1),
  field: z.string().min(1),
});
export type RoleFamilyRef = z.infer<typeof RoleFamilyRef>;

export const Target = z.object({
  id: Id,
  roleFamily: RoleFamilyRef,
  isPrimary: z.boolean(),
  seniority: z.string().optional(),
  workMode: z.enum(['remote', 'hybrid', 'onsite']).optional(),
  region: z.string().optional(),
});
export type Target = z.infer<typeof Target>;

/** Why a target needs a gap: how often its market snapshot asks for the skill (GapTarget). */
export const GapDemand = z.object({
  targetId: Id,
  snapshotId: Id,
  share: z.number().min(0).max(1),
  postingCount: z.int().min(1),
});
export type GapDemand = z.infer<typeof GapDemand>;

export const Gap = z.object({
  id: Id,
  skill: SkillRef,
  /** 1 is the highest priority. */
  priority: z.int().min(1),
  rationale: z.string().min(1),
  status: z.enum(['open', 'in_progress', 'closed']),
  demand: z.array(GapDemand).min(1),
});
export type Gap = z.infer<typeof Gap>;

const CommitSha = z.string().regex(/^[0-9a-f]{7,40}$/);

export const EvidenceRef = z
  .object({
    id: Id,
    sourceType: z.enum(['experience', 'project', 'commit', 'education', 'manual']),
    /**
     * Depends on `sourceType`: a commit SHA, an http(s) URL for project and education proof, an
     * experience id, or free text for manual entries (never rendered as a link).
     */
    sourceRef: z.string().min(1),
    excerpt: z.string().optional(),
    /** Null until the user approves it (AI rule 2). */
    approvedAt: z.iso.datetime().nullable(),
  })
  .superRefine((evidence, ctx) => {
    const format = {
      commit: CommitSha,
      project: WebUrl,
      education: WebUrl,
      experience: Id,
      manual: z.string(),
    }[evidence.sourceType];
    if (!format.safeParse(evidence.sourceRef).success) {
      ctx.addIssue({
        code: 'custom',
        message: `evidence "${evidence.id}" has a sourceRef that is not a valid ${evidence.sourceType} reference`,
        path: ['sourceRef'],
      });
    }
  });
export type EvidenceRef = z.infer<typeof EvidenceRef>;

export const ItemStatus = z.enum(['pending', 'in_progress', 'done']);
export type ItemStatus = z.infer<typeof ItemStatus>;

export const Task = z.object({ id: Id, title: z.string().min(1), done: z.boolean() });
export type Task = z.infer<typeof Task>;

const ItemBase = z.object({
  id: Id,
  title: z.string().min(1),
  /** Verifiable completion criterion (ADR 0004). */
  doneWhen: z.string().min(1),
  status: ItemStatus,
  gapIds: z.array(Id).min(1),
  evidence: z.array(EvidenceRef),
  expectedEnd: IsoDate.optional(),
  lastProgressAt: IsoDate.optional(),
});

export const ProjectItem = ItemBase.extend({
  type: z.literal('project'),
  repo: z.string().optional(),
  tasks: z.array(Task),
});
export type ProjectItem = z.infer<typeof ProjectItem>;

export const EducationItem = ItemBase.extend({
  type: z.literal('education'),
  kind: z.enum(['course', 'workshop', 'degree', 'certification']),
  provider: z.string().min(1),
  url: WebUrl.optional(),
});
export type EducationItem = z.infer<typeof EducationItem>;

export const WorkExperienceItem = ItemBase.extend({
  type: z.literal('work_experience'),
  context: z.string().min(1),
});
export type WorkExperienceItem = z.infer<typeof WorkExperienceItem>;

export const RoadmapItem = z.discriminatedUnion('type', [
  ProjectItem,
  EducationItem,
  WorkExperienceItem,
]);
export type RoadmapItem = z.infer<typeof RoadmapItem>;

export const Milestone = z.object({
  id: Id,
  title: z.string().min(1),
  summary: z.string().optional(),
  items: z.array(RoadmapItem).min(1),
});
export type Milestone = z.infer<typeof Milestone>;

const RoadmapShape = z.object({
  /** Starting point, e.g. the current role from the profile. */
  from: z.string().min(1),
  /** Active targets only (F2b: at most three, one primary). */
  targets: z.array(Target).min(1).max(3),
  gaps: z.array(Gap),
  /** In plan order. */
  milestones: z.array(Milestone).min(1),
  updatedAt: z.iso.datetime(),
});

function duplicates(ids: readonly string[]): string[] {
  return [...new Set(ids.filter((id, i) => ids.indexOf(id) !== i))];
}

export const Roadmap = RoadmapShape.superRefine((roadmap, ctx) => {
  const issue = (message: string, path: (string | number)[]) => {
    ctx.addIssue({ code: 'custom', message, path });
  };

  const items = roadmap.milestones.flatMap((m) => m.items);
  const targetIds = new Set(roadmap.targets.map((t) => t.id));
  const gaps = new Map(roadmap.gaps.map((g) => [g.id, g]));

  const collections: [string, string[]][] = [
    ['targets', roadmap.targets.map((t) => t.id)],
    ['gaps', roadmap.gaps.map((g) => g.id)],
    ['milestones', roadmap.milestones.map((m) => m.id)],
    ['items', items.map((i) => i.id)],
    ['evidence', items.flatMap((i) => i.evidence.map((e) => e.id))],
  ];
  for (const [name, ids] of collections) {
    for (const id of duplicates(ids)) issue(`duplicate ${name} id "${id}"`, [name]);
  }
  // Terminals are drawn as stations, so target and milestone ids share the map's namespace.
  for (const milestone of roadmap.milestones) {
    if (targetIds.has(milestone.id)) {
      issue(`milestone "${milestone.id}" has the same id as a target`, ['milestones']);
    }
  }

  if (roadmap.targets.filter((t) => t.isPrimary).length !== 1) {
    issue('exactly one target must be primary', ['targets']);
  }

  roadmap.gaps.forEach((gap, i) => {
    for (const id of duplicates(gap.demand.map((d) => d.targetId))) {
      issue(`gap "${gap.id}" lists target "${id}" twice`, ['gaps', i, 'demand']);
    }
    gap.demand.forEach((d, j) => {
      if (!targetIds.has(d.targetId)) {
        issue(`gap "${gap.id}" references unknown target "${d.targetId}"`, [
          'gaps',
          i,
          'demand',
          j,
        ]);
      }
    });
    // F3 rule (ADR 0004): no gap without a way to close it.
    const closing = items.filter((item) => item.gapIds.includes(gap.id));
    if (closing.length === 0) {
      issue(`gap "${gap.id}" has no roadmap item`, ['gaps', i]);
      return;
    }
    // The stored status must agree with the items that close the gap.
    const started = closing.some((item) => item.status !== 'pending');
    const done = closing.some((item) => item.status === 'done');
    const consistent = { open: !started, in_progress: started, closed: done }[gap.status];
    if (!consistent) {
      issue(`gap "${gap.id}" is ${gap.status} but its items disagree`, ['gaps', i, 'status']);
    }
  });

  roadmap.milestones.forEach((milestone, i) => {
    milestone.items.forEach((item, j) => {
      item.gapIds.forEach((gapId, k) => {
        if (!gaps.has(gapId)) {
          issue(`item "${item.id}" closes unknown gap "${gapId}"`, [
            'milestones',
            i,
            'items',
            j,
            'gapIds',
            k,
          ]);
        }
      });
      if (item.type === 'project') {
        for (const id of duplicates(item.tasks.map((t) => t.id))) {
          issue(`item "${item.id}" lists task "${id}" twice`, [
            'milestones',
            i,
            'items',
            j,
            'tasks',
          ]);
        }
      }
      // Closing a gap needs evidence, not a ticked box (ADR 0004).
      if (item.status === 'done' && !item.evidence.some((e) => e.approvedAt !== null)) {
        issue(`item "${item.id}" is done without approved evidence`, ['milestones', i, 'items', j]);
      }
    });
  });

  const view = deriveRoadmapView(roadmap);
  roadmap.milestones.forEach((milestone, i) => {
    if (view.targetsByMilestone.get(milestone.id)?.length === 0) {
      issue(`milestone "${milestone.id}" serves no target`, ['milestones', i]);
    }
  });
});
export type Roadmap = z.infer<typeof Roadmap>;
