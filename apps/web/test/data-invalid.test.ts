import { describe, expect, it, vi } from 'vitest';

import { getRoadmap, getRoadmapLayout } from '../src/lib/data';

// Broken mocks stand in for a bad API payload: views must get a rejection, not a sync throw.
vi.mock('next/server', () => ({ connection: () => Promise.resolve() }));
vi.mock('../src/mocks/roadmap', () => ({ roadmap: { from: 'x', targets: [] } }));
vi.mock('../src/mocks/roadmap-layout', () => ({ roadmapLayout: { lines: 'not an array' } }));

describe('lib/data with invalid data', () => {
  it('rejects instead of throwing synchronously', async () => {
    let pending: Promise<unknown> | undefined;
    expect(() => {
      pending = getRoadmap();
    }).not.toThrow();

    await expect(pending).rejects.toThrow(/Invalid roadmap:/);
  });

  it('returns no layout for a malformed layout', async () => {
    const roadmap = { targets: [], milestones: [] } as unknown as Parameters<
      typeof getRoadmapLayout
    >[0];

    await expect(getRoadmapLayout(roadmap)).resolves.toBeNull();
  });
});
