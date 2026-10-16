import type { RoadmapLayout } from '@rumbo/contracts';

/**
 * Hand-authored map for the mock roadmap (spec 01). Derived routes:
 * Data Analyst: query-basics → weekly-report → public-dashboard → statistics-grounding → terminal
 * Business Analyst: query-basics → weekly-report → process-map → public-dashboard → terminal
 * Support Operations Lead: query-basics → weekly-report → team-capacity → terminal
 */
export const roadmapLayout = {
  lines: [
    { targetId: 'data-analyst', colorToken: 'line-1' },
    { targetId: 'business-analyst', colorToken: 'line-2' },
    { targetId: 'support-ops-lead', colorToken: 'line-3' },
  ],
  stations: [
    { id: 'query-basics', at: { x: 0, y: 2 } },
    { id: 'weekly-report', at: { x: 2, y: 2 } },
    { id: 'process-map', at: { x: 4, y: 0 } },
    { id: 'team-capacity', at: { x: 4, y: 4 } },
    { id: 'public-dashboard', at: { x: 6, y: 2 } },
    { id: 'statistics-grounding', at: { x: 8, y: 2 } },
    { id: 'data-analyst', at: { x: 10, y: 2 } },
    { id: 'business-analyst', at: { x: 10, y: 0 } },
    { id: 'support-ops-lead', at: { x: 10, y: 4 } },
  ],
  bends: [{ targetId: 'business-analyst', after: 'public-dashboard', points: [{ x: 8, y: 0 }] }],
  // All three lines share the first stretch; lanes keep them side by side.
  offsets: [
    { targetId: 'data-analyst', from: 'query-basics', to: 'weekly-report', lane: 0 },
    { targetId: 'business-analyst', from: 'query-basics', to: 'weekly-report', lane: -1 },
    { targetId: 'support-ops-lead', from: 'query-basics', to: 'weekly-report', lane: 1 },
  ],
} satisfies RoadmapLayout;
