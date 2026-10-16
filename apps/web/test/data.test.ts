import { Roadmap } from '@rumbo/contracts';
import { describe, expect, it } from 'vitest';

import { getRoadmap, getRoadmapLayout, getTargetColors, parse } from '../src/lib/data';

describe('lib/data', () => {
  it('serves a roadmap and a layout that fits it', async () => {
    const roadmap = await getRoadmap();

    expect(roadmap.targets.filter((t) => t.isPrimary)).toHaveLength(1);
    expect(await getRoadmapLayout(roadmap)).not.toBeNull();
  });

  it('degrades to no layout when the layout does not fit the roadmap', async () => {
    const roadmap = await getRoadmap();
    const extra = {
      ...roadmap.milestones[0],
      id: 'unplaced-milestone',
    } as Roadmap['milestones'][number];
    const changed = { ...roadmap, milestones: [...roadmap.milestones, extra] };

    expect(await getRoadmapLayout(changed)).toBeNull();
  });

  it('rejects invalid data with a readable message that names the broken path', async () => {
    const roadmap = await getRoadmap();

    expect(() => parse(Roadmap, { ...roadmap, targets: [] }, 'roadmap')).toThrow(
      /Invalid roadmap:\ntargets: /,
    );
  });

  it('gives every target the color its layout assigns, and a fallback without one', async () => {
    const roadmap = await getRoadmap();
    const layout = await getRoadmapLayout(roadmap);
    const expected = {
      'data-analyst': 'line-1',
      'business-analyst': 'line-2',
      'support-ops-lead': 'line-3',
    };

    expect(Object.fromEntries(getTargetColors(roadmap, layout))).toEqual(expected);
    expect(Object.fromEntries(getTargetColors(roadmap, null))).toEqual(expected);
  });
});
