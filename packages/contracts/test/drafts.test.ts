import { describe, expect, it } from 'vitest';

import { checkDrafts, DraftChange, Drafts } from '../src/provisional/index.js';
import type { Profile } from '../src/profile.js';
import type { Roadmap } from '../src/roadmap.js';

const profile = {
  headline: 'Support specialist',
  experiences: [{ id: 'job', highlights: ['Answered tickets.'] }],
} as Profile;
const roadmap = { targets: [{ id: 'analyst' }] } as Roadmap;

const headline = {
  id: 'change-1',
  section: 'headline',
  targetId: 'analyst',
  createdAt: '2026-10-15T09:00:00.000Z',
  completenessGain: 5,
  before: 'Support specialist',
  after: 'Support specialist moving into analysis',
} as const;

const check = (...changes: DraftChange[]) => checkDrafts({ changes }, profile, roadmap);

describe('DraftChange', () => {
  it('needs the position a bullet belongs to', () => {
    const bullet = { ...headline, section: 'experience' };

    expect(DraftChange.safeParse(bullet).success).toBe(false);
    expect(DraftChange.safeParse({ ...bullet, experienceId: 'job' }).success).toBe(true);
  });

  it('allows new text for an about or a bullet, never for a headline', () => {
    const fresh = { ...headline, before: null };

    expect(DraftChange.safeParse(fresh).success).toBe(false);
    expect(DraftChange.safeParse({ ...fresh, section: 'about' }).success).toBe(true);
  });
});

describe('Drafts', () => {
  it('rejects two changes with one id', () => {
    const result = Drafts.safeParse({ changes: [headline, headline] });

    expect(result.error?.issues[0]?.message).toBe('duplicate change id "change-1"');
  });
});

describe('checkDrafts', () => {
  it('accepts changes that fit the profile and the roadmap', () => {
    expect(
      check(
        headline,
        { ...headline, id: 'change-2', section: 'about', before: null },
        {
          ...headline,
          id: 'change-3',
          section: 'experience',
          experienceId: 'job',
          before: 'Answered tickets.',
        },
        { ...headline, id: 'change-4', section: 'experience', experienceId: 'job', before: null },
      ),
    ).toEqual([]);
  });

  it('flags a target the roadmap does not have', () => {
    expect(check({ ...headline, targetId: 'nobody' })).toEqual([
      'change "change-1" is for unknown target "nobody"',
    ]);
  });

  it.each([
    ['headline', { ...headline, before: 'Old headline' }],
    ['about', { ...headline, section: 'about', before: 'Old about' }],
    ['bullet', { ...headline, section: 'experience', experienceId: 'job', before: 'Old bullet.' }],
    ['position', { ...headline, section: 'experience', experienceId: 'other-job', before: null }],
  ] as const)('flags a change to a %s the profile no longer has', (_name, change) => {
    expect(check(change)).toEqual(['change "change-1" replaces text that is not in the profile']);
  });
});
