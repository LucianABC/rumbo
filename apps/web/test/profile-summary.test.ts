import type { Experience } from '@rumbo/contracts';
import { describe, expect, it, vi } from 'vitest';

import { getMarket, getProfile, getProfileSummary, getRoadmap } from '../src/lib/data';
import { monthsWorked, relevantExperiences, summarize } from '../src/lib/profile-summary';

vi.mock('next/server', () => ({ connection: () => Promise.resolve() }));

const NOW = new Date('2026-10-22T12:00:00.000Z');
const NONE: ReadonlySet<string> = new Set();

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

  it('never ends a position before it starts when the end is only a year', () => {
    // "2020-03 – 2020": the bare year cannot end before March, so it counts as one month.
    expect(monthsWorked([job('a', '2020-03', '2020')], NOW)).toBe(1);
    expect(monthsWorked([job('a', '2020-03', '2021')], NOW)).toBe(11);
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

    expect(summarize(profile, NOW, NONE).currentRole).toEqual({
      title: 'Customer Support Specialist',
      organization: 'Northwind Software',
    });
    expect(summarize(closed, NOW, NONE).currentRole?.organization).toBe('Northwind Software');
    expect(summarize({ ...profile, experiences: [] }, NOW, NONE).currentRole).toBeNull();
  });

  it('takes the closed position that ended last, not the one that began last', async () => {
    const profile = await getProfile();
    const longer = job('experience-long', '2019-01', '2025-06');
    const shorter = job('experience-short', '2024-01', '2024-12');

    expect(
      summarize({ ...profile, experiences: [shorter, longer] }, NOW, NONE).currentRole?.title,
    ).toBe('experience-long');
  });

  it('lists the three skills with the most approved evidence, ignoring the rest', async () => {
    const summary = summarize(await getProfile(), NOW, NONE);

    expect(summary.strongestSkills).toHaveLength(3);
    expect(summary.strongestSkills[0]).toEqual({
      skill: { id: 'communication', name: 'Communication' },
      evidenceCount: 2,
    });
    expect(summary.strongestSkills.map((s) => s.skill.id)).not.toContain('requirements-analysis');
  });

  it('counts as relevant only positions that back a skill the targets ask for most', async () => {
    const profile = await getProfile();
    const unrelated = {
      ...profile,
      experiences: [...profile.experiences, job('experience-bakery', '2010-01', '2015-12')],
    };

    // Communication is cited by both support positions; the bakery job backs nothing.
    expect(relevantExperiences(unrelated, new Set(['communication'])).map((e) => e.id)).toEqual([
      'experience-current-job',
      'experience-call-center',
    ]);
    const summary = summarize(unrelated, NOW, new Set(['communication']));
    expect(summary.yearsOfExperience).toBeGreaterThan(summary.yearsOfRelevantExperience);
    expect(summary.yearsOfRelevantExperience).toBe(6);
  });

  it('ignores evidence awaiting approval when deciding what is relevant', async () => {
    const profile = await getProfile();

    // Requirements analysis is backed only by evidence the user has not approved yet.
    expect(relevantExperiences(profile, new Set(['requirements-analysis']))).toEqual([]);
    expect(
      summarize(profile, NOW, new Set(['requirements-analysis'])).yearsOfRelevantExperience,
    ).toBe(0);
  });

  it('serves the summary of the loaded profile', async () => {
    const roadmap = await getRoadmap();
    const [profile, market] = await Promise.all([getProfile(), getMarket(roadmap)]);
    const summary = getProfileSummary(profile, market, roadmap);

    expect(summary.name).toBe(profile.name);
    expect(summary.yearsOfExperience).toBeGreaterThan(0);
    // Every fictional position backs Communication, which all three targets ask for.
    expect(summary.yearsOfRelevantExperience).toBe(summary.yearsOfExperience);
  });
});
