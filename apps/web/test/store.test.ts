import type { ProjectItem } from '@rumbo/contracts';
import { describe, expect, it, vi } from 'vitest';

import { getProfile } from '../src/lib/data';
import { testStore } from './support/store';

vi.mock('next/server', () => ({ connection: () => Promise.resolve() }));

function dashboard(items: readonly { id: string }[]): ProjectItem {
  const found = items.find((i) => i.id === 'sales-dashboard');
  if (!found) throw new Error('no sales-dashboard');
  return found as ProjectItem;
}

describe('app store (#168)', () => {
  it('keeps each kind of decision apart, so ids can never collide', async () => {
    const store = await testStore();
    store.getState().decide('evidence', 'same-id', 'approved');

    expect(store.getState().decisions.evidence).toEqual({ 'same-id': 'approved' });
    expect(store.getState().decisions.drafts).toEqual({});
  });

  it('replaces a decision and takes it back', async () => {
    const store = await testStore();
    const { decide } = store.getState();
    decide('drafts', 'a', 'approved');
    decide('drafts', 'b', 'rejected');
    decide('drafts', 'a', 'rejected');
    expect(store.getState().decisions.drafts).toEqual({ a: 'rejected', b: 'rejected' });

    decide('drafts', 'a', null);
    expect(store.getState().decisions.drafts).toEqual({ b: 'rejected' });
  });

  it('starts empty, so the server never renders anyone else’s decisions or edits', async () => {
    const store = await testStore();

    expect(store.getInitialState().decisions).toEqual({ drafts: {}, evidence: {} });
    expect(store.getInitialState().editedProfile).toBeNull();
  });

  it('never shares state between two stores, as two requests would get', async () => {
    const [first, second] = await Promise.all([testStore(), testStore()]);
    first.getState().decide('evidence', 'ev-sales-model', 'approved');
    first.getState().saveProfile(await getProfile());

    expect(second.getState().decisions.evidence).toEqual({});
    expect(second.getState().editedProfile).toBeNull();
    expect(second.getState().plan).not.toBe(first.getState().plan);
  });

  it('derives the plan again on an evidence decision, and only then', async () => {
    const store = await testStore();
    const items = () => store.getState().plan.roadmap.milestones.flatMap((m) => m.items);
    const open = () => dashboard(items()).tasks.find((t) => t.id === 'model-data')?.done;
    expect(open()).toBe(false);

    const before = store.getState().plan;
    store.getState().decide('drafts', 'headline', 'approved');
    expect(store.getState().plan).toBe(before);

    store.getState().decide('evidence', 'ev-sales-model', 'approved');
    expect(open()).toBe(true);
    // The stored data stays as it came, so the decision can be taken back.
    expect(
      dashboard(store.getState().source.roadmap.milestones.flatMap((m) => m.items)).tasks,
    ).toContainEqual(expect.objectContaining({ id: 'model-data', done: false }));

    store.getState().decide('evidence', 'ev-sales-model', null);
    expect(open()).toBe(false);
  });

  it('keeps what was saved on Profile', async () => {
    const store = await testStore();
    const profile = await getProfile();

    store.getState().saveProfile(profile);

    expect(store.getState().editedProfile).toBe(profile);
  });
});
