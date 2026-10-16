import { z } from 'zod';

/**
 * One user's plan as the roadmap view reads it (spec 01, ADR 0004): active targets, the gaps the
 * market says they need, and milestones whose typed items close those gaps. Geometry lives in
 * `RoadmapLayout`; interchanges, routes and statuses are derived in `roadmap-derive.ts`.
 */

const Id = z.string().regex(/^[a-z0-9-]+$/);
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

export const EvidenceRef = z.object({
  id: Id,
  sourceType: z.enum(['experience', 'project', 'commit', 'education', 'manual']),
  /** Commit SHA, certificate URL, experience id… */
  sourceRef: z.string().min(1),
  excerpt: z.string().optional(),
  /** Null until the user approves it (AI rule 2). */
  approvedAt: z.iso.datetime().nullable(),
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
  url: z.url().optional(),
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
  ];
  for (const [name, ids] of collections) {
    for (const id of duplicates(ids)) issue(`duplicate ${name} id "${id}"`, [name]);
  }

  if (roadmap.targets.filter((t) => t.isPrimary).length !== 1) {
    issue('exactly one target must be primary', ['targets']);
  }

  roadmap.gaps.forEach((gap, i) => {
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
    if (!items.some((item) => item.gapIds.includes(gap.id))) {
      issue(`gap "${gap.id}" has no roadmap item`, ['gaps', i]);
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
      // Closing a gap needs evidence, not a ticked box (ADR 0004).
      if (item.status === 'done' && !item.evidence.some((e) => e.approvedAt !== null)) {
        issue(`item "${item.id}" is done without approved evidence`, ['milestones', i, 'items', j]);
      }
    });
    const served = milestone.items.some((item) =>
      item.gapIds.some((gapId) => (gaps.get(gapId)?.demand.length ?? 0) > 0),
    );
    if (!served) issue(`milestone "${milestone.id}" serves no target`, ['milestones', i]);
  });
});
export type Roadmap = z.infer<typeof Roadmap>;
