import type { Drafts } from '@rumbo/contracts/provisional';

import { profile } from './profile';

/**
 * Provisional suggested changes (spec 01, #113) until the F4 spec (#44). `before` reads the
 * profile mock, so the two cannot drift: checkDrafts rejects a change against text the profile
 * no longer has. Nothing here comes from a real person.
 */
export const drafts = {
  changes: [
    {
      id: 'draft-headline',
      section: 'headline',
      targetId: 'data-analyst',
      createdAt: '2026-10-15T09:00:00.000Z',
      completenessGain: 6,
      before: profile.headline,
      after: 'Support specialist moving into data analysis, with three years of weekly reporting',
    },
    {
      id: 'draft-report-bullet',
      section: 'experience',
      experienceId: 'experience-current-job',
      targetId: 'data-analyst',
      createdAt: '2026-10-15T09:00:00.000Z',
      completenessGain: 8,
      before: 'Built and maintain the weekly support report used by the product team.',
      after:
        'Own the weekly support report, from raw tickets to the summary the product team reads.',
      question: 'How many tickets does the report cover each week?',
    },
    {
      id: 'draft-about',
      section: 'about',
      targetId: 'business-analyst',
      createdAt: '2026-10-12T16:20:00.000Z',
      completenessGain: 4,
      before: profile.about,
      after:
        'Four years in customer support, the last three owning the weekly report the product team reads. I write the playbooks my team works from, and I am moving toward business analysis roles.',
    },
  ],
} satisfies Drafts;
