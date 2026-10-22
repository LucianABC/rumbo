import type { Roadmap } from '@rumbo/contracts';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import nextConfig from '../next.config';
import TabsLayout from '../src/app/(tabs)/layout';
import ProfilePage from '../src/app/(tabs)/profile/page';
import ProjectsPage from '../src/app/(tabs)/projects/page';
import SkillsPage from '../src/app/(tabs)/skills/page';
import SourcesPage from '../src/app/(tabs)/sources/page';
import { TabNav } from '../src/components/shell/tab-nav';
import { getRoadmap } from '../src/lib/data';
import { getTab, isActiveTab, tabBadges, TABS } from '../src/lib/tabs';

// connection() only opts the page out of prerendering; outside a Next request it has nothing to do.
vi.mock('next/server', () => ({ connection: () => Promise.resolve() }));
const pathname = vi.hoisted(() => ({ current: '/roadmap' }));
vi.mock('next/navigation', () => ({ usePathname: () => pathname.current }));

beforeEach(() => {
  pathname.current = '/roadmap';
});

function nav(badges = {}): string {
  return renderToStaticMarkup(createElement(TabNav, { badges }));
}

/** The opening tag of each link in the tab navigation, in order. */
function links(html: string): string[] {
  return [...html.matchAll(/<a [^>]*>/g)].map((m) => m[0]);
}

describe('tabs', () => {
  it('lists the five views in the order of the user loop', () => {
    expect(TABS.map((t) => t.href)).toEqual([
      '/roadmap',
      '/profile',
      '/skills',
      '/projects',
      '/sources',
    ]);
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

    const badges = tabBadges(withCommits);

    expect(open).toBeGreaterThan(0);
    expect(badges.projects?.count?.value).toBe(open);
    expect(badges.projects?.attention?.value).toBe(projects.length);
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
  it('links every tab inside one labelled nav landmark', () => {
    const html = nav();

    expect(html).toMatch(/^<nav aria-label="Tabs"/);
    expect(links(html).map((a) => /href="([^"]+)"/.exec(a)?.[1])).toEqual(TABS.map((t) => t.href));
  });

  it('marks only the current tab with aria-current, also on pages inside it', () => {
    pathname.current = '/projects/p-1';

    const current = links(nav()).filter((a) => a.includes('aria-current="page"'));

    expect(current).toHaveLength(1);
    expect(current[0]).toContain('href="/projects"');
  });

  it('gives every link a visible focus ring', () => {
    for (const a of links(nav())) expect(a).toContain('focus-visible:ring-2');
  });

  it('reads badges to screen readers after the label and hides the empty ones', () => {
    const html = nav({
      projects: {
        count: { value: 3, label: 'open tasks' },
        attention: { value: 1, label: 'awaiting approval' },
      },
      profile: { attention: { value: 0, label: 'suggested changes' } },
    });

    expect(html).toContain('<span class="sr-only">, 3 open tasks, 1 awaiting approval</span>');
    expect(html).not.toContain('suggested changes');
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
    ['profile', ProfilePage, ['F1', 'F4']],
    ['skills', SkillsPage, ['F1', 'F2', 'F3']],
    ['projects', ProjectsPage, ['F3', 'F5']],
    ['sources', SourcesPage, ['F1', 'F2']],
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
