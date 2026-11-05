import { z } from 'zod';

import { Id } from '../ids.js';
import { CommitSha, type Roadmap } from '../roadmap.js';

/**
 * Provisional (spec 01, #114): what happened in each project's repo, as Projects reads it until
 * the F5 spec (#45) decides the real shape.
 */

export const ProjectCommit = z.object({
  sha: CommitSha,
  /** Written in the user's repo: external content, shown as plain text and never followed. */
  message: z.string().min(1),
  committedAt: z.iso.datetime(),
});
export type ProjectCommit = z.infer<typeof ProjectCommit>;

export const ProjectActivity = z.object({
  /** The project item in the roadmap. */
  itemId: Id,
  lastPushAt: z.iso.datetime(),
  /** Newest first. */
  commits: z.array(ProjectCommit),
});
export type ProjectActivity = z.infer<typeof ProjectActivity>;

export const Progress = z.object({
  syncedAt: z.iso.datetime(),
  projects: z.array(ProjectActivity),
});
export type Progress = z.infer<typeof Progress>;

/** Problems tying the activity to this roadmap; empty when every entry is one of its projects. */
export function checkProgress(progress: Progress, roadmap: Roadmap): string[] {
  const items = roadmap.milestones.flatMap((m) => m.items);
  const seen = new Set<string>();
  return progress.projects.flatMap(({ itemId }) => {
    const item = items.find((i) => i.id === itemId);
    const problems: string[] = [];
    if (item?.type !== 'project') problems.push(`activity for "${itemId}", not a project item`);
    else if (item.repo === undefined) problems.push(`activity for "${itemId}", which has no repo`);
    if (seen.has(itemId)) problems.push(`activity for "${itemId}" appears twice`);
    seen.add(itemId);
    return problems;
  });
}
