import { Roadmap, RoadmapLayout } from '@rumbo/contracts';
import type { z } from 'zod';

import { roadmap } from '../../mocks/roadmap';
import { roadmapLayout } from '../../mocks/roadmap-layout';

/**
 * The only place views get data from (spec 01, #103). Today every function reads a mock; each one
 * switches to the typed API client (#79) when its feature serves real data, and no view changes.
 */

export function getRoadmap(): Promise<Roadmap> {
  return Promise.resolve(parse(Roadmap, roadmap, 'roadmap'));
}

export function getRoadmapLayout(): Promise<RoadmapLayout> {
  return Promise.resolve(parse(RoadmapLayout, roadmapLayout, 'roadmap layout'));
}

/** Validates data as untrusted, failing with every issue and its path. */
export function parse<T>(schema: z.ZodType<T>, input: unknown, name: string): T {
  const result = schema.safeParse(input);
  if (!result.success) {
    const issues = result.error.issues.map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`);
    throw new Error(`Invalid ${name}:\n${issues.join('\n')}`);
  }
  return result.data;
}
