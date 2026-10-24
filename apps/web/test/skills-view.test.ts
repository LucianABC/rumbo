import { deriveRoadmapView, type Profile, type RoadmapView } from '@rumbo/contracts';
import type { MarketSnapshotView } from '@rumbo/contracts/provisional';
import { describe, expect, it, vi } from 'vitest';

import { coverage } from '../src/lib/coverage';
import { getMarket, getProfile, getRoadmap, getTargetColors } from '../src/lib/data';
import { lanesOf } from '../src/lib/roadmap/single-line';
import {
  gapCards,
  haveSkills,
  isStale,
  marketTargetId,
  marketView,
  stationHref,
} from '../src/lib/skills/skills-view';

vi.mock('next/server', () => ({ connection: () => Promise.resolve() }));

const NOW = new Date('2026-10-23T12:00:00.000Z');

async function loaded() {
  const roadmap = await getRoadmap();
  const [profile, market] = await Promise.all([getProfile(), getMarket(roadmap)]);
  const lanes = lanesOf(roadmap, getTargetColors(roadmap, null));
  return { roadmap, profile, market, lanes, view: deriveRoadmapView(roadmap) };
}

function snapshot(shares: Record<string, number>, checkedAt = '2026-10-20T00:00:00.000Z') {
  return {
    id: 'snap-t',
    targetId: 't',
    roleFamily: { id: 't', name: 'T', field: 'Field' },
    region: 'Remote',
    checkedAt,
    postingCount: 50,
    skills: Object.entries(shares).map(([id, share]) => ({ skill: { id, name: id }, share })),
  } satisfies MarketSnapshotView;
}

function profileWith(skills: Record<string, readonly (string | null)[]>): Profile {
  return {
    name: 'Sam',
    headline: 'Example',
    experiences: [],
    education: [],
    certifications: [],
    languages: [],
    skills: Object.entries(skills).map(([id, approvals]) => ({
      id: `ps-${id}`,
      skill: { id, name: id },
      category: 'Any',
      evidence: approvals.map((approvedAt, i) => ({
        id: `ev-${id}-${String(i)}`,
        sourceType: 'manual' as const,
        sourceRef: 'note',
        approvedAt,
      })),
    })),
    sources: [],
    updatedAt: '2026-10-01T00:00:00.000Z',
  };
}

const APPROVED = '2026-10-01T00:00:00.000Z';
const gap = (id: string, status: 'open' | 'in_progress' | 'closed' = 'open') => ({
  id: `gap-${id}`,
  skill: { id, name: id },
  priority: 1,
  rationale: 'Because.',
  status,
  demand: [{ targetId: 't', snapshotId: 'snap-t', share: 0.5, postingCount: 50 }],
});

describe('marketTargetId', () => {
  it('takes a known target, else the primary', async () => {
    const { roadmap } = await loaded();
    const primary = roadmap.targets.find((t) => t.isPrimary)?.id;
    const other = roadmap.targets.find((t) => !t.isPrimary)?.id;
    expect(marketTargetId(roadmap, other)).toBe(other);
    expect(marketTargetId(roadmap, undefined)).toBe(primary);
    expect(marketTargetId(roadmap, 'nobody')).toBe(primary);
    expect(marketTargetId(roadmap, [other ?? '', other ?? ''])).toBe(primary);
  });
});

describe('isStale', () => {
  it('flags snapshots older than 30 days', () => {
    expect(isStale('2026-09-24T12:00:00.000Z', NOW)).toBe(false);
    expect(isStale('2026-09-22T12:00:00.000Z', NOW)).toBe(true);
  });
});

describe('marketView', () => {
  it('splits asked-for-most from the rest with one continuous rank', () => {
    const view = marketView(snapshot({ a: 0.7, b: 0.4, c: 0.3, d: 0.29 }), null, [], NOW);
    expect(view.asked.map((r) => [r.rank, r.skill.id])).toEqual([
      [1, 'a'],
      [2, 'b'],
      [3, 'c'],
    ]);
    expect(view.less.map((r) => [r.rank, r.skill.id])).toEqual([[4, 'd']]);
  });

  it('marks what the user has, what a gap covers and what nothing covers', () => {
    const profile = profileWith({ a: [APPROVED, APPROVED, null], b: [null], c: [APPROVED] });
    const view = marketView(
      snapshot({ a: 0.7, b: 0.6, c: 0.5, d: 0.4 }),
      profile,
      [gap('b'), gap('c', 'in_progress')],
      NOW,
    );
    const marks = Object.fromEntries(view.asked.map((r) => [r.skill.id, r.mark]));
    // Only approved evidence counts (AI rule 2).
    expect(marks.a).toEqual({ kind: 'have', evidenceCount: 2, gap: null });
    expect(marks.b).toEqual({ kind: 'gap', gap: { id: 'gap-b', status: 'open' } });
    // Covered and still worked on: both, so neither the evidence nor the plan is hidden.
    expect(marks.c).toEqual({
      kind: 'have',
      evidenceCount: 1,
      gap: { id: 'gap-c', status: 'in_progress' },
    });
    expect(marks.d).toEqual({ kind: 'missing' });
  });

  it('marks nothing without a profile', () => {
    const view = marketView(snapshot({ a: 0.7 }), null, [gap('a')], NOW);
    expect(view.asked[0]?.mark).toEqual({ kind: 'unknown' });
  });

  it('agrees with the coverage the Roadmap band shows', async () => {
    const { roadmap, profile, market } = await loaded();
    const ids = roadmap.targets.map((t) => t.id);
    for (const entry of coverage(profile, market, ids)) {
      const view = marketView(entry.snapshot, profile, roadmap.gaps, NOW);
      expect(view.asked).toHaveLength(entry.asked.length);
      expect(view.asked.filter((r) => r.mark.kind === 'have')).toHaveLength(entry.covered.length);
    }
  });
});

describe('gapCards', () => {
  it('lists gaps by priority with demand in lane order and the selected target marked', async () => {
    const { roadmap, view, lanes } = await loaded();
    const selected = lanes[1]?.target.id ?? '';
    const cards = gapCards(roadmap, view, lanes, selected);

    expect(cards.map((c) => c.gap.priority)).toEqual(
      [...roadmap.gaps].map((g) => g.priority).sort((a, b) => a - b),
    );
    const laneIds = lanes.map((l) => l.target.id);
    for (const card of cards) {
      const order = card.demand.map((d) => laneIds.indexOf(d.lane.target.id));
      expect(order).toEqual([...order].sort((a, b) => a - b));
      expect(card.sharedBy).toBe(card.gap.demand.length);
      for (const d of card.demand) expect(d.selected).toBe(d.lane.target.id === selected);
      // F3 rule: every gap has a way to close it, and each links to its station.
      expect(card.items.length).toBeGreaterThan(0);
      for (const { item, milestone, href } of card.items) {
        expect(item.gapIds).toContain(card.gap.id);
        expect(href).toContain(`station=${milestone.id}`);
      }
    }
  });
});

describe('stationHref', () => {
  const served: RoadmapView = {
    targetsByMilestone: new Map([['m1', ['a', 'b']]]),
    routes: new Map(),
    statusByMilestone: new Map(),
    currentMilestoneId: null,
  };

  it('opens the station on the selected line when it serves it', () => {
    expect(stationHref('m1', 'b', served)).toBe('/roadmap?line=b&station=m1');
  });

  it('falls back to the first target the station serves', () => {
    expect(stationHref('m1', 'z', served)).toBe('/roadmap?line=a&station=m1');
  });

  it('opens the station alone when it serves nobody known', () => {
    expect(stationHref('m9', 'a', served)).toBe('/roadmap?station=m9');
  });
});

describe('haveSkills', () => {
  it('puts counted skills first, then the most asked, then by name', async () => {
    const { lanes, market } = await loaded();
    const target = lanes[0]?.target.id ?? '';
    const shares = market.snapshots.find((s) => s.targetId === target)?.skills ?? [];
    const top = shares[0]?.skill.id ?? '';
    const profile = profileWith({
      zeta: [APPROVED],
      [top]: [APPROVED],
      alpha: [APPROVED],
      waiting: [null],
    });

    const list = haveSkills(profile, market, lanes);

    expect(list.map((s) => s.skill.skill.id)).toEqual([top, 'alpha', 'zeta', 'waiting']);
    expect(list[0]?.demand?.[0]?.lane.target.id).toBe(target);
    expect(list.at(-1)?.approved).toBe(0);
  });

  it('has no demand without market data', async () => {
    const { lanes } = await loaded();
    const [entry] = haveSkills(profileWith({ a: [APPROVED] }), null, lanes);
    expect(entry?.demand).toBeNull();
  });
});
