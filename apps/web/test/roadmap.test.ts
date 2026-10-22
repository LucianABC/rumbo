import { createElement, Fragment } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { GET } from '../src/app/demo/health/route';
import RoadmapPage from '../src/app/(tabs)/roadmap/page';
import { getRoadmap } from '../src/lib/data';

// connection() only opts the page out of prerendering; outside a Next request it has nothing to do.
vi.mock('next/server', () => ({ connection: () => Promise.resolve() }));

/** A title as React escapes it, so assertions survive `&`, quotes and apostrophes. */
function escaped(text: string): string {
  return renderToStaticMarkup(createElement(Fragment, null, text));
}

describe('roadmap page', () => {
  it('lists milestones in plan order, then the targets, and marks where the user is', async () => {
    const roadmap = await getRoadmap();
    const html = renderToStaticMarkup(await RoadmapPage());
    const titles = [
      ...roadmap.milestones.map((m) => m.title),
      ...roadmap.targets.map((t) => t.roleFamily.name),
    ];
    const positions = titles.map((title) => html.indexOf(`<strong>${escaped(title)}</strong>`));

    expect(positions.every((p) => p >= 0)).toBe(true);
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
    expect(html).toContain(`${escaped('Own the weekly support report')}</strong> (you are here)`);
    expect(html).toContain('interchange');
  });

  it('keeps the plan order visible as list numbers despite the CSS reset', async () => {
    const html = renderToStaticMarkup(await RoadmapPage());

    expect(html).toMatch(/<ol class="[^"]*\blist-decimal\b/);
  });
});

describe('GET /demo/health', () => {
  it('reports ok', async () => {
    const response = GET();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: 'ok' });
  });
});
