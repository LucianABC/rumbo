import { deriveRoadmapView, isOctilinear } from '@rumbo/contracts';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import RoadmapPage from '../src/app/(tabs)/roadmap/page';
import { SubwayMapView } from '../src/components/roadmap/subway-map-view';
import { getRoadmap, getRoadmapLayout, getTargetColors } from '../src/lib/data';
import { ORIGIN_ID } from '../src/lib/roadmap/single-line';
import { LANE, offsetPolyline, originBend, subwayMap, UNIT } from '../src/lib/roadmap/subway-map';

vi.mock('next/server', () => ({ connection: () => Promise.resolve() }));

async function build() {
  const roadmap = await getRoadmap();
  const layout = await getRoadmapLayout(roadmap);
  if (!layout) throw new Error('the mock layout must fit');
  const view = deriveRoadmapView(roadmap);
  return { roadmap, view, map: subwayMap(roadmap, layout, view, getTargetColors(roadmap, layout)) };
}

const grid = (p: { x: number; y: number }) => ({ x: p.x / UNIT, y: p.y / UNIT });

describe('subway map (#117)', () => {
  it('draws every derived route from the starting point to its terminal', async () => {
    const { roadmap, view, map } = await build();

    for (const target of roadmap.targets) {
      const stops = map.segments.filter((s) => s.targetId === target.id).map((s) => s.to);
      expect(map.segments.find((s) => s.targetId === target.id)?.from).toBe(ORIGIN_ID);
      expect(stops).toEqual(view.routes.get(target.id));
    }
  });

  it('keeps every stretch horizontal, vertical or at 45 degrees', async () => {
    const { map } = await build();

    for (const segment of map.segments) {
      segment.points.slice(1).forEach((p, i) => {
        const q = segment.points[i];
        if (q) expect(isOctilinear(grid(q), grid(p))).toBe(true);
      });
    }
  });

  it('runs lines that share a stretch in separate lanes', async () => {
    const { map } = await build();
    const shared = map.segments.filter(
      (s) => s.from === 'query-basics' && s.to === 'weekly-report',
    );

    expect(new Set(shared.map((s) => s.points[0]?.y)).size).toBe(shared.length);
    const ys = shared.map((s) => s.points[0]?.y ?? 0).sort((a, b) => a - b);
    expect((ys[1] ?? 0) - (ys[0] ?? 0)).toBe(LANE);
  });

  it('keeps every line continuous: each stretch starts where the previous one ended', async () => {
    const { roadmap, map } = await build();

    for (const target of roadmap.targets) {
      const own = map.segments.filter((s) => s.targetId === target.id);
      own.slice(1).forEach((segment, i) => {
        expect(segment.points[0]).toEqual(own[i]?.points.at(-1));
      });
    }
  });

  it('marks traveled and ahead stretches from the stop they leave', async () => {
    const { map } = await build();
    const style = (from: string) =>
      map.segments.find((s) => s.targetId === 'data-analyst' && s.from === from)?.stretch;

    expect(style(ORIGIN_ID)).toBe('traveled');
    expect(style('query-basics')).toBe('traveled');
    expect(style('weekly-report')).toBe('ahead');
  });

  it('gives interchanges a capsule and single stops a ring in their line color', async () => {
    const { map } = await build();
    const station = (id: string) => map.stations.find((s) => s.id === id);

    const weekly = station('weekly-report');
    expect(weekly?.current).toBe(true);
    expect(weekly?.from).not.toEqual(weekly?.to);
    expect(weekly?.color).toBeNull();

    const processMap = station('process-map');
    expect(processMap?.from).toEqual(processMap?.to);
    expect(processMap?.color).toBe('line-2');
    expect(station(ORIGIN_ID)?.kind).toBe('origin');
    expect(map.stations.filter((s) => s.kind === 'terminal')).toHaveLength(3);
  });

  it('steepens a label where a line climbs to the right, so they never cross', async () => {
    const { map } = await build();

    // Business Analyst climbs from the process map back up to the public dashboard.
    expect(map.stations.find((s) => s.id === 'process-map')?.labelAngle).toBe(-60);
    expect(map.stations.find((s) => s.id === 'team-capacity')?.labelAngle).toBe(-35);
  });

  it('runs the primary line on top: topmost terminal and top lane from the start', async () => {
    const { roadmap, map } = await build();
    const primary = roadmap.targets.find((t) => t.isPrimary)?.id;
    const terminals = map.stations.filter((s) => s.kind === 'terminal');
    const leaving = map.segments.filter((s) => s.from === ORIGIN_ID);
    const top = (points: readonly { y: number }[]) => Math.min(...points.map((p) => p.y));

    expect(terminals.reduce((a, b) => (b.from.y < a.from.y ? b : a)).id).toBe(primary);
    expect(leaving.reduce((a, b) => (top(b.points) < top(a.points) ? b : a)).targetId).toBe(
      primary,
    );
  });

  it('bends from the starting point along the main line, then at 45 degrees', () => {
    expect(originBend({ x: 0, y: 2 }, { x: 4, y: 2 })).toEqual([]);
    expect(originBend({ x: 0, y: 2 }, { x: 4, y: 0 })).toEqual([{ x: 2, y: 2 }]);
    expect(originBend({ x: 0, y: 0 }, { x: 1, y: 3 })).toEqual([{ x: 1, y: 1 }]);
  });
});

describe('subway map view', () => {
  it('is decoration over the station list, drawn in and pulsing unless motion is reduced', async () => {
    const { map } = await build();
    const html = renderToStaticMarkup(
      createElement(SubwayMapView, { map, active: null, onActivate: () => undefined }),
    );

    expect(html).toMatch(/^<svg aria-hidden="true"/);
    expect(html).toContain('animate-draw-line');
    expect(html).toMatch(/animate-here-pulse[^"]*motion-reduce:hidden/);
    expect(html).toContain('>Customer support specialist</text>');
  });

  it('dims the lines of other targets while one is active', async () => {
    const { map } = await build();
    const html = renderToStaticMarkup(
      createElement(SubwayMapView, { map, active: ['data-analyst'], onActivate: () => undefined }),
    );

    expect(html).toMatch(/stroke-line-2 opacity-15/);
    expect(html).not.toMatch(/stroke-line-1 opacity-15/);
  });

  it('shows on the roadmap page from lg, with the list dropping its lanes there', async () => {
    const html = renderToStaticMarkup(await RoadmapPage());

    expect(html).toContain('<div class="hidden lg:block"><svg');
    expect(html).toContain('lg:grid-cols-1');
  });
});

describe('offsetPolyline', () => {
  it('moves a straight line sideways, negative distances to its right', () => {
    const line = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
    ];

    expect(offsetPolyline(line, -5)).toEqual([
      { x: 0, y: -5 },
      { x: 10, y: -5 },
    ]);
    expect(offsetPolyline(line, 0)).toEqual(line);
  });

  it('mitres a 45 degree corner so both shifted edges stay at the same distance', () => {
    const corner = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 20, y: 10 },
    ];
    const [a, b, c] = offsetPolyline(corner, -4);
    const distanceToLine = (
      p: { x: number; y: number },
      q1: { x: number; y: number },
      q2: { x: number; y: number },
    ) =>
      Math.abs((q2.x - q1.x) * (q1.y - p.y) - (q1.x - p.x) * (q2.y - q1.y)) /
      Math.hypot(q2.x - q1.x, q2.y - q1.y);

    expect(a?.y).toBe(-4);
    expect(distanceToLine(b ?? { x: 0, y: 0 }, { x: 0, y: 0 }, { x: 10, y: 0 })).toBeCloseTo(4);
    expect(distanceToLine(b ?? { x: 0, y: 0 }, { x: 10, y: 0 }, { x: 20, y: 10 })).toBeCloseTo(4);
    expect(distanceToLine(c ?? { x: 0, y: 0 }, { x: 10, y: 0 }, { x: 20, y: 10 })).toBeCloseTo(4);
  });
});
