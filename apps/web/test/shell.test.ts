import type { Roadmap } from '@rumbo/contracts';
import { createElement } from 'react';
import { renderToReadableStream, renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import nextConfig from '../next.config';
import TabsLayout from '../src/app/(tabs)/layout';
import JobsPage from '../src/app/(tabs)/jobs/page';
import SourcesPage from '../src/app/(tabs)/sources/page';
import { TabNav } from '../src/components/shell/tab-nav';
import { getDrafts, getRoadmap } from '../src/lib/data';
import { profileCompleteness, suggestionCount, suggestions } from '../src/lib/profile/profile-view';
import type { AppStore } from '../src/lib/store.types';
import {
  badgeSummary,
  countText,
  getTab,
  isActiveTab,
  profileBadge,
  tabBadges,
  TABS,
} from '../src/lib/tabs';
import { inStore, testStore } from './support/store';

// connection() only opts the page out of prerendering; outside a Next request it has nothing to do.
vi.mock('next/server', () => ({ connection: () => Promise.resolve() }));
const pathname = vi.hoisted(() => ({ current: '/roadmap' }));
vi.mock('next/navigation', () => ({ usePathname: () => pathname.current }));

beforeEach(() => {
  pathname.current = '/roadmap';
});

/** The nav under a store of the mocks; with no profile, Profile has nothing to count. */
async function nav(store?: AppStore): Promise<string> {
  const using = store ?? (await testStore({}, { profile: null }));
  return renderToStaticMarkup(inStore(using, createElement(TabNav)));
}

/** The opening tag of each link in the tab navigation, in order. */
function links(html: string): string[] {
  return [...html.matchAll(/<a [^>]*>/g)].map((m) => m[0]);
}

describe('tabs', () => {
  it('lists the six views in the order of the user loop', () => {
    expect(TABS.map((t) => t.href)).toEqual([
      '/roadmap',
      '/profile',
      '/skills',
      '/projects',
      '/sources',
      '/jobs',
    ]);
  });

  it('shortens a long label on the phone bar, keeping the full name for assistive tech', async () => {
    const html = await nav();

    expect(html).toContain('<span aria-hidden="true" class="md:hidden">Skills</span>');
    expect(html).toContain('<span class="max-md:sr-only">Skills &amp; gaps</span>');
  });

  it('treats pages inside a tab as that tab, and nothing else', () => {
    const projects = getTab('projects');

    expect(isActiveTab(projects, '/projects')).toBe(true);
    expect(isActiveTab(projects, '/projects/p-1')).toBe(true);
    expect(isActiveTab(projects, '/projectsx')).toBe(false);
    expect(isActiveTab(projects, '/roadmap')).toBe(false);
  });

  it('counts open project tasks and only the project evidence awaiting approval', async () => {
    const roadmap = await getRoadmap();
    const commit = { sourceType: 'commit', sourceRef: 'abc1234', approvedAt: null } as const;
    // A matched commit on every project; the mock's other pending evidence is not a project's.
    const withCommits: Roadmap = {
      ...roadmap,
      milestones: roadmap.milestones.map((m) => ({
        ...m,
        items: m.items.map((i) =>
          i.type === 'project'
            ? { ...i, evidence: [...i.evidence, { ...commit, id: `ev-${i.id}` }] }
            : i,
        ),
      })),
    };
    const projects = roadmap.milestones.flatMap((m) => m.items).filter((i) => i.type === 'project');
    const open = projects.flatMap((p) => p.tasks).filter((t) => !t.done).length;
    const awaiting = projects.flatMap((p) => p.evidence).filter((e) => e.approvedAt === null);

    const badges = tabBadges(withCommits);

    expect(open).toBeGreaterThan(0);
    expect(badges.projects?.count?.value).toBe(open);
    expect(badges.projects?.attention?.value).toBe(projects.length + awaiting.length);
  });

  it('counts suggested changes on Profile, minus the ones already reviewed', () => {
    expect(profileBadge(3, 0).attention?.value).toBe(3);
    expect(profileBadge(3, 1).attention?.value).toBe(2);
    expect(profileBadge(3, 9).attention?.value).toBe(0);
  });

  it('paints every tab without waiting for the Profile badge', async () => {
    const pending = new Promise<null>(() => undefined);

    const html = renderToStaticMarkup(
      inStore(await testStore(), createElement(TabNav, { suggestedChanges: pending })),
    );

    expect(links(html)).toHaveLength(TABS.length);
    expect(html).not.toContain('suggested changes');
  });

  it('streams the Profile badge in once its data arrives: drafts plus what the rubric misses', async () => {
    const store = await testStore();
    const { source, plan } = store.getState();
    const profile = source.profile ?? expect.fail('no profile');
    const { changes } = await getDrafts(profile, source.roadmap);
    const expected = suggestionCount({
      suggestions: suggestions(changes, profile, plan.lanes),
      completeness: profileCompleteness(profile),
    });

    const stream = await renderToReadableStream(
      inStore(store, createElement(TabNav, { suggestedChanges: Promise.resolve(changes) })),
    );
    await stream.allReady;

    expect(expected).toBeGreaterThan(0);
    expect(await new Response(stream).text()).toContain(`${String(expected)} suggested changes`);
  });

  it('counts the profile the user saved, so an edit moves the badge (#168)', async () => {
    const store = await testStore();
    const profile = store.getState().source.profile ?? expect.fail('no profile');
    const before = profileCompleteness(profile).todos.length;
    const edited = await testStore({ editedProfile: { ...profile, languages: [] } });
    const after = profileCompleteness({ ...profile, languages: [] }).todos.length;

    const html = async (using: AppStore) => {
      const stream = await renderToReadableStream(
        inStore(using, createElement(TabNav, { suggestedChanges: Promise.resolve([]) })),
      );
      await stream.allReady;
      return new Response(stream).text();
    };

    expect(after).toBe(before + 1);
    expect(await html(store)).toContain(`${String(before)} suggested changes`);
    expect(await html(edited)).toContain(`${String(after)} suggested changes`);
  });

  it('counts nothing when the roadmap has no projects', async () => {
    const roadmap: Roadmap = await getRoadmap();
    const noProjects = {
      ...roadmap,
      milestones: roadmap.milestones.map((m) => ({
        ...m,
        items: m.items.filter((i) => i.type !== 'project'),
      })),
    };

    expect(tabBadges(noProjects).projects?.count?.value).toBe(0);
  });
});

describe('tab navigation', () => {
  it('links every tab inside one labelled nav landmark', async () => {
    const html = await nav();

    expect(html).toMatch(/^<nav aria-label="Tabs"/);
    expect(links(html).map((a) => /href="([^"]+)"/.exec(a)?.[1])).toEqual(TABS.map((t) => t.href));
  });

  it('marks only the current tab with aria-current, also on pages inside it', async () => {
    pathname.current = '/projects/p-1';

    const current = links(await nav()).filter((a) => a.includes('aria-current="page"'));

    expect(current).toHaveLength(1);
    expect(current[0]).toContain('href="/projects"');
  });

  it('gives every link a visible focus ring', async () => {
    for (const a of links(await nav())) expect(a).toContain('focus-visible:ring-2');
  });

  it('reads badges to screen readers after the label and hides the empty ones', async () => {
    const html = await nav();

    expect(html).toContain('<span class="sr-only">, 4 open tasks, 1 awaiting approval</span>');
    expect(html).not.toContain('suggested changes');
  });

  it('shows a pill only for what waits on the user, and says both in the tooltip', async () => {
    const html = await nav();

    expect(html).toContain('title="4 open tasks, 1 awaiting approval"');
    expect(html).toMatch(/bg-attention px-1\.5[^>]*>1<\/span>/);
    expect(html).not.toMatch(/>4<\/span>/);
  });

  it('moves the Projects badge with a decision on evidence (#168)', async () => {
    const approved = await testStore(
      { decisions: { drafts: {}, evidence: { 'ev-sales-model': 'approved' } } },
      { profile: null },
    );

    const html = await nav(approved);

    expect(html).toContain('title="3 open tasks"');
    expect(html).not.toContain('awaiting approval');
  });

  it('says a count of one in the singular and leaves an empty badge out', () => {
    expect(countText({ value: 1, label: 'open tasks' })).toBe('1 open task');
    expect(countText({ value: 2, label: 'open tasks' })).toBe('2 open tasks');
    expect(countText({ value: 1, label: 'awaiting approval' })).toBe('1 awaiting approval');
    expect(badgeSummary({ attention: { value: 0, label: 'awaiting approval' } })).toBeUndefined();
    expect(badgeSummary(undefined)).toBeUndefined();
  });
});

describe('tab shell', () => {
  it('wraps a page in skip link, header with the primary target, tabs and main', async () => {
    const roadmap = await getRoadmap();
    const primary = roadmap.targets.find((t) => t.isPrimary);

    const html = renderToStaticMarkup(await TabsLayout({ children: 'page content' }));

    expect(html).toMatch(/^<a href="#main"[^>]*>Skip to content<\/a>/);
    expect(html).toContain(
      `Toward <span class="font-medium text-foreground">${primary?.roleFamily.name ?? ''}`,
    );
    expect(html).toMatch(/class="[^"]*\bbg-line-[123]\b/);
    expect(html).toContain('<nav aria-label="Tabs"');
    expect(html).toMatch(/<main id="main" tabindex="-1"[^>]*>page content<\/main>/);
  });
});

describe('planned tabs', () => {
  it.each([
    ['sources', SourcesPage, ['F1', 'F2']],
    ['jobs', JobsPage, ['#57']],
  ] as const)('%s shows its title and the Planned state naming its features', (id, Page, ids) => {
    const tab = getTab(id);
    const html = renderToStaticMarkup(createElement(Page));

    expect(html).toContain(`>${renderToStaticMarkup(tab.label)}</h1>`);
    expect(html).toContain('data-testid="planned"');
    expect(html).toContain('Planned');
    for (const feature of ids) expect(html).toContain(`<span class="font-mono">${feature}</span>`);
  });
});

describe('routes', () => {
  it('opens the app on the roadmap', async () => {
    expect(await nextConfig.redirects?.()).toEqual([
      { source: '/', destination: '/roadmap', permanent: false },
    ]);
  });
});
