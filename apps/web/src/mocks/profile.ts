import type { Profile } from '@rumbo/contracts';

/**
 * Fictional user's profile (spec 01, #145): the customer support specialist of the roadmap mock.
 * Evidence ids and experience ids match `roadmap.ts`, as ADR 0004 keeps one evidence record per
 * proof. Nothing here comes from a real person.
 */
export const profile = {
  name: 'Alex Rivera',
  headline: 'Customer support specialist turning ticket data into decisions',
  location: 'Remote, Americas',
  about:
    'Four years in customer support, the last three owning the weekly ticket report. Moving toward data and analysis roles.',
  updatedAt: '2026-10-14T18:30:00.000Z',
  experiences: [
    {
      id: 'experience-current-job',
      title: 'Customer Support Specialist',
      organization: 'Northwind Software',
      start: '2023-02',
      end: null,
      location: 'Remote',
      summary: 'Tier-2 support for a B2B scheduling product.',
      highlights: [
        'Built and maintain the weekly support report used by the product team.',
        'Triage about 60 tickets a day and route bugs with reproduction steps.',
        'Wrote the escalation playbook the team uses today.',
      ],
    },
    {
      id: 'experience-call-center',
      title: 'Customer Service Representative',
      organization: 'Brightline Telecom',
      start: '2020-06',
      end: '2023-01',
      highlights: ['Handled billing and plan changes by phone and chat.'],
    },
  ],
  education: [
    {
      id: 'education-associate',
      institution: 'City Community College',
      credential: 'Associate degree in Business Administration',
      start: '2017',
      end: '2019',
    },
  ],
  certifications: [
    {
      id: 'certification-sql',
      name: 'SQL fundamentals certificate',
      issuer: 'Online community college',
      issuedAt: '2026-09',
    },
  ],
  languages: [
    { name: 'English', level: 'native' },
    { name: 'Spanish', level: 'professional' },
  ],
  skills: [
    {
      id: 'ps-communication',
      skill: { id: 'communication', name: 'Communication' },
      category: 'Customer support',
      evidence: [
        {
          id: 'ev-communication-current',
          sourceType: 'experience',
          sourceRef: 'experience-current-job',
          excerpt: 'Explains bugs and workarounds to customers and to the product team.',
          approvedAt: '2026-10-02T12:00:00.000Z',
        },
        {
          id: 'ev-communication-call-center',
          sourceType: 'experience',
          sourceRef: 'experience-call-center',
          excerpt: 'Two and a half years on phone and chat support.',
          approvedAt: '2026-10-02T12:00:00.000Z',
        },
      ],
    },
    {
      id: 'ps-ticket-triage',
      skill: { id: 'ticket-triage', name: 'Ticket triage' },
      category: 'Customer support',
      evidence: [
        {
          id: 'ev-ticket-triage',
          sourceType: 'experience',
          sourceRef: 'experience-current-job',
          excerpt: 'Triages about 60 tickets a day.',
          approvedAt: '2026-10-02T12:00:00.000Z',
        },
      ],
    },
    {
      id: 'ps-help-desk-tools',
      skill: { id: 'help-desk-tools', name: 'Help desk tools' },
      category: 'Customer support',
      evidence: [
        {
          id: 'ev-help-desk-tools',
          sourceType: 'experience',
          sourceRef: 'experience-current-job',
          approvedAt: '2026-10-02T12:00:00.000Z',
        },
      ],
    },
    {
      id: 'ps-spreadsheets',
      skill: { id: 'spreadsheets', name: 'Spreadsheets' },
      category: 'Data',
      evidence: [
        {
          id: 'ev-spreadsheets',
          sourceType: 'experience',
          sourceRef: 'experience-current-job',
          excerpt: 'Builds the weekly support report by hand in a spreadsheet.',
          approvedAt: '2026-10-02T12:00:00.000Z',
        },
      ],
    },
    {
      id: 'ps-sql',
      skill: { id: 'sql', name: 'SQL' },
      category: 'Data',
      evidence: [
        {
          id: 'ev-sql-certificate',
          sourceType: 'education',
          sourceRef: 'https://certificates.example.com/sql-fundamentals/4821',
          excerpt: 'Passed with 91%.',
          approvedAt: '2026-09-27T14:05:00.000Z',
        },
      ],
    },
    {
      id: 'ps-process-documentation',
      skill: { id: 'process-documentation', name: 'Process documentation' },
      category: 'Operations',
      evidence: [
        {
          id: 'ev-escalation-playbook',
          sourceType: 'experience',
          sourceRef: 'experience-current-job',
          excerpt: 'Wrote the escalation playbook the team uses today.',
          approvedAt: '2026-10-02T12:00:00.000Z',
        },
      ],
    },
    {
      id: 'ps-requirements-analysis',
      skill: { id: 'requirements-analysis', name: 'Requirements analysis' },
      category: 'Operations',
      evidence: [
        {
          id: 'ev-requirements-writeup',
          sourceType: 'experience',
          sourceRef: 'experience-current-job',
          excerpt: 'Shared a requirements write-up after a 60-minute workshop.',
          approvedAt: null,
        },
      ],
    },
  ],
  sources: [{ kind: 'linkedin_export', importedAt: '2026-10-01T09:00:00.000Z' }],
} satisfies Profile;
