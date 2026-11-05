import type { ProfileAnalysis } from '@rumbo/contracts/provisional';

import { profile } from './profile';

/**
 * Provisional analysis of the profile mock (spec 01, #113) until the F1 spec (#41). It points at
 * the profile's version, so checkAnalysis rejects it over any other profile. Nothing here comes
 * from a real person.
 */
export const analysis = {
  profileUpdatedAt: profile.updatedAt,
  analyzedAt: '2026-10-14T18:45:00.000Z',
  subtitle: 'Customer support specialist moving into data analysis',
  summary:
    'Four years in customer support, with three of them building the report the product team reads every week. The profile reads as support first, with a real and growing data side that a recent SQL certificate backs up.',
  feedback: [
    {
      kind: 'strength',
      text: 'Owning a recurring report for three years is analysis work, not just support.',
    },
    {
      kind: 'strength',
      text: 'The escalation playbook shows you can document a process other people follow.',
    },
    {
      kind: 'improve',
      text: 'Only one bullet has a number, so your impact is hard to size.',
    },
    {
      kind: 'improve',
      text: 'SQL rests on a certificate and practice queries: nothing shows it in use at work.',
    },
  ],
} satisfies ProfileAnalysis;
