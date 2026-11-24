import type { Roadmap } from '@rumbo/contracts';
import { createElement, type ReactElement, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { getProfileOrNull, getRoadmap, getRoadmapLayout } from '../../src/lib/data';
import { createAppStore, StoreProvider } from '../../src/lib/store';
import type { AppStore, InitialState, PlanData } from '../../src/lib/store.types';

/** What the tabs layout hydrates the store with, read the same way, so mocked failures apply. */
export async function planData(): Promise<PlanData> {
  const roadmap = await getRoadmap();
  return { roadmap, layout: await getRoadmapLayout(roadmap), profile: await getProfileOrNull() };
}

/** The mock with "Clean and model the data" as the dashboard's last open task. */
export async function lastTaskOpen(): Promise<Roadmap> {
  const roadmap = await getRoadmap();
  return {
    ...roadmap,
    milestones: roadmap.milestones.map((m) => ({
      ...m,
      items: m.items.map((i) =>
        i.id === 'sales-dashboard' && i.type === 'project'
          ? { ...i, tasks: i.tasks.map((t) => (t.id === 'publish' ? { ...t, done: true } : t)) }
          : i,
      ),
    })),
  };
}

/** A store as one request gets it, optionally past some decisions or edits. */
export async function testStore(
  initial: InitialState = {},
  data: Partial<PlanData> = {},
): Promise<AppStore> {
  return createAppStore({ ...(await planData()), ...data }, initial);
}

/** A tab's page rendered under a fresh store, as the tabs layout would give it. */
export async function renderTab(page: ReactNode, store?: AppStore): Promise<string> {
  return renderToStaticMarkup(inStore(store ?? (await testStore()), page));
}

/** Renders what a tab renders, under the provider the tabs layout gives it. */
export function inStore(store: AppStore, children: ReactNode): ReactElement {
  return createElement(StoreProvider, { store, children });
}
