import type { RoadmapLayout } from '@rumbo/contracts';

/**
 * Hand-authored map for the mock roadmap (spec 01, #103). The primary line (Data Analyst) runs
 * along the top and the others branch below it, in lane order (#117). Derived routes:
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
    { id: 'query-basics', at: { x: 0, y: 0 } },
    { id: 'weekly-report', at: { x: 2, y: 0 } },
    { id: 'process-map', at: { x: 4, y: 2 } },
    { id: 'team-capacity', at: { x: 4, y: 4 } },
    { id: 'public-dashboard', at: { x: 6, y: 0 } },
    { id: 'statistics-grounding', at: { x: 8, y: 0 } },
    { id: 'data-analyst', at: { x: 10, y: 0 } },
    { id: 'business-analyst', at: { x: 10, y: 2 } },
    { id: 'support-ops-lead', at: { x: 10, y: 4 } },
  ],
  bends: [
    { targetId: 'business-analyst', after: 'public-dashboard', points: [{ x: 8, y: 2 }] },
    { targetId: 'support-ops-lead', after: 'weekly-report', points: [{ x: 2, y: 2 }] },
  ],
  // Lanes are derived (one per line, primary on top), so no stretch needs an authored offset (#117).
  offsets: [],
} satisfies RoadmapLayout;
