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
  sharedDetail,
  marketProvenance,
  targetSummaries,
  type TargetSummary,
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
  const row = (asked: number, covered: number): TargetSummary => ({
    target: { id: 't', isPrimary: true, roleFamily: { id: 't', name: 'Tester', field: 'QA' } },
    color: 'line-1' as const,
    covered,
    asked,
    toClose: asked - covered,
    shared: [],
    sharedCount: 0,
    postings: 8,
    href: '/skills?target=t',
  });
  const render = (r: TargetSummary) =>
    renderToStaticMarkup(SummaryBand({ who, targets: [r], changeTargets: null }));

  it('links every coverage number and hides the meter from assistive tech', () => {
    const html = render({ ...row(4, 3), shared: [{ name: 'Other', count: 1 }], sharedCount: 1 });
    const tag = /<a [^>]*href="\/skills\?target=t"[^>]*>(.*?)<\/a>/.exec(html);
    const text = (tag?.[1] ?? '').replace(/<[^>]+>/g, '');

    expect(text).toContain('3/4 top skills');
    expect(text).toContain('1 to close, 1 shared');
    // Who shares them is in the tooltip, so the line stays short (#148).
    expect(tag?.[0]).toContain('title="Also missing for Other (1)"');
    expect(html).not.toContain('role="img"');
  });

  it('says there is not enough data instead of "0 of 0" when nothing reaches 30%', () => {
    const html = render(row(0, 0));

    expect(html).toContain('Not enough market data yet');
    expect(html).toContain('8 postings');
    expect(html).not.toContain('0/0');
    expect(html).not.toContain('nothing to close');
  });
});

describe('closingClause and sharedDetail (#112)', () => {
  it('counts shared gaps only when there are any, and says who shares them apart', () => {
    expect(closingClause({ toClose: 5, sharedCount: 0 })).toBe('5 to close');
    expect(closingClause({ toClose: 5, sharedCount: 2 })).toBe('5 to close, 2 shared');
    expect(closingClause({ toClose: 0, sharedCount: 0 })).toBe('nothing to close');

    expect(sharedDetail({ shared: [] })).toBeNull();
    expect(
      sharedDetail({
        shared: [
          { name: 'BA', count: 2 },
          { name: 'SL', count: 1 },
        ],
      }),
    ).toBe('Also missing for BA (2) and SL (1)');
  });

  it('counts each shared skill once across the other targets', async () => {
    const roadmap = await getRoadmap();
    const lanes = lanesOf(roadmap);
    const ids = lanes.map((l) => l.target.id);
    const entries = coverage(await getProfile(), await getMarket(roadmap), ids);

    for (const row of targetSummaries(lanes, entries)) {
      const others = new Set(
        entries.filter((c) => c.targetId !== row.target.id).flatMap((c) => c.missing),
      );
      const otherIds = new Set([...others].map((m) => m.skill.id));
      const mine = entries.find((c) => c.targetId === row.target.id)?.missing ?? [];
      expect(row.sharedCount).toBe(mine.filter((m) => otherIds.has(m.skill.id)).length);
      expect(row.sharedCount).toBeLessThanOrEqual(row.toClose);
    }
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
    gaps: [
      gap('only-b', ['b']),
      gap('shared', ['a', 'b']),
      gap('only-a', ['a']),
      // Already closed: it is not work that stays (#112).
      { ...gap('closed-a', ['a']), status: 'closed' },
    ],
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
