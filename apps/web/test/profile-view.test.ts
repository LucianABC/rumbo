import type { Experience, Profile, ProfileSkill } from '@rumbo/contracts';
import { describe, expect, it } from 'vitest';

import { formatDuration, formatPartialDate } from '../src/lib/format';
import {
  completeness,
  educationPeriod,
  initials,
  lastImports,
  profileProvenance,
  skillGroups,
  type Suggestion,
  suggestions,
  timeline,
} from '../src/lib/profile/profile-view';
import type { Lane } from '../src/lib/roadmap/single-line';

const NOW = new Date('2026-11-04T12:00:00Z');

const position = (id: string, start: string, end: string | null): Experience => ({
  id,
  title: id,
  organization: 'Org',
  start,
  end,
  highlights: [],
});

const skill = (id: string, category: string, approvals: (string | null)[]): ProfileSkill => ({
  id,
  skill: { id, name: id },
  category,
  evidence: approvals.map((approvedAt, i) => ({
    id: `${id}-${String(i)}`,
    sourceType: 'manual',
    sourceRef: 'note',
    approvedAt,
  })),
});

describe('dates on the profile', () => {
  it('reads a partial date as written, never inventing a month', () => {
    expect(formatPartialDate('2023-02')).toBe('Feb 2023');
    expect(formatPartialDate('2019')).toBe('2019');
  });

  it('drops the part of a duration that is zero', () => {
    expect(formatDuration(45)).toBe('3 yrs 9 mos');
    expect(formatDuration(12)).toBe('1 yr');
    expect(formatDuration(1)).toBe('1 mo');
  });
});

describe('initials', () => {
  it('takes the first and last word', () => {
    expect(initials('Alex Rivera')).toBe('AR');
    expect(initials('Ana María de la Torre')).toBe('AT');
    expect(initials('alex')).toBe('A');
  });
});

describe('timeline', () => {
  it('puts open positions first, then the most recent start', () => {
    const order = timeline(
      [
        position('old', '2015-01', '2016-01'),
        position('recent', '2020-01', '2021-01'),
        position('now', '2018-01', null),
      ],
      NOW,
    ).map((p) => p.id);

    expect(order).toEqual(['now', 'recent', 'old']);
  });

  it('gives each position its period and length', () => {
    const [open, closed] = timeline(
      [position('open', '2023-02', null), position('closed', '2020-06', '2023-01')],
      NOW,
    );

    expect(open?.period).toBe('Feb 2023 – Present · 3 yrs 10 mos');
    expect(closed?.period).toBe('Jun 2020 – Jan 2023 · 2 yrs 8 mos');
  });
});

describe('educationPeriod', () => {
  it('shows what the entry has', () => {
    expect(educationPeriod('2017', '2019')).toBe('2017 – 2019');
    expect(educationPeriod(undefined, '2019-06')).toBe('Jun 2019');
    expect(educationPeriod()).toBeNull();
  });
});

describe('skillGroups', () => {
  it('groups by category in order of appearance and counts only approved evidence', () => {
    const groups = skillGroups([
      skill('a', 'Data', ['2026-10-01T00:00:00.000Z', null]),
      skill('b', 'Support', []),
      skill('c', 'Data', [null]),
    ]);

    expect(groups.map(([category]) => category)).toEqual(['Data', 'Support']);
    expect(groups[0]?.[1].map((r) => [r.skill.id, r.approved, r.awaiting])).toEqual([
      ['a', 1, 1],
      ['c', 0, 1],
    ]);
  });

  it('leads each category with its best-backed skills', () => {
    const approved = '2026-10-01T00:00:00.000Z';
    const [group] = skillGroups([
      skill('none', 'Data', []),
      skill('some', 'Data', [approved]),
      skill('most', 'Data', [approved, approved]),
      skill('waiting', 'Data', [null]),
    ]);

    expect(group?.[1].map((r) => r.skill.id)).toEqual(['most', 'some', 'waiting', 'none']);
  });
});

describe('profile sources', () => {
  const sources: Profile['sources'] = [
    { kind: 'cv', importedAt: '2026-09-01T00:00:00.000Z' },
    { kind: 'linkedin_export', importedAt: '2026-10-01T00:00:00.000Z' },
    { kind: 'cv', importedAt: '2026-08-01T00:00:00.000Z' },
  ];

  it('keeps the latest import of each kind', () => {
    expect(lastImports(sources)).toEqual({
      cv: '2026-09-01T00:00:00.000Z',
      linkedin_export: '2026-10-01T00:00:00.000Z',
    });
  });

  it('dates the profile in the provenance line', () => {
    expect(profileProvenance({ updatedAt: '2026-10-14T18:30:00.000Z' } as Profile)).toBe(
      'Updated 14 Oct 2026',
    );
  });
});

describe('suggestions', () => {
  const profile = {
    experiences: [position('job', '2020-01', null)],
    certifications: [],
  } as unknown as Profile;
  const lanes = [
    { target: { id: 'analyst', roleFamily: { name: 'Analyst' } }, color: 'line-1' },
  ] as unknown as Lane[];
  const base = {
    id: 'c',
    targetId: 'analyst',
    createdAt: '2026-10-15T09:00:00.000Z',
    completenessGain: 6,
    after: 'New text',
  };

  it('says what each change touches and who it is for, with its edit page', () => {
    const [headline, about, bullet, added] = suggestions(
      [
        { ...base, section: 'headline', before: 'Old' },
        { ...base, section: 'about', before: null },
        { ...base, section: 'experience', experienceId: 'job', before: 'Old' },
        { ...base, section: 'experience', experienceId: 'job', before: null },
      ],
      profile,
      lanes,
    );

    expect(headline?.place).toBe('Headline');
    expect(headline?.target).toEqual({ name: 'Analyst', color: 'line-1' });
    expect(headline?.date).toBe('15 Oct 2026');
    expect(headline?.gain).toBe(6);
    expect(about?.place).toBe('About');
    expect(bullet?.place).toBe('Bullet · job · Org');
    expect(added?.place).toBe('New bullet · job · Org');
    expect(bullet?.editUrl).toContain('/details/experience/');
  });

  it('skips a change for a target with no lane', () => {
    expect(
      suggestions(
        [{ ...base, targetId: 'nobody', section: 'headline', before: 'Old' }],
        profile,
        lanes,
      ),
    ).toEqual([]);
  });
});

describe('completeness', () => {
  const change = (id: string, gain: number) => ({ change: { id }, gain }) as unknown as Suggestion;
  const all = [change('a', 6), change('b', 8), change('c', 4)];

  it('shows what approving everything would reach', () => {
    expect(completeness(72, all, {})).toEqual({ now: 72, reachable: 90 });
  });

  it('counts an approval at once', () => {
    expect(completeness(72, all, { b: 'approved' })).toEqual({ now: 80, reachable: 90 });
  });

  it('takes a rejection off what is reachable', () => {
    expect(completeness(72, all, { b: 'rejected' })).toEqual({ now: 72, reachable: 82 });
  });

  it('never passes 100', () => {
    expect(completeness(96, all, { a: 'approved' })).toEqual({ now: 100, reachable: 100 });
  });
});
