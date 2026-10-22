import type { Profile } from '@rumbo/contracts';
import type { Market, MarketSnapshotView } from '@rumbo/contracts/provisional';
import { describe, expect, it, vi } from 'vitest';

import { ASKED_CAP, askedForMost, coverage, skillsAskedForMost } from '../src/lib/coverage';
import { getMarket, getProfile, getRoadmap } from '../src/lib/data';

vi.mock('next/server', () => ({ connection: () => Promise.resolve() }));

const skill = (id: string) => ({ id, name: id.toUpperCase() });

function snapshot(targetId: string, shares: Record<string, number>): MarketSnapshotView {
  return {
    id: `snap-${targetId}`,
    targetId,
    roleFamily: { id: targetId, name: targetId, field: 'Field' },
    region: 'Remote',
    checkedAt: '2026-10-01T00:00:00.000Z',
    postingCount: 100,
    skills: Object.entries(shares)
      .map(([id, share]) => ({ skill: skill(id), share }))
      .sort((a, b) => b.share - a.share),
  };
}

function profileWith(skills: Record<string, 'approved' | 'awaiting'>): Profile {
  return {
    name: 'Sam',
    headline: 'Example',
    experiences: [],
    education: [],
    certifications: [],
    languages: [],
    skills: Object.entries(skills).map(([id, state]) => ({
      id: `ps-${id}`,
      skill: skill(id),
      category: 'Any',
      evidence: [
        {
          id: `ev-${id}`,
          sourceType: 'manual',
          sourceRef: 'note',
          approvedAt: state === 'approved' ? '2026-10-01T00:00:00.000Z' : null,
        },
      ],
    })),
    sources: [],
    updatedAt: '2026-10-01T00:00:00.000Z',
  };
}

describe('coverage (#145)', () => {
  it('asks for the skills in at least 30% of postings, most asked first', () => {
    const asked = askedForMost(snapshot('a', { sql: 0.3, python: 0.29, viz: 0.8 }));

    expect(asked.map((s) => s.skill.id)).toEqual(['viz', 'sql']);
  });

  it('caps the skills asked for most at 12', () => {
    const many = Object.fromEntries(
      Array.from({ length: 20 }, (_, i) => [`s${String(i)}`, 0.9 - i / 100]),
    );

    expect(askedForMost(snapshot('a', many))).toHaveLength(ASKED_CAP);
  });

  it('joins the skills every given target asks for most', () => {
    const market: Market = {
      snapshots: [snapshot('a', { sql: 0.7, viz: 0.2 }), snapshot('b', { stats: 0.5 })],
    };

    expect([...skillsAskedForMost(market, ['a', 'b'])].sort()).toEqual(['sql', 'stats']);
    expect([...skillsAskedForMost(market, ['b'])]).toEqual(['stats']);
  });

  it('counts a skill as covered only with approved evidence', () => {
    const market: Market = { snapshots: [snapshot('a', { sql: 0.7, viz: 0.5, stats: 0.4 })] };
    const [a] = coverage(profileWith({ sql: 'approved', viz: 'awaiting' }), market, ['a']);

    expect(a?.covered.map((s) => s.skill.id)).toEqual(['sql']);
    expect(a?.missing.map((s) => s.skill.id)).toEqual(['viz', 'stats']);
  });

  it('says how many missing skills each other target shares, in the order given', () => {
    const market: Market = {
      snapshots: [
        snapshot('a', { sql: 0.7, viz: 0.5, stats: 0.4 }),
        snapshot('b', { viz: 0.6, stats: 0.5 }),
        snapshot('c', { sql: 0.9 }),
      ],
    };
    const result = coverage(profileWith({ sql: 'approved' }), market, ['b', 'a', 'c', 'missing']);

    expect(result.map((r) => r.targetId)).toEqual(['b', 'a', 'c']);
    expect(result.find((r) => r.targetId === 'a')?.sharedWith).toEqual([
      { targetId: 'b', count: 2 },
    ]);
    expect(result.find((r) => r.targetId === 'c')?.sharedWith).toEqual([]);
  });
});

describe('profile and market mocks agree with the roadmap mock', () => {
  it('every gap demand matches its snapshot: same target, share and posting count', async () => {
    const [roadmap, market] = await Promise.all([getRoadmap(), getMarket()]);

    for (const gap of roadmap.gaps) {
      for (const demand of gap.demand) {
        const snap = market.snapshots.find((s) => s.id === demand.snapshotId);
        expect(snap?.targetId).toBe(demand.targetId);
        expect(snap?.postingCount).toBe(demand.postingCount);
        expect(snap?.skills.find((s) => s.skill.id === gap.skill.id)?.share).toBe(demand.share);
      }
    }
  });

  it("every skill a target asks for most and the profile lacks is one of that target's gaps", async () => {
    const [roadmap, market, profile] = await Promise.all([getRoadmap(), getMarket(), getProfile()]);
    const result = coverage(
      profile,
      market,
      roadmap.targets.map((t) => t.id),
    );

    expect(result).toHaveLength(roadmap.targets.length);
    for (const target of result) {
      const gaps = roadmap.gaps
        .filter((g) => g.demand.some((d) => d.targetId === target.targetId))
        .map((g) => g.skill.id);
      for (const missing of target.missing) expect(gaps).toContain(missing.skill.id);
    }
  });

  it('every roadmap evidence that cites an experience cites one the profile has', async () => {
    const [roadmap, profile] = await Promise.all([getRoadmap(), getProfile()]);
    const experiences = new Set(profile.experiences.map((e) => e.id));
    const cited = roadmap.milestones
      .flatMap((m) => m.items.flatMap((i) => i.evidence))
      .filter((e) => e.sourceType === 'experience');

    expect(cited.length).toBeGreaterThan(0);
    for (const e of cited) expect(experiences).toContain(e.sourceRef);
  });
});
