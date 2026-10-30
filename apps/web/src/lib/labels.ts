import type { EducationItem, EvidenceRef, Gap, ItemStatus, RoadmapItem } from '@rumbo/contracts';

/**
 * The status vocabulary every tab shares (docs/product/views.md, #102): one wording per status,
 * so the map, Skills & gaps and Projects never drift apart.
 */

export const ITEM_STATUS_LABEL: Readonly<Record<ItemStatus, string>> = {
  pending: 'pending',
  in_progress: 'in progress',
  done: 'done',
};

export const GAP_STATUS_LABEL: Readonly<Record<Gap['status'], string>> = {
  open: 'open',
  in_progress: 'in progress',
  closed: 'closed',
};

export const ITEM_TYPE_LABEL: Readonly<Record<RoadmapItem['type'], string>> = {
  project: 'Practice project',
  education: 'Education',
  work_experience: 'Work experience',
};

/** What an item is, as every view names it (#149): education says which kind. */
export function itemKindLabel(item: RoadmapItem): string {
  return item.type === 'education' ? EDUCATION_KIND_LABEL[item.kind] : ITEM_TYPE_LABEL[item.type];
}

/** Evidence is either waiting for the user (AI rule 2) or approved. */
export function evidenceStatusLabel(approvedAt: string | null): string {
  return approvedAt === null ? 'awaiting approval' : 'approved';
}

/** Where a piece of evidence comes from, as the station sheet names it (#109). */
export const EVIDENCE_SOURCE_LABEL: Readonly<Record<EvidenceRef['sourceType'], string>> = {
  commit: 'Commit',
  project: 'Project',
  experience: 'Work experience',
  education: 'Education',
  certification: 'Certification',
  manual: 'Added by you',
};

export const EDUCATION_KIND_LABEL: Readonly<Record<EducationItem['kind'], string>> = {
  course: 'Course',
  workshop: 'Workshop',
  degree: 'Degree',
  certification: 'Certification',
};
