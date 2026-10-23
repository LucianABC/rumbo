import { deriveRoadmapView } from '@rumbo/contracts';
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

async function render(line?: string | string[]): Promise<string> {
  const searchParams = Promise.resolve(line === undefined ? {} : { line });
  return renderToStaticMarkup(await RoadmapPage({ searchParams }));
}

/** The starting point, the target's milestones in plan order, then its terminal (#148). */
async function titlesOf(targetId: string): Promise<string[]> {
  const roadmap = await getRoadmap();
  const route = deriveRoadmapView(roadmap).routes.get(targetId) ?? [];
  return [
    roadmap.from,
    ...roadmap.milestones.filter((m) => route.includes(m.id)).map((m) => m.title),
    roadmap.targets.find((t) => t.id === targetId)?.roleFamily.name ?? '',
  ];
}

function stationTitlesMatch(html: string, titles: readonly string[]) {
  const stations = html.split('data-testid="station"').slice(1);
  expect(stations).toHaveLength(titles.length);
  stations.forEach((station, i) => {
    // Milestone titles are their station's button (#110); the ends are plain text.
    const title = `>${escaped(titles[i] ?? '')}</`;
    expect(station.includes(`${title}button>`) || station.includes(`${title}span>`)).toBe(true);
  });
}

describe('roadmap page (#108)', () => {
  it("lists the primary's line by default: start, its milestones, its terminal", async () => {
    const roadmap = await getRoadmap();
    const primary = roadmap.targets.find((t) => t.isPrimary)?.id ?? '';
    const html = await render();

    expect(html).toContain('<ol role="list" aria-label="Stations"');
    stationTitlesMatch(html, await titlesOf(primary));
  });

  it('marks the chosen line in a single switcher (#148)', async () => {
    const html = await render('business-analyst');
    const groups = html.split('role="group" aria-label="Show line"').slice(1);

    expect(groups).toHaveLength(1);
    const link = /<a [^>]*href="\?line=business-analyst"[^>]*>/.exec(html)?.[0] ?? '';
    expect(link).toContain('aria-current="true"');
    expect(html).not.toContain('Choose a line');
  });

  it('lists the line ?line= names, and the primary for anything else (#148)', async () => {
    const roadmap = await getRoadmap();
    const primary = roadmap.targets.find((t) => t.isPrimary)?.id ?? '';
    const other = roadmap.targets.find((t) => !t.isPrimary)?.id ?? '';

    stationTitlesMatch(await render(other), await titlesOf(other));
    stationTitlesMatch(await render('not-a-target'), await titlesOf(primary));
    stationTitlesMatch(await render([other, other]), await titlesOf(primary));
  });

  it('gives every milestone of the line a button named with its status and targets', async () => {
    const html = await render();
    const names = [...html.matchAll(/<button[^>]*aria-label="([^"]+)"/g)].map((m) => m[1]);
    const roadmap = await getRoadmap();
    const primary = roadmap.targets.find((t) => t.isPrimary)?.id ?? '';

    expect(names).toHaveLength((await titlesOf(primary)).length - 2);
    expect(names.filter((n) => n?.endsWith(', you are here'))).toHaveLength(1);
    expect(names[0]).toMatch(/^Learn the query basics, done, serves /);
  });

  it('shows "You are here" and a pulse that reduced motion hides', async () => {
    const html = await render();

    expect(html).toContain('>You are here</span>');
    expect(html).toMatch(/class="[^"]*\banimate-here-pulse\b[^"]*\bmotion-reduce:hidden\b/);
  });

  it('names each line next to its color, primary first (#148)', async () => {
    const html = await render();
    const groups = html.split('role="group" aria-label="Show line"').slice(1);
    const linksOf = (group: string) => [...group.matchAll(/<a [^>]*href="\?line=([^"]+)"[^>]*>/g)];
    const ids = ['data-analyst', 'business-analyst', 'support-ops-lead'];

    // With nothing chosen: the phone switcher marks the primary its list shows, the desktop one
    // beside the map marks nothing until the user picks a line.
    expect(groups).toHaveLength(2);
    const [phone, desktop] = groups.map((g) => linksOf(g.split('</div>')[0] ?? ''));
    expect(phone?.map((l) => l[1])).toEqual(ids);
    expect(desktop?.map((l) => l[1])).toEqual(ids);
    expect(phone?.map((l) => l[0].includes('aria-current="true"'))).toEqual([true, false, false]);
    expect(desktop?.some((l) => l[0].includes('aria-current'))).toBe(false);
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
