import type { Roadmap } from '@rumbo/contracts';

/**
 * Fictional user's roadmap after onboarding (spec 01, #103): a customer support specialist with three
 * active targets. Shapes follow ADR 0004; interchanges, routes and "you are here" are derived.
 */
export const roadmap = {
  from: 'Customer support specialist',
  updatedAt: '2026-10-14T18:30:00.000Z',
  targets: [
    {
      id: 'data-analyst',
      roleFamily: { id: 'data-analyst', name: 'Data Analyst', field: 'Analytics' },
      isPrimary: true,
      seniority: 'Junior',
      workMode: 'remote',
      region: 'Remote, Americas',
    },
    {
      id: 'business-analyst',
      roleFamily: { id: 'business-analyst', name: 'Business Analyst', field: 'Business' },
      isPrimary: false,
      seniority: 'Junior',
      workMode: 'hybrid',
      region: 'Remote, Americas',
    },
    {
      id: 'support-ops-lead',
      roleFamily: {
        id: 'support-operations-lead',
        name: 'Support Operations Lead',
        field: 'Customer operations',
      },
      isPrimary: false,
      workMode: 'remote',
      region: 'Remote, Americas',
    },
  ],
  gaps: [
    {
      id: 'sql',
      skill: { id: 'sql', name: 'SQL' },
      priority: 1,
      rationale:
        'Every target asks for it, and the profile shows only spreadsheet work. The certificate is done; applying it at work is what remains.',
      status: 'in_progress',
      demand: [
        { targetId: 'data-analyst', snapshotId: 'snap-da-2026-10', share: 0.72, postingCount: 140 },
        {
          targetId: 'business-analyst',
          snapshotId: 'snap-ba-2026-10',
          share: 0.58,
          postingCount: 95,
        },
        {
          targetId: 'support-ops-lead',
          snapshotId: 'snap-so-2026-10',
          share: 0.31,
          postingCount: 60,
        },
      ],
    },
    {
      id: 'data-visualization',
      skill: { id: 'data-visualization', name: 'Data visualization' },
      priority: 2,
      rationale:
        'Two targets ask for dashboards; the profile has reports but none published or reviewed by others. The weekly report is the first step.',
      status: 'in_progress',
      demand: [
        { targetId: 'data-analyst', snapshotId: 'snap-da-2026-10', share: 0.64, postingCount: 140 },
        {
          targetId: 'business-analyst',
          snapshotId: 'snap-ba-2026-10',
          share: 0.41,
          postingCount: 95,
        },
      ],
    },
    {
      id: 'requirements-analysis',
      skill: { id: 'requirements-analysis', name: 'Requirements analysis' },
      priority: 3,
      rationale:
        'Core to Business Analyst postings; the workshop is the first evidence, waiting for approval.',
      status: 'in_progress',
      demand: [
        {
          targetId: 'business-analyst',
          snapshotId: 'snap-ba-2026-10',
          share: 0.69,
          postingCount: 95,
        },
      ],
    },
    {
      id: 'statistics',
      skill: { id: 'statistics', name: 'Statistics' },
      priority: 4,
      rationale:
        'Asked for in about half of Data Analyst postings; no evidence in the profile yet.',
      status: 'open',
      demand: [
        { targetId: 'data-analyst', snapshotId: 'snap-da-2026-10', share: 0.47, postingCount: 140 },
      ],
    },
    {
      id: 'workforce-planning',
      skill: { id: 'workforce-planning', name: 'Workforce planning' },
      priority: 5,
      rationale:
        'Support operations roles plan staffing against ticket volume; the profile shows triage but not planning.',
      status: 'open',
      demand: [
        {
          targetId: 'support-ops-lead',
          snapshotId: 'snap-so-2026-10',
          share: 0.52,
          postingCount: 60,
        },
      ],
    },
  ],
  milestones: [
    {
      id: 'query-basics',
      title: 'Learn the query basics',
      summary: 'Joins, aggregations and window functions, with a graded exam.',
      items: [
        {
          id: 'sql-certificate',
          type: 'education',
          kind: 'certification',
          provider: 'Online community college',
          title: 'SQL fundamentals certificate',
          doneWhen: 'Certificate issued after passing the final exam',
          status: 'done',
          gapIds: ['sql'],
          expectedEnd: '2026-09-30',
          lastProgressAt: '2026-09-26',
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
      ],
    },
    {
      id: 'weekly-report',
      title: 'Own the weekly support report',
      summary:
        'Replace the hand-built spreadsheet with scheduled queries and a short written summary.',
      items: [
        {
          id: 'automate-weekly-report',
          type: 'work_experience',
          context: 'Current job: take over the weekly support report from the team lead',
          title: 'Automate the weekly support report',
          doneWhen: 'Report runs every Monday from saved queries and the manager signs it off',
          status: 'in_progress',
          gapIds: ['sql', 'data-visualization'],
          expectedEnd: '2026-10-30',
          lastProgressAt: '2026-10-14',
          evidence: [],
        },
      ],
    },
    {
      id: 'process-map',
      title: 'Map a real process',
      summary: 'Turn recurring complaints into requirements the product team can act on.',
      items: [
        {
          id: 'requirements-workshop',
          type: 'work_experience',
          context: 'Current job: facilitate a workshop with the product team',
          title: 'Run a requirements workshop',
          doneWhen: 'Workshop held and a requirements write-up shared with the product team',
          status: 'in_progress',
          gapIds: ['requirements-analysis'],
          expectedEnd: '2026-10-23',
          lastProgressAt: '2026-10-12',
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
    },
    {
      id: 'team-capacity',
      title: "Plan the team's capacity",
      items: [
        {
          id: 'support-ops-certificate',
          type: 'education',
          kind: 'certification',
          provider: 'Support operations institute',
          title: 'Support operations certificate',
          doneWhen: 'Certificate issued after the staffing-plan capstone',
          status: 'pending',
          gapIds: ['workforce-planning'],
          expectedEnd: '2026-12-18',
          evidence: [],
        },
      ],
    },
    {
      id: 'public-dashboard',
      title: 'Build a public dashboard',
      summary: 'From a raw sales dataset to a published, reviewed dashboard.',
      items: [
        {
          id: 'sales-dashboard',
          type: 'project',
          repo: 'https://github.com/example-user/sales-dashboard',
          title: 'Sales dashboard project',
          doneWhen: 'Dashboard published with a README explaining the questions it answers',
          status: 'pending',
          gapIds: ['data-visualization'],
          expectedEnd: '2026-11-27',
          evidence: [],
          tasks: [
            { id: 'define-questions', title: 'Define the questions and metrics', done: false },
            { id: 'model-data', title: 'Clean and model the data', done: false },
            { id: 'publish', title: 'Build and publish the dashboard', done: false },
          ],
        },
      ],
    },
    {
      id: 'statistics-grounding',
      title: 'Ground the analysis in statistics',
      items: [
        {
          id: 'statistics-course',
          type: 'education',
          kind: 'course',
          provider: 'Open university',
          title: 'Statistics course',
          doneWhen: 'All eight units completed with the final quiz passed',
          status: 'pending',
          gapIds: ['statistics'],
          expectedEnd: '2027-01-29',
          evidence: [],
        },
        {
          id: 'open-data-case',
          type: 'project',
          title: 'Open data case study',
          doneWhen: 'A written analysis of a public dataset published with its notebook',
          status: 'pending',
          gapIds: ['statistics'],
          expectedEnd: '2027-02-26',
          evidence: [],
          tasks: [
            { id: 'pick-dataset', title: 'Pick a public dataset', done: false },
            { id: 'write-analysis', title: 'Publish the written analysis', done: false },
          ],
        },
      ],
    },
  ],
} satisfies Roadmap;
