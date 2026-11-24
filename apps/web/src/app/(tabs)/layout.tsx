import type { ReactNode } from 'react';

import { SuggestedChanges } from '../../components/profile/suggested-changes';
import { AppHeader } from '../../components/shell/app-header';
import { TabNav } from '../../components/shell/tab-nav';
import {
  getProfileOrNull,
  getRoadmap,
  getRoadmapLayout,
  getSuggestedChanges,
  getTargetColors,
} from '../../lib/data';
import { StoreProvider } from '../../lib/store';

/**
 * The shell every tab shares: skip link, header, tab navigation and the page area
 * (docs/product/views.md, #107). The status page lives outside it, at /status. It reads the plan
 * and the profile once and hydrates the store every tab reads them from (#168).
 */
export default async function TabsLayout({ children }: { readonly children: ReactNode }) {
  // The profile does not depend on the roadmap, so it loads alongside it (#112).
  const pendingProfile = getProfileOrNull();
  const roadmap = await getRoadmap();
  const [layout, profile] = await Promise.all([getRoadmapLayout(roadmap), pendingProfile]);
  const colors = getTargetColors(roadmap, layout);
  // Only the bell and Profile's badge need these, so no tab waits for them: both stream in (#113).
  const changes = profile ? getSuggestedChanges(Promise.resolve(profile), roadmap) : null;
  // The contract guarantees exactly one primary target (packages/contracts, roadmap.ts).
  const primary = roadmap.targets.find((t) => t.isPrimary) ?? roadmap.targets[0];

  return (
    <StoreProvider data={{ roadmap, layout, profile }}>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-30 focus:rounded-lg focus:bg-primary focus:px-3 focus:py-2 focus:text-sm focus:text-primary-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        Skip to content
      </a>
      {primary ? (
        <AppHeader
          target={primary}
          color={colors.get(primary.id)}
          actions={<SuggestedChanges changes={changes} />}
        />
      ) : null}
      <div className="md:flex">
        <TabNav suggestedChanges={changes} />
        <main
          id="main"
          tabIndex={-1}
          className="mx-auto w-full max-w-360 min-w-0 px-4 pt-6 pb-24 outline-none md:px-8 md:pt-8 md:pb-12"
        >
          {children}
        </main>
      </div>
    </StoreProvider>
  );
}
