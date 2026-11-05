import { describe, expect, it } from 'vitest';

import type { Profile } from '../src/profile.js';
import { checkAnalysis, ProfileAnalysis } from '../src/provisional/index.js';

const analysis: ProfileAnalysis = {
  profileUpdatedAt: '2026-10-14T18:30:00.000Z',
  analyzedAt: '2026-10-14T18:45:00.000Z',
  subtitle: 'Support specialist moving into data',
  summary: 'Support first, with a growing data side.',
  feedback: [{ kind: 'improve', text: 'No bullet has a number yet.' }],
};

describe('ProfileAnalysis', () => {
  it('keeps the subtitle short', () => {
    const subtitle = 'x'.repeat(81);

    expect(ProfileAnalysis.safeParse(analysis).success).toBe(true);
    expect(ProfileAnalysis.safeParse({ ...analysis, subtitle }).success).toBe(false);
  });
});

describe('checkAnalysis', () => {
  it('accepts an analysis of this version of the profile', () => {
    expect(checkAnalysis(analysis, { updatedAt: analysis.profileUpdatedAt } as Profile)).toEqual(
      [],
    );
  });

  it('flags an analysis of another version', () => {
    expect(checkAnalysis(analysis, { updatedAt: '2026-11-01T00:00:00.000Z' } as Profile)).toEqual([
      'the analysis read another version of the profile',
    ]);
  });
});
