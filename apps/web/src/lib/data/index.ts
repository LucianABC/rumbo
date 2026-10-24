import {
  checkLayout,
  type LineColorToken,
  Profile,
  Roadmap,
  RoadmapLayout,
  targetColors,
} from '@rumbo/contracts';
import { checkMarket, Market } from '@rumbo/contracts/provisional';
import { connection } from 'next/server';
import type { z } from 'zod';

import { market as bundledMarket } from '../../mocks/market';
import { profile } from '../../mocks/profile';
import { roadmap } from '../../mocks/roadmap';
import { roadmapLayout } from '../../mocks/roadmap-layout';
import { skillsAskedForMost } from '../coverage';
import { logger } from '../logger';
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

/**
 * Who the user is in one line: current role, years of relevant experience, strongest skills.
 * Relevance comes from what the roadmap's targets ask for most in the market (#145). Takes the
 * data the view already loaded instead of reading and parsing it again, like getTargetColors.
 */
export function getProfileSummary(
  forProfile: Profile,
  market: Market,
  forRoadmap: Roadmap,
): ProfileSummary {
  const relevant = skillsAskedForMost(
    market,
    forRoadmap.targets.map((t) => t.id),
  );
  return summarize(forProfile, new Date(), relevant);
}

/**
 * One market snapshot per active target of this roadmap; provisional until the F2 spec (#42).
 * A market that does not fit the roadmap rejects like invalid data: a target without numbers is a
 * data error, not a state to render around (#145).
 */
export async function getMarket(forRoadmap: Roadmap): Promise<Market> {
  await connection();
  const market = parse(Market, await localOr('market', bundledMarket), 'market');
  const problems = checkMarket(market, forRoadmap);
  if (problems.length > 0) throw new Error(`Invalid market:\n${problems.join('\n')}`);
  return market;
}

/**
 * Profile and market for the Roadmap summary band, or null when either is invalid or does not fit
 * the roadmap: the map does not need them, so only the band degrades (#112). Takes the profile
 * already in flight so the page can start it before the roadmap resolves. Each failure is logged
 * as `{ err }`, its type and code only: the message lists data paths (AI rule 5).
 */
export async function getSummaryData(
  pendingProfile: Promise<Profile>,
  forRoadmap: Roadmap,
): Promise<{ profile: Profile; market: Market } | null> {
  const [profile, market] = await Promise.allSettled([pendingProfile, getMarket(forRoadmap)]);
  if (profile.status === 'fulfilled' && market.status === 'fulfilled') {
    return { profile: profile.value, market: market.value };
  }
  for (const [source, result] of [
    ['profile', profile],
    ['market', market],
  ] as const) {
    if (result.status === 'rejected') {
      logger.warn({ err: result.reason, source }, 'roadmap summary unavailable');
    }
  }
  return null;
}

/**
 * Profile and market for Skills & gaps, each null when it is invalid or does not fit the roadmap:
 * gaps carry their own numbers, so each section degrades on its own instead of the whole tab
 * failing (#111). Failures are logged like getSummaryData's.
 */
export async function getSkillsData(
  forRoadmap: Roadmap,
): Promise<{ profile: Profile | null; market: Market | null }> {
  const [profile, market] = await Promise.allSettled([getProfile(), getMarket(forRoadmap)]);
  for (const [source, result] of [
    ['profile', profile],
    ['market', market],
  ] as const) {
    if (result.status === 'rejected') {
      logger.warn({ err: result.reason, source }, 'skills data unavailable');
    }
  }
  return {
    profile: profile.status === 'fulfilled' ? profile.value : null,
    market: market.status === 'fulfilled' ? market.value : null,
  };
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
