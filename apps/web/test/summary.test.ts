import { deriveRoadmapView, type Roadmap, type RoadmapItem } from '@rumbo/contracts';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { SummaryBand } from '../src/components/roadmap/summary-band';
import { coverage } from '../src/lib/coverage';
import { getMarket, getProfile, getRoadmap, getTargetColors } from '../src/lib/data';
import { singleLine } from '../src/lib/roadmap/single-line';
import {
  changePreview,
  closingClause,
  marketProvenance,
  targetSummaries,
} from '../src/lib/roadmap/summary';

vi.mock('next/server', () => ({ connection: () => Promise.resolve() }));

function lanesOf(roadmap: Roadmap) {
  return singleLine(roadmap, deriveRoadmapView(roadmap), getTargetColors(roadmap, null)).lanes;
}

describe('targetSummaries (#112)', () => {
  it('matches coverage() for every target of the mock, primary first', async () => {
    const roadmap = await getRoadmap();
    const market = await getMarket(roadmap);
    const lanes = lanesOf(roadmap);
    const ids = lanes.map((l) => l.target.id);
    const expected = coverage(await getProfile(), market, ids);

    const rows = targetSummaries(lanes, expected);

    expect(rows.map((r) => r.target.id)).toEqual(ids);
    expect(rows[0]?.target.isPrimary).toBe(true);
    rows.forEach((row, i) => {
      const c = expected[i];
      expect(row.covered).toBe(c?.covered.length);
      expect(row.asked).toBe(c?.asked.length);
      expect(row.toClose).toBe(c?.missing.length);
      expect(row.href).toBe(`/skills?target=${row.target.id}`);
      expect(row.postings).toBe(c?.snapshot.postingCount);
    });
  });
});

describe('SummaryBand (#112)', () => {
  const who = {
    name: 'Sam',
    currentRole: null,
    yearsOfExperience: 2,
    yearsOfRelevantExperience: 1,
    strongestSkills: [],
  };
  const row = (asked: number, covered: number) => ({
    target: { id: 't', isPrimary: true, roleFamily: { id: 't', name: 'Tester', field: 'QA' } },
    color: 'line-1' as const,
    covered,
    asked,
    toClose: asked - covered,
    shared: [],
    postings: 8,
    href: '/skills?target=t',
  });
  const render = (r: ReturnType<typeof row>) =>
    renderToStaticMarkup(SummaryBand({ who, targets: [r], changeTargets: null }));

  it('links the coverage numbers and hides the meter from assistive tech', () => {
    const html = render(row(4, 3));

    expect(html).toContain('href="/skills?target=t"');
    expect(html).toContain('3 of 4 skills');
    expect(html).not.toContain('role="img"');
  });

  it('says there is not enough data instead of "0 of 0" when nothing reaches 30%', () => {
    const html = render(row(0, 0));

    expect(html).toContain('Not enough market data yet');
    expect(html).toContain('8 postings');
    expect(html).not.toContain('0 of 0');
    expect(html).not.toContain('nothing to close');
  });
});

describe('closingClause (#112)', () => {
  it('names shared gaps only when there are any', () => {
    expect(closingClause({ toClose: 5, shared: [] })).toBe('5 to close');
    expect(closingClause({ toClose: 5, shared: [{ name: 'BA', count: 2 }] })).toBe(
      '5 to close, 2 shared with BA',
    );
    expect(
      closingClause({
        toClose: 5,
        shared: [
          { name: 'BA', count: 2 },
          { name: 'SL', count: 1 },
        ],
      }),
    ).toBe('5 to close, 2 shared with BA and 1 with SL');
    expect(closingClause({ toClose: 0, shared: [] })).toBe('nothing to close');
  });
});

describe('marketProvenance (#112)', () => {
  it('adds up postings and keeps the latest check', async () => {
    const market = await getMarket(await getRoadmap());
    const p = marketProvenance(market);

    expect(p?.postings).toBe(market.snapshots.reduce((n, s) => n + s.postingCount, 0));
    expect(p?.checkedAt).toBe(
      market.snapshots
        .map((s) => s.checkedAt)
        .sort()
        .at(-1),
    );
    expect(marketProvenance({ snapshots: [] })).toBeNull();
  });
});

describe('changePreview (#112)', () => {
  const target = (id: string, isPrimary: boolean) => ({
    id,
    isPrimary,
    roleFamily: { id, name: id, field: 'Field' },
  });
  const gap = (id: string, targetIds: string[]) => ({
    id,
    skill: { id, name: id },
    priority: 1,
    rationale: 'Because',
    status: 'open' as const,
    demand: targetIds.map((targetId) => ({
      targetId,
      snapshotId: `snap-${targetId}`,
      share: 0.4,
      postingCount: 10,
    })),
  });
  const item = (id: string, status: RoadmapItem['status'], gapIds: string[]): RoadmapItem => ({
    id,
    type: 'work_experience',
    context: 'Work',
    title: id,
    doneWhen: 'Done',
    status,
    gapIds,
    evidence: [],
  });

  const roadmap: Roadmap = {
    from: 'Now',
    updatedAt: '2026-10-22T00:00:00.000Z',
    targets: [target('a', true), target('b', false)],
    gaps: [gap('only-b', ['b']), gap('shared', ['a', 'b']), gap('only-a', ['a'])],
    milestones: [
      {
        id: 'm',
        title: 'M',
        items: [
          item('pending-b', 'pending', ['only-b']),
          item('done-b', 'done', ['only-b']),
          item('mixed', 'in_progress', ['only-b', 'shared']),
          item('a', 'pending', ['only-a']),
        ],
      },
    ],
  };

  it('drops the last non-primary target and classifies gaps and items', () => {
    const lanes = lanesOf(roadmap);
    const preview = changePreview(roadmap, lanes);

    expect(preview?.dropped.id).toBe('b');
    expect(preview?.gapsGone.map((g) => g.gap.id)).toEqual(['only-b']);
    expect(preview?.gapsKept).toBe(2);
    expect(Object.fromEntries(preview?.items.map((i) => [i.item.id, i.outcome]) ?? [])).toEqual({
      'pending-b': 'dropped',
      'done-b': 'not_needed',
      mixed: 'kept',
      a: 'kept',
    });
  });

  it('is null with a single target', () => {
    const single = { ...roadmap, targets: [target('a', true)], gaps: [gap('only-a', ['a'])] };
    const items = [item('a', 'pending', ['only-a'])];
    const one: Roadmap = { ...single, milestones: [{ id: 'm', title: 'M', items }] };

    expect(changePreview(one, lanesOf(one))).toBeNull();
  });
});
