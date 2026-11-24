// @vitest-environment happy-dom
import { act, cleanup, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ProjectsTab } from '../src/components/projects/projects-tab';
import { inStore, lastTaskOpen, testStore } from './support/store';

vi.mock('next/server', () => ({ connection: () => Promise.resolve() }));

afterEach(cleanup);

const PLACE = 'Commit a3f9c21, Sales dashboard project';

/** Projects as the browser runs it, with the dashboard one approval away from done. */
async function mount() {
  const store = await testStore({}, { roadmap: await lastTaskOpen(), profile: null });
  render(inStore(store, createElement(ProjectsTab, { progress: null })));
}

function section(id: string): HTMLElement {
  const found = document.getElementById(id);
  if (!found) throw new Error(`no section ${id}`);
  return found;
}

describe('Projects keyboard focus (#168)', () => {
  it('keeps the focus on the evidence when approving it finishes the project', async () => {
    await mount();
    const approve = screen.getByRole('button', { name: `Approve: ${PLACE}` });
    expect(section('active').contains(approve)).toBe(true);

    approve.focus();
    act(() => {
      approve.click();
    });

    // The card moved to Completed and was mounted anew: its Undo takes the focus.
    const undo = screen.getByRole('button', { name: `Undo approved: ${PLACE}` });
    expect(section('completed').contains(undo)).toBe(true);
    expect(document.activeElement).toBe(undo);
  });

  it('keeps it when taking the approval back reopens the project', async () => {
    await mount();
    act(() => {
      screen.getByRole('button', { name: `Approve: ${PLACE}` }).click();
    });

    act(() => {
      screen.getByRole('button', { name: `Undo approved: ${PLACE}` }).click();
    });

    const approve = screen.getByRole('button', { name: `Approve: ${PLACE}` });
    expect(section('active').contains(approve)).toBe(true);
    expect(document.activeElement).toBe(approve);
  });

  it('moves the focus within the card when the project stays where it is', async () => {
    const store = await testStore({}, { profile: null });
    render(inStore(store, createElement(ProjectsTab, { progress: null })));

    act(() => {
      screen.getByRole('button', { name: `Reject: ${PLACE}` }).click();
    });

    expect(document.activeElement).toBe(
      screen.getByRole('button', { name: `Undo rejected: ${PLACE}` }),
    );
  });
});
