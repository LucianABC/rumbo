import type { Progress } from '@rumbo/contracts/provisional';

/**
 * Provisional repo activity of the roadmap mock's projects (spec 01, #114) until the F5 spec
 * (#45). Commit SHAs match the evidence in `roadmap.ts`. Nothing here comes from a real person.
 */
export const progress = {
  syncedAt: '2026-10-14T18:30:00.000Z',
  projects: [
    {
      itemId: 'practice-queries',
      lastPushAt: '2026-10-01T19:48:00.000Z',
      commits: [
        {
          sha: '7be41d09',
          message: 'add window function queries',
          committedAt: '2026-10-01T19:42:00.000Z',
        },
      ],
    },
    {
      itemId: 'sales-dashboard',
      lastPushAt: '2026-10-13T21:17:00.000Z',
      commits: [
        {
          sha: 'a3f9c21',
          message: 'model sales export into fact and dimension tables',
          committedAt: '2026-10-13T21:10:00.000Z',
        },
        {
          sha: 'e05b7a4',
          message: 'fix currency parsing in the raw export',
          committedAt: '2026-10-11T17:32:00.000Z',
        },
        {
          sha: '2d8c6f1',
          message: 'write down the questions and metrics',
          committedAt: '2026-10-09T15:05:00.000Z',
        },
      ],
    },
  ],
} satisfies Progress;
