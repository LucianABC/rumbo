import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { GET } from '../src/app/demo/health/route';
import RoadmapPage from '../src/app/roadmap/page';
import { getRoadmap } from '../src/lib/data';

describe('roadmap page', () => {
  it('lists milestones in plan order, then the targets, and marks where the user is', async () => {
    const roadmap = await getRoadmap();
    const html = renderToStaticMarkup(await RoadmapPage());
    const titles = [...html.matchAll(/data-testid="station"><strong>([^<]*)</g)].map((m) =>
      m[1]?.replaceAll('&#x27;', "'"),
    );

    expect(titles).toEqual([
      ...roadmap.milestones.map((m) => m.title),
      ...roadmap.targets.map((t) => t.roleFamily.name),
    ]);
    expect(html).toContain('Own the weekly support report</strong> (you are here)');
    expect(html).toContain('interchange');
  });
});

describe('GET /demo/health', () => {
  it('reports ok', async () => {
    const response = GET();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: 'ok' });
  });
});
