import type { Experience, Profile, ProfileSkill } from '@rumbo/contracts';
import { describe, expect, it } from 'vitest';

import { formatDuration, formatPartialDate } from '../src/lib/format';
import {
  completeness,
  educationPeriod,
  initials,
  lastImports,
  profileCompleteness,
  profileProvenance,
  profileSubtitle,
  skillGroups,
  type Suggestion,
  suggestionCount,
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

describe('profileSubtitle', () => {
  const positions = [position('Analyst', '2020-01', null)];

  it("prefers rumbo's subtitle, then the latest role, then the headline", () => {
    expect(profileSubtitle('Short line', positions, 'A | very | long | headline')).toBe(
      'Short line',
    );
    expect(profileSubtitle(undefined, positions, 'A | very | long | headline')).toBe(
      'Analyst · Org',
    );
    expect(profileSubtitle(undefined, [], 'Headline')).toBe('Headline');
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

describe('profileCompleteness', () => {
  const full = {
    headline: 'Pastry chef',
    about: 'Twelve years in kitchens.',
    linkedinUrl: 'https://www.linkedin.com/in/someone',
    experiences: [{ ...position('job', '2020-01', null), highlights: ['Fed 300 guests a day.'] }],
    education: [{ id: 'school', institution: 'School', credential: 'Diploma' }],
    certifications: [],
    languages: [{ name: 'Spanish', level: 'native' }],
    skills: [skill('baking', 'Kitchen', ['2026-10-01T00:00:00.000Z'])],
    sources: [],
  } as unknown as Profile;

  it('gives 100 to a profile that covers the whole rubric, in any trade', () => {
    expect(profileCompleteness(full)).toEqual({ percent: 100, next: null, todos: [] });
  });

  it('takes off what is missing and names the first thing to do', () => {
    const { about: _about, ...noAbout } = full;

    const { percent, next, todos } = profileCompleteness({ ...noAbout, languages: [] });

    expect(percent).toBe(85);
    expect(next).toBe('write your about section');
    expect(todos.map((t) => [t.id, t.points])).toEqual([
      ['about', 10],
      ['languages', 5],
    ]);
  });

  it('counts a bullet with a number, and needs them on half of the bullets', () => {
    const job = full.experiences[0] as Experience;
    const withBullets = (highlights: string[]) =>
      profileCompleteness({ ...full, experiences: [{ ...job, highlights }] });

    expect(withBullets(['Led 4 people.', 'Baked bread.']).percent).toBe(100);
    expect(withBullets(['Led 4 people.', 'Baked.', 'Cooked.']).percent).toBe(85);
  });

  it('always has a suggestion under 100%, whatever is missing', () => {
    const profiles = [
      { ...full, languages: [] },
      { ...full, linkedinUrl: undefined },
      { ...full, skills: [] },
      { ...full, experiences: [], education: [] },
    ] as unknown as Profile[];

    for (const profile of profiles) {
      const { percent, todos } = profileCompleteness(profile);
      expect(percent).toBeLessThan(100);
      expect(todos.length).toBeGreaterThan(0);
      expect(100 - todos.reduce((sum, t) => sum + t.points, 0)).toBe(percent);
    }
  });

  it('does not credit evidence awaiting approval, or an empty profile', () => {
    expect(profileCompleteness({ ...full, skills: [skill('a', 'Kitchen', [null])] }).percent).toBe(
      90,
    );
    expect(
      profileCompleteness({
        ...full,
        experiences: [],
        skills: [],
        education: [],
      }).percent,
    ).toBe(30);
  });
});

describe('suggestionCount', () => {
  it('adds the drafts and what the rubric misses, and survives either being unreadable', () => {
    const todo = { id: 'a', todo: 'do it', points: 5 };
    const completeness = { percent: 95, next: 'do it', todos: [todo] };

    expect(suggestionCount({ suggestions: [{} as Suggestion], completeness })).toBe(2);
    expect(suggestionCount({ suggestions: null, completeness })).toBe(1);
    expect(suggestionCount({ suggestions: null, completeness: null })).toBe(0);
  });
});
