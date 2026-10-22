import type { Experience } from '@rumbo/contracts';
import { describe, expect, it, vi } from 'vitest';

import { getProfile, getProfileSummary } from '../src/lib/data';
import { monthsWorked, summarize } from '../src/lib/profile-summary';

vi.mock('next/server', () => ({ connection: () => Promise.resolve() }));

const NOW = new Date('2026-10-22T12:00:00.000Z');

function job(id: string, start: string, end: string | null): Experience {
  return { id, title: id, organization: 'Org', start, end, highlights: [] };
}

describe('monthsWorked (#145)', () => {
  it('counts both ends of a position, so one month in is one month', () => {
    expect(monthsWorked([job('a', '2021-03', '2021-03')], NOW)).toBe(1);
    expect(monthsWorked([job('a', '2021-01', '2021-12')], NOW)).toBe(12);
  });

  it('counts overlapping positions once and gaps between them not at all', () => {
    const overlap = [job('a', '2020-01', '2020-12'), job('b', '2020-07', '2021-06')];
    const gap = [job('a', '2018-01', '2018-12'), job('b', '2020-01', '2020-12')];

    expect(monthsWorked(overlap, NOW)).toBe(18);
    expect(monthsWorked(gap, NOW)).toBe(24);
  });

  it('runs an open position up to now and reads a bare year as January', () => {
    expect(monthsWorked([job('a', '2026-01', null)], NOW)).toBe(10);
    expect(monthsWorked([job('a', '2025', '2025')], NOW)).toBe(1);
  });
});

describe('summarize (#145)', () => {
  it('takes the open position as the current role, and the latest one without it', async () => {
    const profile = await getProfile();
    const closed = {
      ...profile,
      experiences: profile.experiences.map((e) => ({ ...e, end: e.end ?? '2026-06' })),
    };

    expect(summarize(profile, NOW).currentRole).toEqual({
      title: 'Customer Support Specialist',
      organization: 'Northwind Software',
    });
    expect(summarize(closed, NOW).currentRole?.organization).toBe('Northwind Software');
    expect(summarize({ ...profile, experiences: [] }, NOW).currentRole).toBeNull();
  });

  it('lists the three skills with the most approved evidence, ignoring the rest', async () => {
    const summary = summarize(await getProfile(), NOW);

    expect(summary.strongestSkills).toHaveLength(3);
    expect(summary.strongestSkills[0]).toEqual({
      skill: { id: 'communication', name: 'Communication' },
      evidenceCount: 2,
    });
    expect(summary.strongestSkills.map((s) => s.skill.id)).not.toContain('requirements-analysis');
  });

  it('serves the summary of the loaded profile', async () => {
    const summary = await getProfileSummary();

    expect(summary.name).toBe((await getProfile()).name);
    expect(summary.yearsOfExperience).toBeGreaterThan(0);
  });
});
