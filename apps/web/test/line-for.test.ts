import { deriveRoadmapView, type RoadmapView } from '@rumbo/contracts';
import { describe, expect, it, vi } from 'vitest';

import { getRoadmap, getRoadmapLayout, getTargetColors } from '../src/lib/data';
import {
  lineCurrent,
  lineFor,
  ORIGIN_ID,
  selectedStationId,
  selectedTargetId,
  singleLine,
} from '../src/lib/roadmap/single-line';
import { subwayMap } from '../src/lib/roadmap/subway-map';

vi.mock('next/server', () => ({ connection: () => Promise.resolve() }));

async function setup() {
  const roadmap = await getRoadmap();
  const layout = await getRoadmapLayout(roadmap);
  const colors = getTargetColors(roadmap, layout);
  const view = deriveRoadmapView(roadmap);
  return { roadmap, layout, colors, view, line: singleLine(roadmap, view, colors) };
}

describe('lineFor (#148)', () => {
  it("keeps one lane and only the rows the target's line stops at", async () => {
    const { roadmap, view, line } = await setup();

    for (const target of roadmap.targets) {
      const own = lineFor(line, view, target.id);
      const route = view.routes.get(target.id) ?? [];

      expect(own.lanes.map((l) => l.target.id)).toEqual([target.id]);
      expect(own.rows.map((r) => r.id)).toEqual([ORIGIN_ID, ...route]);
      expect(own.rows.every((r) => r.cells.length === 1)).toBe(true);
    }
  });

  it('keeps every target a station serves for its chips', async () => {
    const { roadmap, view, line } = await setup();
    const target = roadmap.targets[0]?.id ?? '';

    for (const row of lineFor(line, view, target).rows) {
      if (row.kind !== 'milestone') continue;
      expect(row.servedLanes.map((l) => l.target.id)).toEqual(row.serves.map((t) => t.id));
    }
  });

  it('keeps the track continuous between the stops it keeps', async () => {
    const { roadmap, view, line } = await setup();

    for (const target of roadmap.targets) {
      const rows = lineFor(line, view, target.id).rows;
      rows.slice(1).forEach((row, i) => {
        const above = rows[i]?.cells[0];
        expect(above?.bottom).not.toBeNull();
        expect(row.cells[0]?.top).toBe(above?.bottom);
      });
      expect(rows[0]?.cells[0]?.top).toBeNull();
      expect(rows.at(-1)?.cells[0]?.bottom).toBeNull();
    }
  });

  it('marks "you are here" per line: its first stop that is not done', async () => {
    const { roadmap, view, line } = await setup();

    for (const target of roadmap.targets) {
      const milestones = lineFor(line, view, target.id).rows.flatMap((r) =>
        r.kind === 'milestone' ? [r] : [],
      );
      const expected = milestones.find((r) => r.status !== 'done')?.id ?? null;

      expect(lineCurrent(view, target.id)).toBe(expected);
      expect(milestones.filter((r) => r.current).map((r) => r.id)).toEqual(
        expected ? [expected] : [],
      );
    }
  });

  it('has no "you are here" once every stop on the line is done', async () => {
    const { roadmap, view } = await setup();
    const done: RoadmapView = {
      ...view,
      statusByMilestone: new Map(roadmap.milestones.map((m) => [m.id, 'done' as const])),
    };

    expect(lineCurrent(done, roadmap.targets[0]?.id ?? '')).toBeNull();
  });

  it('returns the whole line for an unknown target', async () => {
    const { view, line } = await setup();

    expect(lineFor(line, view, 'nope')).toBe(line);
  });
});

describe('selectedTargetId (#148)', () => {
  it('takes a known target id and selects nothing for anything else', async () => {
    const { roadmap } = await setup();
    const primary = roadmap.targets.find((t) => t.isPrimary)?.id ?? '';
    const other = roadmap.targets.find((t) => !t.isPrimary)?.id ?? '';

    expect(selectedTargetId(roadmap, other)).toBe(other);
    expect(selectedTargetId(roadmap, primary)).toBe(primary);
    expect(selectedTargetId(roadmap, undefined)).toBeNull();
    expect(selectedTargetId(roadmap, 'nope')).toBeNull();
    expect(selectedTargetId(roadmap, [other])).toBeNull();
  });
});

describe('selectedStationId (#111)', () => {
  it('takes a milestone of this roadmap and opens nothing for anything else', async () => {
    const { roadmap } = await setup();
    const milestone = roadmap.milestones[0]?.id ?? '';
    const target = roadmap.targets[0]?.id ?? '';

    expect(selectedStationId(roadmap, milestone)).toBe(milestone);
    expect(selectedStationId(roadmap, undefined)).toBeNull();
    // A target's terminal shares the map's namespace but has no panel.
    expect(selectedStationId(roadmap, target)).toBeNull();
    expect(selectedStationId(roadmap, [milestone])).toBeNull();
  });
});

describe('subwayMap "you are here" (#148)', () => {
  it("marks the selected line's station", async () => {
    const { roadmap, layout, colors, view } = await setup();
    if (!layout) throw new Error('the bundled layout should fit the bundled roadmap');
    const other = roadmap.targets.find((t) => !t.isPrimary)?.id ?? '';
    const current = lineCurrent(view, other);

    const map = subwayMap(roadmap, layout, view, colors, current);

    expect(map.stations.filter((s) => s.current).map((s) => s.id)).toEqual(
      current ? [current] : [],
    );
  });
});
