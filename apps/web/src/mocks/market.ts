import type { Market } from '@rumbo/contracts/provisional';

/**
 * Fictional market snapshots (spec 01, #145), one per target of the roadmap mock. Ids, shares and
 * posting counts match the roadmap's gap demand, and every skill asked for in at least 30% of a
 * snapshot is either covered by the profile mock or one of that target's gaps.
 */
export const market = {
  snapshots: [
    {
      id: 'snap-da-2026-10',
      targetId: 'data-analyst',
      roleFamily: { id: 'data-analyst', name: 'Data Analyst', field: 'Analytics' },
      region: 'Remote, Americas',
      checkedAt: '2026-10-14T06:00:00.000Z',
      postingCount: 140,
      skills: [
        { skill: { id: 'sql', name: 'SQL' }, share: 0.72 },
        { skill: { id: 'spreadsheets', name: 'Spreadsheets' }, share: 0.68 },
        { skill: { id: 'data-visualization', name: 'Data visualization' }, share: 0.64 },
        { skill: { id: 'statistics', name: 'Statistics' }, share: 0.47 },
        { skill: { id: 'communication', name: 'Communication' }, share: 0.36 },
        { skill: { id: 'python', name: 'Python' }, share: 0.28 },
        { skill: { id: 'tableau', name: 'Tableau' }, share: 0.22 },
      ],
    },
    {
      id: 'snap-ba-2026-10',
      targetId: 'business-analyst',
      roleFamily: { id: 'business-analyst', name: 'Business Analyst', field: 'Business' },
      region: 'Remote, Americas',
      checkedAt: '2026-10-14T06:00:00.000Z',
      postingCount: 95,
      skills: [
        { skill: { id: 'requirements-analysis', name: 'Requirements analysis' }, share: 0.69 },
        { skill: { id: 'sql', name: 'SQL' }, share: 0.58 },
        { skill: { id: 'communication', name: 'Communication' }, share: 0.55 },
        { skill: { id: 'process-documentation', name: 'Process documentation' }, share: 0.44 },
        { skill: { id: 'data-visualization', name: 'Data visualization' }, share: 0.41 },
        { skill: { id: 'spreadsheets', name: 'Spreadsheets' }, share: 0.39 },
        { skill: { id: 'jira', name: 'Jira' }, share: 0.25 },
      ],
    },
    {
      id: 'snap-so-2026-10',
      targetId: 'support-ops-lead',
      roleFamily: {
        id: 'support-operations-lead',
        name: 'Support Operations Lead',
        field: 'Customer operations',
      },
      region: 'Remote, Americas',
      checkedAt: '2026-10-14T06:00:00.000Z',
      postingCount: 60,
      skills: [
        { skill: { id: 'ticket-triage', name: 'Ticket triage' }, share: 0.66 },
        { skill: { id: 'workforce-planning', name: 'Workforce planning' }, share: 0.52 },
        { skill: { id: 'communication', name: 'Communication' }, share: 0.5 },
        { skill: { id: 'help-desk-tools', name: 'Help desk tools' }, share: 0.45 },
        { skill: { id: 'process-documentation', name: 'Process documentation' }, share: 0.34 },
        { skill: { id: 'sql', name: 'SQL' }, share: 0.31 },
        { skill: { id: 'spreadsheets', name: 'Spreadsheets' }, share: 0.27 },
      ],
    },
  ],
} satisfies Market;
