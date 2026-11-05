import { describe, expect, it } from 'vitest';

import { checkProgress, Progress } from '../src/provisional/index.js';
import type { Roadmap } from '../src/roadmap.js';

const at = '2026-10-14T18:30:00.000Z';
const activity = { lastPushAt: at, commits: [] };

const roadmap = {
  milestones: [
    {
      items: [
        { id: 'linked', type: 'project', repo: 'https://example.com/repo' },
        { id: 'unlinked', type: 'project' },
        { id: 'course', type: 'education' },
      ],
    },
  ],
} as unknown as Roadmap;

function check(...itemIds: string[]): string[] {
  const projects = itemIds.map((itemId) => ({ ...activity, itemId }));
  return checkProgress({ syncedAt: at, projects }, roadmap);
}

describe('Progress', () => {
  it('only takes commits with a real SHA', () => {
    const commit = { sha: 'a3f9c21', message: 'add tests', committedAt: at };
    const parse = (sha: string) =>
      Progress.safeParse({
        syncedAt: at,
        projects: [{ ...activity, itemId: 'linked', commits: [{ ...commit, sha }] }],
      }).success;

    expect(parse('a3f9c21')).toBe(true);
    expect(parse('not a sha')).toBe(false);
  });
});

describe('checkProgress', () => {
  it('accepts activity for a project with a repo', () => {
    expect(check('linked')).toEqual([]);
  });

  it('flags activity for anything else', () => {
    expect(check('ghost')).toEqual(['activity for "ghost", not a project item']);
    expect(check('course')).toEqual(['activity for "course", not a project item']);
    expect(check('unlinked')).toEqual(['activity for "unlinked", which has no repo']);
  });

  it('flags a project listed twice', () => {
    expect(check('linked', 'linked')).toEqual(['activity for "linked" appears twice']);
  });
});
