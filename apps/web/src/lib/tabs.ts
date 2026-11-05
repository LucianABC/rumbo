import type { Roadmap } from '@rumbo/contracts';

/**
 * The app's six tabs, in the order of the user's loop: see the plan, see who I am, see why, do
 * the work, check the data, apply (docs/product/views.md, #107).
 */

export type TabId = 'roadmap' | 'profile' | 'skills' | 'projects' | 'sources' | 'jobs';

export interface Feature {
  readonly id: string;
  readonly name: string;
}

export interface Tab {
  readonly id: TabId;
  readonly href: `/${string}`;
  readonly label: string;
  /** What the phone bar shows when the label does not fit; assistive tech still reads `label`. */
  readonly shortLabel?: string;
  /** The question the tab answers, shown by its Planned state until the view is built. */
  readonly answers: string;
  /** The features that fill the tab with real data (docs/product/mvp-scope.md). */
  readonly features: readonly Feature[];
}

const F1 = { id: 'F1', name: 'Profile' };
const F2 = { id: 'F2', name: 'Market' };
const F2B = { id: 'F2b', name: 'Target discovery' };
const F3 = { id: 'F3', name: 'Gaps, target and roadmap' };
const F4 = { id: 'F4', name: 'Drafting with human approval' };
const F5 = { id: 'F5', name: 'Tracking and GitHub' };
const INBOX = { id: '#57', name: 'Job matches and assisted apply' };

export const TABS: readonly Tab[] = [
  {
    id: 'roadmap',
    href: '/roadmap',
    label: 'Roadmap',
    answers: 'Where am I, where am I going, and what is next?',
    features: [F3, F2B],
  },
  {
    id: 'profile',
    href: '/profile',
    label: 'Profile',
    answers: 'What does rumbo know about me, and from what source?',
    features: [F1, F4],
  },
  {
    id: 'skills',
    href: '/skills',
    label: 'Skills & gaps',
    shortLabel: 'Skills',
    answers: 'What do I have, what is missing, and why?',
    features: [F1, F2, F3],
  },
  {
    id: 'projects',
    href: '/projects',
    label: 'Projects',
    answers: 'What am I building, and what proves it?',
    features: [F3, F5],
  },
  {
    id: 'sources',
    href: '/sources',
    label: 'Sources',
    answers: 'Where does this data come from, and how fresh is it?',
    features: [F1, F2],
  },
  {
    id: 'jobs',
    href: '/jobs',
    label: 'Jobs',
    answers: 'Which jobs can I apply to now, and why do they fit?',
    features: [INBOX],
  },
];

export function getTab(id: TabId): Tab {
  const tab = TABS.find((t) => t.id === id);
  if (!tab) throw new Error(`Unknown tab "${id}"`);
  return tab;
}

export interface BadgeCount {
  readonly value: number;
  /** What the number counts, read by screen readers after it ("3 open tasks"). */
  readonly label: string;
}

/** A neutral count for a collection, and a separate count of things waiting on the user. */
export interface TabBadge {
  readonly count?: BadgeCount;
  readonly attention?: BadgeCount;
}

export type TabBadges = Partial<Record<TabId, TabBadge>>;

/**
 * Badges from the data every tab already shares. Projects counts open tasks and evidence awaiting
 * approval (AI rule 2). Profile's badge streams in on its own: see profileBadge.
 */
export function tabBadges(roadmap: Roadmap): TabBadges {
  const projects = roadmap.milestones
    .flatMap((m) => m.items)
    .filter((item) => item.type === 'project');
  const openTasks = projects.flatMap((p) => p.tasks).filter((t) => !t.done).length;
  const awaiting = projects.flatMap((p) => p.evidence).filter((e) => e.approvedAt === null).length;

  return {
    projects: {
      count: { value: openTasks, label: 'open tasks' },
      attention: { value: awaiting, label: 'awaiting approval' },
    },
  };
}

/** Suggested changes left to review, minus those decided on this visit, so it never overstates. */
export function profileBadge(suggestedChanges: number, reviewed: number): TabBadge {
  const value = Math.max(suggestedChanges - reviewed, 0);
  return { attention: { value, label: 'suggested changes' } };
}

/** Whether `pathname` is this tab or a page inside it. */
export function isActiveTab(tab: Tab, pathname: string): boolean {
  return pathname === tab.href || pathname.startsWith(`${tab.href}/`);
}
