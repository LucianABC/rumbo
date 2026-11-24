import type { TailoredCvs } from '@rumbo/contracts/provisional';

import { profile } from './profile';

/**
 * Provisional CVs per target (#191) until the F4 spec (#44): two of the three targets have one,
 * so Support Operations Lead shows the sub-tab with nothing generated yet. They only pick and
 * reword what the profile mock holds; checkCvs rejects a position or skill it lacks. Nothing here
 * comes from a real person.
 */
export const cvs = {
  cvs: [
    {
      targetId: 'data-analyst',
      generatedAt: '2026-10-15T10:00:00.000Z',
      profileUpdatedAt: profile.updatedAt,
      headline:
        'Support specialist moving into data analysis, with three years of weekly reporting',
      about:
        'Three years owning the weekly support report, from raw tickets to the summary the product team reads. SQL certified, now moving into data analysis.',
      positions: [
        {
          experienceId: 'experience-current-job',
          highlights: [
            'Own the weekly support report, from raw tickets to the summary the product team reads.',
            'Triage about 60 tickets a day and route bugs with reproduction steps.',
          ],
        },
        {
          experienceId: 'experience-call-center',
          highlights: ['Handled billing and plan changes by phone and chat.'],
        },
      ],
      skillIds: ['ps-sql', 'ps-spreadsheets', 'ps-ticket-triage', 'ps-communication'],
    },
    {
      targetId: 'business-analyst',
      generatedAt: '2026-10-15T10:05:00.000Z',
      profileUpdatedAt: profile.updatedAt,
      headline: 'Customer support specialist who turns user problems into clear requirements',
      about:
        'Four years close to customers, the last three writing the playbooks and reports a product team relies on. Moving toward business analysis.',
      positions: [
        {
          experienceId: 'experience-current-job',
          highlights: [
            'Wrote the escalation playbook the team uses today.',
            'Route bugs to the product team with reproduction steps, about 60 tickets a day.',
            'Built and maintain the weekly support report used by the product team.',
          ],
        },
      ],
      skillIds: [
        'ps-requirements-analysis',
        'ps-process-documentation',
        'ps-communication',
        'ps-spreadsheets',
      ],
    },
  ],
} satisfies TailoredCvs;
