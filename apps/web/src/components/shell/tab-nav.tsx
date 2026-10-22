'use client';

import { cn } from 'cn';
import { Database, FolderGit2, ListChecks, type LucideIcon, Route, UserRound } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import {
  type BadgeCount,
  isActiveTab,
  type TabBadge,
  type TabBadges,
  TABS,
  type TabId,
} from '../../lib/tabs';

const ICONS: Readonly<Record<TabId, LucideIcon>> = {
  roadmap: Route,
  profile: UserRound,
  skills: ListChecks,
  projects: FolderGit2,
  sources: Database,
};

/**
 * One navigation landmark for every breakpoint: a bottom bar on phones, a side rail from `md` up
 * (docs/product/views.md, #107). Five tabs fit the bar, so there is no "More" menu.
 */
export function TabNav({ badges }: { readonly badges: TabBadges }) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Tabs"
      className="fixed inset-x-0 bottom-0 z-10 border-t bg-card pb-[env(safe-area-inset-bottom)] md:sticky md:top-14 md:h-[calc(100dvh-3.5rem)] md:w-56 md:shrink-0 md:self-start md:border-t-0 md:border-r md:bg-transparent md:p-3"
    >
      <ul className="grid grid-cols-5 md:flex md:flex-col md:gap-1">
        {TABS.map((tab) => {
          const active = isActiveTab(tab, pathname);
          const Icon = ICONS[tab.id];
          const badge = badges[tab.id];
          return (
            <li key={tab.id}>
              <Link
                href={tab.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'relative flex min-h-14 flex-col items-center justify-center gap-1 px-1 text-2xs font-medium text-muted-foreground outline-none',
                  'transition-colors duration-(--duration-quick) hover:text-foreground',
                  'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
                  // Phone: an ink bar above the active tab, so it is not marked by color alone.
                  'before:absolute before:inset-x-3 before:top-0 before:h-0.5 before:rounded-full',
                  'aria-[current=page]:text-foreground aria-[current=page]:before:bg-primary',
                  'md:min-h-10 md:flex-row md:justify-start md:gap-3 md:rounded-lg md:px-3 md:text-sm',
                  'md:before:hidden md:hover:bg-muted md:aria-[current=page]:bg-muted md:aria-[current=page]:font-semibold',
                )}
              >
                <span className="relative">
                  <Icon
                    aria-hidden
                    className="size-5 md:size-4"
                    strokeWidth={active ? 2.25 : 1.75}
                  />
                  {badge?.attention?.value ? (
                    <span
                      aria-hidden
                      className="absolute -top-0.5 -right-1 size-2 rounded-full bg-attention ring-2 ring-card md:hidden"
                    />
                  ) : null}
                </span>
                <span className="w-full truncate text-center md:w-auto md:flex-1 md:text-left">
                  {tab.label}
                </span>
                <Badges badge={badge} />
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/**
 * Count pill (neutral) and attention pill (amber, things waiting on the user). The pills are
 * visual only from `md`; the sentence after the label is what screen readers get everywhere.
 */
function Badges({ badge }: { readonly badge: TabBadge | undefined }) {
  const count = shown(badge?.count);
  const attention = shown(badge?.attention);
  if (!count && !attention) return null;

  return (
    <>
      <span className="sr-only">
        {[count, attention]
          .map((part) => (part ? `, ${String(part.value)} ${part.label}` : ''))
          .join('')}
      </span>
      <span aria-hidden className="hidden items-center gap-1 md:flex">
        {count ? (
          <span className="rounded-full border px-1.5 font-mono text-2xs tabular-nums">
            {count.value}
          </span>
        ) : null}
        {attention ? (
          <span className="rounded-full bg-attention px-1.5 font-mono text-2xs font-medium text-background tabular-nums">
            {attention.value}
          </span>
        ) : null}
      </span>
    </>
  );
}

/** A zero count is not shown: an empty pill would read as "something here". */
function shown(part: BadgeCount | undefined): BadgeCount | undefined {
  return part && part.value > 0 ? part : undefined;
}
