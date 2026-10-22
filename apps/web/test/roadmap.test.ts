import { createElement, Fragment } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import RoadmapPage from '../src/app/(tabs)/roadmap/page';
import { GET } from '../src/app/demo/health/route';
import { getRoadmap } from '../src/lib/data';

// connection() only opts the page out of prerendering; outside a Next request it has nothing to do.
vi.mock('next/server', () => ({ connection: () => Promise.resolve() }));

/** Text as React escapes it, so assertions survive `&`, quotes and apostrophes. */
function escaped(text: string): string {
  return renderToStaticMarkup(createElement(Fragment, null, text));
}

async function render(): Promise<string> {
  return renderToStaticMarkup(await RoadmapPage());
}

describe('roadmap page (#108)', () => {
  it('lists the starting point, milestones in plan order, then the targets', async () => {
    const roadmap = await getRoadmap();
    const html = await render();
    const titles = [
      roadmap.from,
      ...roadmap.milestones.map((m) => m.title),
      ...roadmap.targets.map((t) => t.roleFamily.name),
    ];
    const stations = html.split('data-testid="station"').slice(1);

    expect(html).toContain('<ol aria-label="Stations"');
    expect(stations).toHaveLength(titles.length);
    // Terminals follow lane order (primary first), which the mock's target order already is.
    stations.forEach((station, i) => {
      expect(station).toContain(`>${escaped(titles[i] ?? '')}</span>`);
    });
  });

  it('gives every milestone a button named with its status, targets and position', async () => {
    const html = await render();
    const names = [...html.matchAll(/<button[^>]*aria-label="([^"]+)"/g)].map((m) => m[1]);
    const roadmap = await getRoadmap();

    expect(names).toHaveLength(roadmap.milestones.length);
    expect(names.filter((n) => n?.endsWith(', you are here'))).toHaveLength(1);
    expect(names[0]).toMatch(/^Learn the query basics, done, serves /);
  });

  it('shows "You are here" and a pulse that reduced motion hides', async () => {
    const html = await render();

    expect(html).toContain('>You are here</span>');
    expect(html).toMatch(/class="[^"]*\banimate-here-pulse\b[^"]*\bmotion-reduce:hidden\b/);
  });

  it('names each line next to its color, primary first', async () => {
    const html = await render();

    expect(html).toContain('<ul aria-label="Lines"');
    expect(html).toMatch(/bg-line-1[^>]*><\/span><span class="font-semibold">Data Analyst<\/span>/);
  });

  it('dates items in day-month-year', async () => {
    expect(await render()).toContain('30 Sep 2026');
  });
});

describe('GET /demo/health', () => {
  it('reports ok', async () => {
    const response = GET();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: 'ok' });
  });
});
