import type { RoadmapItem } from '@rumbo/contracts';
import { BriefcaseBusiness, FolderGit2, GraduationCap, type LucideIcon } from 'lucide-react';

/** One icon per item type. Decoration only: the type's name is always shown beside it (#149). */
export const ITEM_ICON: Readonly<Record<RoadmapItem['type'], LucideIcon>> = {
  project: FolderGit2,
  education: GraduationCap,
  work_experience: BriefcaseBusiness,
};
