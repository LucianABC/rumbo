import {
  deriveRoadmapView,
  type ProjectItem,
  type Roadmap,
  type RoadmapItem,
} from '@rumbo/contracts';
import { describe, expect, it, vi } from 'vitest';

import { getRoadmap } from '../src/lib/data';
import { decidedEvidence, decidePlan, decisionOf } from '../src/lib/progress';
import { tabBadges } from '../src/lib/tabs';
import { lastTaskOpen } from './support/store';

vi.mock('next/server', () => ({ connection: () => Promise.resolve() }));

const NOW = '2026-11-24T12:00:00.000Z';

function item(roadmap: Roadmap, id: string): RoadmapItem {
  const found = roadmap.milestones.flatMap((m) => m.items).find((i) => i.id === id);
  if (!found) throw new Error(`no item ${id}`);
  return found;
}

function project(roadmap: Roadmap, id: string): ProjectItem {
  const found = item(roadmap, id);
  if (found.type !== 'project') throw new Error(`${id} is not a project`);
  return found;
}

describe('decidePlan: the progress rule (#168)', () => {
  it('completes the task an approved piece of evidence proves, and dates the approval', async () => {
    const plan = decidePlan(await getRoadmap(), { 'ev-sales-model': 'approved' }, NOW);
    const dashboard = project(plan, 'sales-dashboard');

    expect(dashboard.tasks.find((t) => t.id === 'model-data')?.done).toBe(true);
    expect(dashboard.evidence.find((e) => e.id === 'ev-sales-model')?.approvedAt).toBe(NOW);
    // Two of three tasks: started, not finished.
    expect(dashboard.status).toBe('in_progress');
  });

  it('moves the deliverable and its station to done once the last open task is approved', async () => {
    const roadmap = await lastTaskOpen();
    const before = deriveRoadmapView(roadmap);
    expect(before.statusByMilestone.get('public-dashboard')).toBe('in_progress');

    const plan = decidePlan(roadmap, { 'ev-sales-model': 'approved' }, NOW);

    expect(project(plan, 'sales-dashboard').status).toBe('done');
    expect(deriveRoadmapView(plan).statusByMilestone.get('public-dashboard')).toBe('done');
  });

  it('restores everything when the approval is taken back', async () => {
    const roadmap = await lastTaskOpen();
    const approved = decidePlan(roadmap, { 'ev-sales-model': 'approved' }, NOW);
    const undone = decidePlan(roadmap, {}, NOW);

    expect(project(approved, 'sales-dashboard').status).toBe('done');
    expect(undone).toEqual(roadmap);
  });

  it('drops rejected evidence, so it completes nothing and awaits nothing', async () => {
    const roadmap = await getRoadmap();
    const plan = decidePlan(roadmap, { 'ev-sales-model': 'rejected' }, NOW);
    const dashboard = project(plan, 'sales-dashboard');

    expect(dashboard.evidence.map((e) => e.id)).toEqual(['ev-sales-questions']);
    expect(dashboard.tasks.find((t) => t.id === 'model-data')?.done).toBe(false);
    expect(tabBadges(plan).projects?.attention?.value).toBe(
      (tabBadges(roadmap).projects?.attention?.value ?? 0) - 1,
    );
  });

  it('keeps the stored status of a deliverable without tasks, whatever is approved', async () => {
    const roadmap = await getRoadmap();
    const plan = decidePlan(roadmap, { 'ev-requirements-writeup': 'approved' }, NOW);
    const workshop = item(plan, 'requirements-workshop');

    expect(workshop.evidence[0]?.approvedAt).toBe(NOW);
    expect(workshop.status).toBe(item(roadmap, 'requirements-workshop').status);
  });

  it('keeps a project with no task done at its stored status', async () => {
    const roadmap = await getRoadmap();
    expect(project(decidePlan(roadmap, {}, NOW), 'open-data-case').status).toBe('pending');
  });

  it('never changes a gap: what closes one is open for F3 (#43)', async () => {
    const roadmap = await lastTaskOpen();
    const plan = decidePlan(roadmap, { 'ev-sales-model': 'approved' }, NOW);

    expect(plan.gaps).toBe(roadmap.gaps);
  });

  it('counts the approval in the Projects badge: one task and one awaiting fewer', async () => {
    const roadmap = await getRoadmap();
    const before = tabBadges(roadmap).projects;
    const after = tabBadges(decidePlan(roadmap, { 'ev-sales-model': 'approved' }, NOW)).projects;

    expect(after?.count?.value).toBe((before?.count?.value ?? 0) - 1);
    expect(after?.attention?.value).toBe((before?.attention?.value ?? 0) - 1);
  });
});

describe('decidedEvidence', () => {
  const awaiting = {
    id: 'e1',
    sourceType: 'commit' as const,
    sourceRef: 'a3f9c21',
    approvedAt: null,
  };
  const stored = { ...awaiting, id: 'e2', approvedAt: '2026-10-01T00:00:00.000Z' };

  it('dates an approval and drops a rejection', () => {
    expect(decidedEvidence([awaiting], { e1: 'approved' }, NOW)).toEqual([
      { ...awaiting, approvedAt: NOW },
    ]);
    expect(decidedEvidence([awaiting], { e1: 'rejected' }, NOW)).toEqual([]);
  });

  it('leaves what nobody decided, and never touches a stored approval', () => {
    expect(decidedEvidence([awaiting, stored], { e2: 'rejected' }, NOW)).toEqual([
      awaiting,
      stored,
    ]);
  });
});

describe('decisionOf', () => {
  const awaiting = {
    id: 'e1',
    sourceType: 'commit' as const,
    sourceRef: 'a3f9c21',
    approvedAt: null,
  };

  it('reads a stored approval first: it is the record', () => {
    expect(decisionOf({ ...awaiting, approvedAt: NOW }, { e1: 'rejected' })).toBe('approved');
  });

  it('falls back to this visit’s decision, else awaiting', () => {
    expect(decisionOf(awaiting, {})).toBe('awaiting');
    expect(decisionOf(awaiting, { e1: 'rejected' })).toBe('rejected');
  });
});
