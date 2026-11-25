import type { Experience, ProfileSkill } from '@rumbo/contracts';
import type { TailoredCvs } from '@rumbo/contracts/provisional';

import { profile } from './profile';

/**
 * Provisional CVs per target (#191) until the F4 spec (#44): two of the three targets have one,
 * so Support Operations Lead shows the sub-tab with nothing generated yet. Each copies the profile
 * mock's facts, as a saved CV does, and rewords only the bullets; checkCvs rejects a fact the
 * profile lacks or a copy that differs from it. Nothing here comes from a real person.
 */

function position(id: string, highlights: string[]): Experience {
  const experience = profile.experiences.find((e) => e.id === id);
  if (!experience) throw new Error(`no experience "${id}" in the profile mock`);
  return { ...experience, highlights };
}

function skills(ids: string[]): ProfileSkill[] {
  return ids.map((id) => {
    const skill = profile.skills.find((s) => s.id === id);
    if (!skill) throw new Error(`no skill "${id}" in the profile mock`);
    return skill;
  });
}

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
      experiences: [
        position('experience-current-job', [
          'Own the weekly support report, from raw tickets to the summary the product team reads.',
          'Triage about 60 tickets a day and route bugs with reproduction steps.',
        ]),
        position('experience-call-center', ['Handled billing and plan changes by phone and chat.']),
      ],
      education: profile.education,
      certifications: profile.certifications,
      skills: skills(['ps-sql', 'ps-spreadsheets', 'ps-ticket-triage', 'ps-communication']),
    },
    {
      targetId: 'business-analyst',
      generatedAt: '2026-10-15T10:05:00.000Z',
      profileUpdatedAt: profile.updatedAt,
      headline: 'Customer support specialist who turns user problems into clear requirements',
      about:
        'Four years close to customers, the last three writing the playbooks and reports a product team relies on. Moving toward business analysis.',
      experiences: [
        position('experience-current-job', [
          'Wrote the escalation playbook the team uses today.',
          'Route bugs to the product team with reproduction steps, about 60 tickets a day.',
          'Built and maintain the weekly support report used by the product team.',
        ]),
      ],
      education: profile.education,
      certifications: profile.certifications,
      skills: skills([
        'ps-requirements-analysis',
        'ps-process-documentation',
        'ps-communication',
        'ps-spreadsheets',
      ]),
    },
  ],
} satisfies TailoredCvs;
