import type { Experience, PartialDate, Profile, SkillRef } from '@rumbo/contracts';

/**
 * Who the user is, in one line, for the Roadmap summary band (docs/product/views.md, #145):
 * current role, years of relevant experience and the skills with the most approved evidence.
 */

export interface ProfileSummary {
  readonly name: string;
  /** The current position, or the latest one when none is open. */
  readonly currentRole: { readonly title: string; readonly organization: string } | null;
  /** Whole years worked in any position, overlapping positions counted once. */
  readonly yearsOfExperience: number;
  /**
   * Whole years in positions relevant to the targets: those whose approved evidence backs a skill
   * the targets ask for most. Derived, so it follows the targets when they change (#145).
   */
  readonly yearsOfRelevantExperience: number;
  readonly strongestSkills: readonly { readonly skill: SkillRef; readonly evidenceCount: number }[];
}

const STRONGEST = 3;

/** Months since year 0, so date ranges can be added and compared. "2021" counts from January. */
function months(date: PartialDate): number {
  const [year, month] = date.split('-');
  return Number(year) * 12 + (month ? Number(month) - 1 : 0);
}

function monthsOf(now: Date): number {
  return now.getUTCFullYear() * 12 + now.getUTCMonth();
}

/** Total months covered by the positions, counting overlaps once; open positions run to `now`. */
export function monthsWorked(experiences: readonly Experience[], now: Date): number {
  const ranges = experiences
    .map((e) => {
      const start = months(e.start);
      // Inclusive months: a position from 2021-03 to 2021-03 lasted one month.
      return [start, (e.end === null ? monthsOf(now) : months(e.end)) + 1] as const;
    })
    .filter(([start, end]) => end > start)
    .sort((a, b) => a[0] - b[0]);

  let total = 0;
  let reach = -Infinity;
  for (const [start, end] of ranges) {
    if (end <= reach) continue;
    total += end - Math.max(start, reach);
    reach = end;
  }
  return total;
}

/** Positions cited by approved evidence for any of these skills. */
export function relevantExperiences(profile: Profile, skillIds: ReadonlySet<string>): Experience[] {
  const cited = new Set(
    profile.skills
      .filter((s) => skillIds.has(s.skill.id))
      .flatMap((s) => s.evidence)
      .filter((e) => e.sourceType === 'experience' && e.approvedAt !== null)
      .map((e) => e.sourceRef),
  );
  return profile.experiences.filter((e) => cited.has(e.id));
}

/** `relevantSkills`: the skills the active targets ask for most (lib/coverage.ts). */
export function summarize(
  profile: Profile,
  now: Date,
  relevantSkills: ReadonlySet<string>,
): ProfileSummary {
  const byRecency = [...profile.experiences].sort(
    (a, b) => Number(b.end === null) - Number(a.end === null) || months(b.start) - months(a.start),
  );
  const latest = byRecency[0];

  const strongestSkills = profile.skills
    .map((s) => ({
      skill: s.skill,
      evidenceCount: s.evidence.filter((e) => e.approvedAt !== null).length,
    }))
    .filter((s) => s.evidenceCount > 0)
    .sort((a, b) => b.evidenceCount - a.evidenceCount || a.skill.name.localeCompare(b.skill.name))
    .slice(0, STRONGEST);

  return {
    name: profile.name,
    currentRole: latest ? { title: latest.title, organization: latest.organization } : null,
    yearsOfExperience: Math.floor(monthsWorked(profile.experiences, now) / 12),
    yearsOfRelevantExperience: Math.floor(
      monthsWorked(relevantExperiences(profile, relevantSkills), now) / 12,
    ),
    strongestSkills,
  };
}
