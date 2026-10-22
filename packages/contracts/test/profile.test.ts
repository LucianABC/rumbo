import { describe, expect, it } from 'vitest';

import { PartialDate, Profile } from '../src/index.js';
import { Market } from '../src/provisional/index.js';

const base = {
  name: 'Sam Example',
  headline: 'Example headline',
  experiences: [
    {
      id: 'experience-a',
      title: 'Analyst',
      organization: 'Example Org',
      start: '2021-03',
      end: null,
      highlights: [],
    },
  ],
  education: [],
  certifications: [],
  languages: [],
  skills: [
    {
      id: 'ps-sql',
      skill: { id: 'sql', name: 'SQL' },
      category: 'Data',
      evidence: [
        {
          id: 'ev-sql',
          sourceType: 'experience',
          sourceRef: 'experience-a',
          approvedAt: '2026-10-01T00:00:00.000Z',
        },
      ],
    },
  ],
  sources: [],
  updatedAt: '2026-10-01T00:00:00.000Z',
};

const messages = (input: unknown) => {
  const result = Profile.safeParse(input);
  return result.success ? [] : result.error.issues.map((i) => i.message);
};

describe('Profile (#145)', () => {
  it('accepts a profile whose evidence points at its own experiences', () => {
    expect(messages(base)).toEqual([]);
  });

  it('accepts a year or a year and month, nothing else', () => {
    for (const ok of ['2021', '2021-01', '2021-12'])
      expect(PartialDate.safeParse(ok).success).toBe(true);
    for (const bad of ['2021-13', '2021-1', '21', '2021-03-04']) {
      expect(PartialDate.safeParse(bad).success).toBe(false);
    }
  });

  it('rejects evidence that points at an experience the profile does not have', () => {
    const skill = base.skills[0];
    const broken = {
      ...base,
      skills: [
        { ...skill, evidence: [{ ...skill?.evidence[0], sourceRef: 'experience-missing' }] },
      ],
    };

    expect(messages(broken)).toContain(
      'evidence "ev-sql" references unknown experience "experience-missing"',
    );
  });

  it('rejects a position that ends before it starts', () => {
    const experience = { ...base.experiences[0], end: '2020-12' };

    expect(messages({ ...base, experiences: [experience] })).toContain(
      'experience "experience-a" ends before it starts',
    );
  });

  it('rejects duplicate ids and the same catalog skill twice', () => {
    const skill = base.skills[0];
    const twice = { ...base, skills: [skill, { ...skill, evidence: [] }] };

    expect(messages(twice)).toEqual(
      expect.arrayContaining(['duplicate skills id "ps-sql"', 'duplicate skills id "sql"']),
    );
  });
});

describe('Market (provisional, #145)', () => {
  const snapshot = {
    id: 'snap-a',
    targetId: 'target-a',
    roleFamily: { id: 'analyst', name: 'Analyst', field: 'Analytics' },
    region: 'Remote',
    checkedAt: '2026-10-01T00:00:00.000Z',
    postingCount: 10,
    skills: [
      { skill: { id: 'sql', name: 'SQL' }, share: 0.6 },
      { skill: { id: 'python', name: 'Python' }, share: 0.4 },
    ],
  };
  const issues = (input: unknown) => {
    const result = Market.safeParse(input);
    return result.success ? [] : result.error.issues.map((i) => i.message);
  };

  it('accepts one snapshot per target with skills most asked first', () => {
    expect(issues({ snapshots: [snapshot] })).toEqual([]);
  });

  it('rejects skills out of order, listed twice, or a target with two snapshots', () => {
    const reversed = { ...snapshot, skills: [...snapshot.skills].reverse() };
    const twice = { ...snapshot, skills: [...snapshot.skills, snapshot.skills[1]] };

    expect(issues({ snapshots: [reversed] })[0]).toMatch(/ordered by share/);
    expect(issues({ snapshots: [twice] })).toContain('skill "python" is listed twice');
    expect(issues({ snapshots: [snapshot, { ...snapshot, id: 'snap-b' }] })).toContain(
      'target "target-a" has more than one snapshot',
    );
  });
});
