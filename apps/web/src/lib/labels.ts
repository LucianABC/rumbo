import type { Gap, ItemStatus, RoadmapItem } from '@rumbo/contracts';

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
  project: 'practice project',
  education: 'education',
  work_experience: 'work experience',
};

/** Evidence is either waiting for the user (AI rule 2) or approved. */
export function evidenceStatusLabel(approvedAt: string | null): string {
  return approvedAt === null ? 'awaiting approval' : 'approved';
}
