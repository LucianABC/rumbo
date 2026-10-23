import type { ReactNode } from 'react';

import { AppHeader } from '../../components/shell/app-header';
import { TabNav } from '../../components/shell/tab-nav';
import { getRoadmap, getRoadmapLayout, getTargetColors } from '../../lib/data';
import { tabBadges } from '../../lib/tabs';

/**
 * The shell every tab shares: skip link, header, tab navigation and the page area
 * (docs/product/views.md, #107). The status page lives outside it, at /status.
 */
export default async function TabsLayout({ children }: { readonly children: ReactNode }) {
  const roadmap = await getRoadmap();
  const colors = getTargetColors(roadmap, await getRoadmapLayout(roadmap));
  // The contract guarantees exactly one primary target (packages/contracts, roadmap.ts).
  const primary = roadmap.targets.find((t) => t.isPrimary) ?? roadmap.targets[0];

  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-30 focus:rounded-lg focus:bg-primary focus:px-3 focus:py-2 focus:text-sm focus:text-primary-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        Skip to content
      </a>
      {primary ? <AppHeader target={primary} color={colors.get(primary.id)} /> : null}
      <div className="md:flex">
        <TabNav badges={tabBadges(roadmap)} />
        <main
          id="main"
          tabIndex={-1}
          className="mx-auto w-full max-w-6xl min-w-0 px-4 pt-6 pb-24 outline-none md:px-8 md:pt-8 md:pb-12"
        >
          {children}
        </main>
      </div>
    </>
  );
}
