import { deriveRoadmapView, type Roadmap } from '@rumbo/contracts';
import { describe, expect, it, vi } from 'vitest';

import { getRoadmap, getRoadmapLayout, getTargetColors } from '../src/lib/data';
import { formatDay } from '../src/lib/format';
import {
  joinNames,
  ORIGIN_ID,
  laneOrder,
  type SingleLineRow,
  singleLine,
  stationLabel,
} from '../src/lib/roadmap/single-line';

vi.mock('next/server', () => ({ connection: () => Promise.resolve() }));

async function lineFor(roadmap?: Roadmap) {
  const data = roadmap ?? (await getRoadmap());
  const colors = getTargetColors(data, await getRoadmapLayout(data));
  return { roadmap: data, line: singleLine(data, deriveRoadmapView(data), colors) };
}

function row(rows: readonly SingleLineRow[], id: string): SingleLineRow {
  const found = rows.find((r) => r.id === id);
  if (!found) throw new Error(`no row ${id}`);
  return found;
}

function cell(r: SingleLineRow, targetId: string) {
  const found = r.cells.find((c) => c.lane.target.id === targetId);
  if (!found) throw new Error(`no lane ${targetId}`);
  return found;
}

describe('single line (#108)', () => {
  it('puts the primary target in the first lane', async () => {
    const { roadmap, line } = await lineFor();
    const reordered = { ...roadmap, targets: [...roadmap.targets].reverse() };

    expect(line.lanes[0]?.target.isPrimary).toBe(true);
    expect(laneOrder(reordered)[0]?.isPrimary).toBe(true);
  });

  it('lists the starting point, milestones in plan order, then one terminal per target', async () => {
    const { roadmap, line } = await lineFor();

    expect(line.rows.map((r) => r.id)).toEqual([
      ORIGIN_ID,
      ...roadmap.milestones.map((m) => m.id),
      ...line.lanes.map((l) => l.target.id),
    ]);
    expect(line.rows.filter((r) => r.kind === 'terminal')).toHaveLength(roadmap.targets.length);
  });

  it('takes each lane color from the layout', async () => {
    const { line } = await lineFor();

    expect(line.lanes.map((l) => [l.target.id, l.color])).toEqual([
      ['data-analyst', 'line-1'],
      ['business-analyst', 'line-2'],
      ['support-ops-lead', 'line-3'],
    ]);
  });

  it('marks the current station and its targets, in lane order', async () => {
    const { line } = await lineFor();
    const current = line.rows.filter((r) => r.kind === 'milestone' && r.current);

    expect(current.map((r) => r.id)).toEqual(['weekly-report']);
    const weekly = row(line.rows, 'weekly-report');
    expect(weekly.kind === 'milestone' && weekly.serves.map((t) => t.id)).toEqual([
      'data-analyst',
      'business-analyst',
      'support-ops-lead',
    ]);
  });

  it('draws a stretch as traveled once the stop it leaves is done', async () => {
    const { line } = await lineFor();
    const weekly = row(line.rows, 'weekly-report');

    // query-basics is done, weekly-report is in progress.
    expect(cell(weekly, 'data-analyst').top).toBe('traveled');
    expect(cell(weekly, 'data-analyst').bottom).toBe('ahead');
    // Every line leaves the starting point, which the user has already left.
    expect(cell(row(line.rows, 'query-basics'), 'data-analyst').top).toBe('traveled');
  });

  it('passes through stations a target does not stop at', async () => {
    const { line } = await lineFor();
    const teamCapacity = row(line.rows, 'team-capacity');

    expect(cell(teamCapacity, 'support-ops-lead').stop).toBe(true);
    expect(cell(teamCapacity, 'data-analyst')).toMatchObject({
      stop: false,
      top: 'ahead',
      bottom: 'ahead',
    });
  });

  it('ends each lane at its own terminal', async () => {
    const { line } = await lineFor();
    const daTerminal = row(line.rows, 'data-analyst');
    const baTerminal = row(line.rows, 'business-analyst');

    expect(cell(daTerminal, 'data-analyst')).toMatchObject({ stop: true, bottom: null });
    expect(cell(baTerminal, 'data-analyst')).toMatchObject({
      stop: false,
      top: null,
      bottom: null,
    });
    expect(cell(daTerminal, 'business-analyst')).toMatchObject({ stop: false, top: 'ahead' });
  });

  it('starts every lane at the starting point, passing through until its first stop', async () => {
    const roadmap = await getRoadmap();
    // Support Operations Lead no longer needs SQL, so its first stop is further down the plan.
    const later: Roadmap = {
      ...roadmap,
      gaps: roadmap.gaps.map((g) =>
        g.id === 'sql'
          ? { ...g, demand: g.demand.filter((d) => d.targetId !== 'support-ops-lead') }
          : g,
      ),
    };
    const { line } = await lineFor(later);
    const route = deriveRoadmapView(later).routes.get('support-ops-lead') ?? [];
    const first = line.rows.findIndex((r) => r.id === route[0]);

    expect(cell(row(line.rows, ORIGIN_ID), 'support-ops-lead')).toMatchObject({
      stop: true,
      top: null,
      bottom: 'traveled',
    });
    expect(first).toBeGreaterThan(1);
    for (const r of line.rows.slice(1, first)) {
      expect(cell(r, 'support-ops-lead')).toMatchObject({
        stop: false,
        top: 'traveled',
        bottom: 'traveled',
      });
    }
    expect(cell(row(line.rows, route[0] ?? ''), 'support-ops-lead')).toMatchObject({
      stop: true,
      top: 'traveled',
    });
  });

  it('marks a terminal reached only when its whole route is done', async () => {
    const { roadmap, line } = await lineFor();
    const done: Roadmap = {
      ...roadmap,
      milestones: roadmap.milestones.map((m) => ({
        ...m,
        items: m.items.map((i) => ({ ...i, status: 'done' as const })),
      })),
    };

    expect(line.rows.some((r) => r.kind === 'terminal' && r.reached)).toBe(false);
    const after = (await lineFor(done)).line;
    expect(after.rows.filter((r) => r.kind === 'terminal').every((r) => r.reached)).toBe(true);
  });
});

describe('station names', () => {
  it('reads title, status, targets and "you are here", as in the spec', async () => {
    const { line } = await lineFor();

    expect(stationLabel(row(line.rows, 'weekly-report'))).toBe(
      'Own the weekly support report, in progress, serves Data Analyst, Business Analyst and Support Operations Lead, you are here',
    );
    expect(stationLabel(row(line.rows, 'team-capacity'))).toBe(
      "Plan the team's capacity, pending, serves Support Operations Lead",
    );
  });

  it('names the starting point', async () => {
    const { roadmap, line } = await lineFor();

    expect(stationLabel(row(line.rows, ORIGIN_ID))).toBe(`${roadmap.from}, starting point`);
  });

  it('names a terminal as a target role', async () => {
    const { line } = await lineFor();

    expect(stationLabel(row(line.rows, 'data-analyst'))).toBe('Data Analyst, target role, primary');
    expect(stationLabel(row(line.rows, 'business-analyst'))).toBe('Business Analyst, target role');
  });

  it('joins names without an Oxford comma', () => {
    expect(joinNames([])).toBe('');
    expect(joinNames(['A'])).toBe('A');
    expect(joinNames(['A', 'B'])).toBe('A and B');
    expect(joinNames(['A', 'B', 'C'])).toBe('A, B and C');
  });
});

describe('formatDay', () => {
  it('writes day, three-letter month and year, in UTC', () => {
    expect(formatDay('2026-09-30')).toBe('30 Sep 2026');
    expect(formatDay('2027-01-01')).toBe('1 Jan 2027');
  });
});
