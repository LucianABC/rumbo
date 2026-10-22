import {
  checkLayout,
  type LineColorToken,
  Profile,
  Roadmap,
  RoadmapLayout,
  targetColors,
} from '@rumbo/contracts';
import { Market } from '@rumbo/contracts/provisional';
import { connection } from 'next/server';
import type { z } from 'zod';

import { market } from '../../mocks/market';
import { profile } from '../../mocks/profile';
import { roadmap } from '../../mocks/roadmap';
import { roadmapLayout } from '../../mocks/roadmap-layout';
import { type ProfileSummary, summarize } from '../profile-summary';
import { type LocalMockName, readLocalMock } from './local-mocks';

/**
 * The only place views get data from (spec 01, #103). Today every function reads a mock; each one
 * switches to the typed API client (#79) when its feature serves real data, and no view changes.
 * Invalid data always surfaces as a rejected promise, never a synchronous throw, as it will from
 * the API.
 *
 * Every read waits for `connection()`, so pages built on lib/data render per request, never at
 * build time: swapping a mock for the API cannot make `next build` call the API or bake one
 * user's data into static HTML (#104).
 *
 * On the owner's machine a local JSON file can replace a mock, validated the same way
 * (./local-mocks.ts, #137).
 */

export async function getRoadmap(): Promise<Roadmap> {
  await connection();
  return parse(Roadmap, await localOr('roadmap', roadmap), 'roadmap');
}

/**
 * The map's layout, or null when it is missing, malformed or does not fit this roadmap: the view
 * then degrades to the single-line list instead of failing (spec 01, #103).
 */
export async function getRoadmapLayout(forRoadmap: Roadmap): Promise<RoadmapLayout | null> {
  await connection();
  const layout = RoadmapLayout.safeParse(await localOr('roadmap-layout', roadmapLayout));
  if (!layout.success || checkLayout(forRoadmap, layout.data).length > 0) return null;
  return layout.data;
}

/** The user's profile: header, experiences, education, skills and their evidence (#145). */
export async function getProfile(): Promise<Profile> {
  await connection();
  return parse(Profile, await localOr('profile', profile), 'profile');
}

/** Who the user is in one line: current role, years of experience, strongest skills (#145). */
export async function getProfileSummary(forProfile?: Profile): Promise<ProfileSummary> {
  return summarize(forProfile ?? (await getProfile()), new Date());
}

/** One market snapshot per active target; provisional until the F2 spec (#42, #145). */
export async function getMarket(): Promise<Market> {
  await connection();
  return parse(Market, await localOr('market', market), 'market');
}

/**
 * Each target's color slot for every tab: one source, so a target looks the same on the map, gap
 * chips and market bars, and keeps its color without a layout (views.md, #102). Takes the data the
 * view already loaded instead of parsing it again.
 */
export function getTargetColors(
  forRoadmap: Roadmap,
  layout: RoadmapLayout | null,
): ReadonlyMap<string, LineColorToken> {
  return targetColors(forRoadmap, layout ?? undefined);
}

/** The owner's local file when there is one, whatever it holds; else the bundled mock (#137). */
async function localOr(name: LocalMockName, bundled: unknown): Promise<unknown> {
  const local = await readLocalMock(name);
  return local.found ? local.data : bundled;
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
