import { createElement } from 'react';
import { renderToReadableStream } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import ProfilePage from '../src/app/(tabs)/profile/page';
import ProjectsPage from '../src/app/(tabs)/projects/page';
import RoadmapPage from '../src/app/(tabs)/roadmap/page';
import SkillsPage from '../src/app/(tabs)/skills/page';
import { SuggestedChanges } from '../src/components/profile/suggested-changes';
import { TabNav } from '../src/components/shell/tab-nav';
import { getDrafts } from '../src/lib/data';
import { profileCompleteness, suggestions } from '../src/lib/profile/profile-view';
import type { AppStore } from '../src/lib/store.types';
import { inStore, lastTaskOpen, renderTab, testStore } from './support/store';

vi.mock('next/server', () => ({ connection: () => Promise.resolve() }));
vi.mock('next/navigation', () => ({
  usePathname: () => '/roadmap',
  useRouter: () => ({ replace: () => undefined }),
}));

/** Renders with Suspense resolved, as the browser ends up showing it. */
async function streamed(store: AppStore, node: React.ReactNode): Promise<string> {
  const stream = await renderToReadableStream(inStore(store, node));
  await stream.allReady;
  return new Response(stream).text();
}

const roadmapPage = () => RoadmapPage({ searchParams: Promise.resolve({}) });

describe('one plan for every view (#168)', () => {
  it('approving the last open task finishes its deliverable and station on Roadmap, Projects and the badges', async () => {
    const roadmap = await lastTaskOpen();
    const before = await testStore({}, { roadmap, profile: null });
    const after = await testStore(
      { decisions: { drafts: {}, evidence: { 'ev-sales-model': 'approved' } } },
      { roadmap, profile: null },
    );
    const station = 'Build a public dashboard';

    // Roadmap: the station's own status.
    expect(await renderTab(await roadmapPage(), before)).toContain(`${station}, in progress,`);
    expect(await renderTab(await roadmapPage(), after)).toContain(`${station}, done,`);

    // Projects: the card moves to Completed, its deliverable done.
    const projects = await renderTab(await ProjectsPage(), after);
    expect(projects).toMatch(/Active <span[^>]*>\(1\)/);
    expect(projects).toMatch(/Completed <span[^>]*>\(2\)/);
    expect(projects).toContain('3 of 3 tasks done');

    // The tab badge and the Projects header say the same.
    const nav = await renderTab(createElement(TabNav), after);
    expect(nav).toContain('title="2 open tasks"');
    expect(projects).toContain('>2 open tasks</span>');
  });

  it('taking the approval back restores every view', async () => {
    const roadmap = await lastTaskOpen();
    const store = await testStore({}, { roadmap, profile: null });
    store.getState().decide('evidence', 'ev-sales-model', 'approved');
    store.getState().decide('evidence', 'ev-sales-model', null);

    // A fresh render reads the store's initial state, so this checks the derived plan itself.
    expect(store.getState().plan.roadmap).toEqual(store.getInitialState().plan.roadmap);
  });

  it('shows an edited profile the same on the summary band, Skills & gaps, Profile and the bell', async () => {
    const plain = await testStore();
    const imported = plain.getState().source.profile ?? expect.fail('no profile');
    const edited = {
      ...imported,
      name: 'Renamed Person',
      languages: [],
      skills: imported.skills.slice(1),
    };
    const store = await testStore({ editedProfile: edited });

    expect(await renderTab(await roadmapPage(), store)).toContain('Renamed Person');
    expect(
      await renderTab(await SkillsPage({ searchParams: Promise.resolve({}) }), store),
    ).toContain(`Skills you have (${String(edited.skills.length)})`);

    const { percent, todos } = profileCompleteness(edited);
    expect(percent).not.toBe(profileCompleteness(imported).percent);
    expect(await renderTab(await ProfilePage(), store)).toContain(
      `aria-valuenow="${String(percent)}"`,
    );

    const { changes } = await getDrafts(imported, store.getState().source.roadmap);
    const left = suggestions(changes, edited, store.getState().plan.lanes).length + todos.length;
    const bell = await streamed(
      store,
      createElement(SuggestedChanges, { changes: Promise.resolve(changes) }),
    );
    expect(bell).toContain(`aria-label="Suggested changes, ${String(left)} to review"`);
  });
});
