import { deriveRoadmapView, type ProjectItem } from '@rumbo/contracts';
import { describe, expect, it, vi } from 'vitest';

import { getRoadmap, getTargetColors } from '../src/lib/data';
import {
  decidedEvidence,
  decisionOf,
  evidenceRows,
  lineInitials,
  projectsView,
  taskRows,
} from '../src/lib/projects/projects-view';
import { lanesOf } from '../src/lib/roadmap/single-line';
import { evidenceTasks, projectsBadge, tabBadges } from '../src/lib/tabs';
import { progress } from '../src/mocks/progress';

vi.mock('next/server', () => ({ connection: () => Promise.resolve() }));

async function view(forProgress: typeof progress | null = progress) {
  const roadmap = await getRoadmap();
  const lanes = lanesOf(roadmap, getTargetColors(roadmap, null));
  return projectsView(roadmap, deriveRoadmapView(roadmap), lanes, forProgress);
}

function project(over: Partial<ProjectItem> = {}): ProjectItem {
  return {
    id: 'p',
    type: 'project',
    title: 'P',
    doneWhen: 'Done',
    status: 'in_progress',
    gapIds: ['g'],
    evidence: [],
    tasks: [
      { id: 't1', title: 'One', done: false },
      { id: 't2', title: 'Two', done: true },
    ],
    ...over,
  };
}

const awaiting = {
  id: 'e1',
  sourceType: 'commit',
  sourceRef: 'abc1234',
  taskId: 't1',
  approvedAt: null,
} as const;

/** Two of the mock's projects on one repo, written two ways. */
async function sharedRepo() {
  const roadmap = await getRoadmap();
  const repos: Readonly<Record<string, string>> = {
    'practice-queries': 'https://github.com/example-user/work',
    'sales-dashboard': 'https://GitHub.com/example-user/work.git',
  };
  return {
    ...roadmap,
    milestones: roadmap.milestones.map((m) => ({
      ...m,
      items: m.items.map((i) => {
        const repo = repos[i.id];
        return i.type === 'project' && repo ? { ...i, repo } : i;
      }),
    })),
  };
}

describe('projectsView', () => {
  it('lists project items only, in plan order, with finished ones apart', async () => {
    const { active, completed } = await view();

    expect(active.map((c) => c.id)).toEqual(['sales-dashboard', 'open-data-case']);
    expect(completed.map((c) => c.id)).toEqual(['practice-queries']);
  });

  it('names the gaps a project closes and the targets those gaps serve, primary first', async () => {
    const { active } = await view();
    const [dashboard] = active;

    expect(dashboard?.deliverables[0]?.gaps).toEqual([
      { id: 'data-visualization', name: 'Data visualization' },
    ]);
    expect(dashboard?.lanes.map((l) => l.target.id)).toEqual(['data-analyst', 'business-analyst']);
    expect(dashboard?.deliverables[0]?.lanes.map((l) => l.target.id)).toEqual([
      'data-analyst',
      'business-analyst',
    ]);
  });

  it('links to the station of the project on Roadmap', async () => {
    const { active } = await view();

    expect(active[0]?.deliverables[0]?.stationHref).toContain('station=public-dashboard');
  });

  it('takes the last activity from the repo when it is newer than the item', async () => {
    const { active } = await view();

    expect(active[0]?.lastActivity).toBe('2026-10-13T21:17:00.000Z');
    expect(active[0]?.commits[0]?.sha).toBe('a3f9c21');
    expect(active[0]?.repoName).toBe('github.com/example-user/sales-dashboard');
  });

  it('falls back to what the roadmap holds without activity', async () => {
    const { active } = await view(null);

    expect(active[0]?.lastActivity).toBe('2026-10-13');
    expect(active[0]?.commits).toEqual([]);
  });

  it('has no last activity or repo name for a project that has not started', async () => {
    const { active } = await view();

    expect(active[1]?.lastActivity).toBeNull();
    expect(active[1]?.repoName).toBeNull();
  });

  it('names a repo by its host, whichever it is', async () => {
    const roadmap = await getRoadmap();
    const elsewhere = {
      ...roadmap,
      milestones: roadmap.milestones.map((m) => ({
        ...m,
        items: m.items.map((i) =>
          i.type === 'project' ? { ...i, repo: 'https://gitlab.com/team/sales/' } : i,
        ),
      })),
    };

    const { active } = projectsView(elsewhere, deriveRoadmapView(elsewhere), [], null);

    expect(active[0]?.repoName).toBe('gitlab.com/team/sales');
  });

  it('makes one project of the items on one repo, and keeps items without a repo apart', async () => {
    const shared = await sharedRepo();
    const lanes = lanesOf(shared, getTargetColors(shared, null));
    const commit = (sha: string, committedAt: string) => ({ sha, message: 'm', committedAt });
    const activity = {
      syncedAt: '2026-10-14T18:30:00.000Z',
      projects: [
        {
          itemId: 'practice-queries',
          lastPushAt: '2026-10-01T19:48:00.000Z',
          commits: [commit('1111111', '2026-10-01T19:00:00.000Z')],
        },
        {
          itemId: 'sales-dashboard',
          lastPushAt: '2026-10-13T21:17:00.000Z',
          commits: [
            commit('2222222', '2026-10-13T21:00:00.000Z'),
            commit('1111111', '2026-10-01T19:00:00.000Z'),
          ],
        },
      ],
    };

    const { active, completed } = projectsView(shared, deriveRoadmapView(shared), lanes, activity);
    const [project, alone] = active;

    expect(completed).toEqual([]);
    expect(active).toHaveLength(2);
    expect(project?.id).toBe('practice-queries');
    expect(project?.title).toBe('work');
    expect(project?.status).toBe('in_progress');
    expect(project?.expectedEnd).toBe('2026-11-27');
    expect(project?.deliverables.map((s) => s.item.id)).toEqual([
      'practice-queries',
      'sales-dashboard',
    ]);
    expect(project?.deliverables.flatMap((s) => s.gaps.map((g) => g.id))).toEqual([
      'sql',
      'data-visualization',
    ]);
    expect(project?.commits.map((c) => c.sha)).toEqual(['2222222', '1111111']);
    expect(project?.lastActivity).toBe('2026-10-13T21:17:00.000Z');
    expect(alone?.title).toBe('Open data case study');
  });

  it('is done only once every deliverable is', async () => {
    const shared = await sharedRepo();
    const roadmap = {
      ...shared,
      milestones: shared.milestones.map((m) => ({
        ...m,
        items: m.items.filter((i) => i.id !== 'sales-dashboard'),
      })),
    };

    const { completed } = projectsView(roadmap, deriveRoadmapView(roadmap), [], null);

    expect(completed.map((c) => c.title)).toEqual(['Practice query set']);
  });

  it('is empty for a roadmap without projects', async () => {
    const roadmap = await getRoadmap();
    const withoutProjects = {
      ...roadmap,
      milestones: roadmap.milestones.map((m) => ({
        ...m,
        items: m.items.filter((i) => i.type !== 'project'),
      })),
    };

    expect(projectsView(withoutProjects, deriveRoadmapView(withoutProjects), [], null)).toEqual({
      active: [],
      completed: [],
    });
  });
});

describe('lineInitials', () => {
  it('takes each word’s first letter', () => {
    expect(lineInitials('Forward Deployed Engineer')).toBe('FDE');
    expect(lineInitials('Data  Analyst')).toBe('DA');
  });
});

describe('taskRows', () => {
  it('flags an open task with evidence waiting for the user', () => {
    const rows = taskRows(project({ evidence: [awaiting] }), {});

    expect(rows[0]).toMatchObject({ id: 't1', done: false, awaitingEvidence: true });
    expect(rows[1]).toMatchObject({ id: 't2', done: true, awaitingEvidence: false });
  });

  it('completes the task once its evidence is approved, never before', () => {
    const item = project({ evidence: [awaiting] });

    expect(taskRows(item, { e1: 'approved' })[0]).toMatchObject({
      done: true,
      awaitingEvidence: false,
    });
    expect(taskRows(item, { e1: 'rejected' })[0]).toMatchObject({
      done: false,
      awaitingEvidence: false,
    });
  });
});

describe('decidedEvidence', () => {
  const now = '2026-11-05T12:00:00.000Z';

  it('counts an approval from now and drops a rejection', () => {
    expect(decidedEvidence([awaiting], { e1: 'approved' }, now)).toEqual([
      { ...awaiting, approvedAt: now },
    ]);
    expect(decidedEvidence([awaiting], { e1: 'rejected' }, now)).toEqual([]);
  });

  it('leaves undecided and stored evidence as it is', () => {
    const stored = { ...awaiting, id: 'e2', approvedAt: '2026-10-01T00:00:00.000Z' };

    expect(decidedEvidence([awaiting, stored], {}, now)).toEqual([awaiting, stored]);
  });
});

describe('decisionOf', () => {
  it('keeps a stored approval whatever was decided on this visit', () => {
    const approved = { ...awaiting, approvedAt: '2026-10-01T00:00:00.000Z' };

    expect(decisionOf(approved, { e1: 'rejected' })).toBe('approved');
    expect(decisionOf(awaiting, {})).toBe('awaiting');
    expect(decisionOf(awaiting, { e1: 'rejected' })).toBe('rejected');
  });
});

describe('evidenceRows', () => {
  it('puts what awaits the user first and links a commit to its repo', async () => {
    const { active } = await view();
    const rows = evidenceRows(active[0] ?? expect.fail('no card'));

    expect(rows.map((r) => r.evidence.id)).toEqual(['ev-sales-model', 'ev-sales-questions']);
    expect(rows[0]).toMatchObject({
      name: 'Commit a3f9c21',
      href: 'https://github.com/example-user/sales-dashboard/commit/a3f9c21',
      message: 'model sales export into fact and dimension tables',
      taskTitle: 'Clean and model the data',
    });
  });

  it('never makes a link of a commit without a repo or of free text', async () => {
    const { active } = await view();
    const card = active[0] ?? expect.fail('no card');
    const deliverable = card.deliverables[0] ?? expect.fail('no deliverable');
    const item: ProjectItem = {
      ...deliverable.item,
      evidence: [
        awaiting,
        { id: 'e2', sourceType: 'manual', sourceRef: 'https://evil.example', approvedAt: null },
      ],
    };
    const noRepo = { ...card, repo: null, deliverables: [{ ...deliverable, item }] };

    expect(evidenceRows(noRepo).map((r) => r.href)).toEqual([null, null]);
  });
});

describe('Projects badge', () => {
  it('counts the mock: open tasks and one commit awaiting approval', async () => {
    const badge = tabBadges(await getRoadmap()).projects;

    expect(badge?.count?.value).toBe(4);
    expect(badge?.attention?.value).toBe(1);
  });

  it('drops the attention count on any decision and the open tasks only on approval', async () => {
    const roadmap = await getRoadmap();
    const badge = tabBadges(roadmap).projects;
    const tasks = evidenceTasks(roadmap);

    const approved = projectsBadge(badge, { 'ev-sales-model': 'approved' }, tasks);
    const rejected = projectsBadge(badge, { 'ev-sales-model': 'rejected' }, tasks);

    expect(approved?.count?.value).toBe(3);
    expect(approved?.attention?.value).toBe(0);
    expect(rejected?.count?.value).toBe(4);
    expect(rejected?.attention?.value).toBe(0);
  });

  it('completes a task once however many commits prove it', () => {
    const badge = {
      count: { value: 2, label: 'open tasks' },
      attention: { value: 2, label: 'awaiting approval' },
    };
    const tasks = { e1: 'p/t1', e2: 'p/t1' };

    const result = projectsBadge(badge, { e1: 'approved', e2: 'approved' }, tasks);

    expect(result?.count?.value).toBe(1);
    expect(result?.attention?.value).toBe(0);
  });

  it('leaves no badge when there was none', () => {
    expect(projectsBadge(undefined, {}, {})).toBeUndefined();
  });

  it('only maps awaiting evidence with an open task', async () => {
    expect(evidenceTasks(await getRoadmap())).toEqual({
      'ev-sales-model': 'sales-dashboard/model-data',
    });
  });
});
