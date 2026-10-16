import { checkLayout, Roadmap } from '@rumbo/contracts';
import { describe, expect, it } from 'vitest';

import { getRoadmap, getRoadmapLayout, parse } from '../src/lib/data';

describe('lib/data', () => {
  it('serves a roadmap and a layout that fits it', async () => {
    const [roadmap, layout] = await Promise.all([getRoadmap(), getRoadmapLayout()]);

    expect(roadmap.targets.filter((t) => t.isPrimary)).toHaveLength(1);
    expect(checkLayout(roadmap, layout)).toEqual([]);
  });

  it('fails with a readable message that names the broken path', async () => {
    const roadmap = await getRoadmap();
    const broken = { ...roadmap, targets: [] };

    expect(() => parse(Roadmap, broken, 'roadmap')).toThrow(/Invalid roadmap:\ntargets: /);
  });
});
