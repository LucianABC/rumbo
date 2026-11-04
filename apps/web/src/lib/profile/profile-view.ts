import type { Experience, Language, Profile, ProfileSkill, ProfileSource } from '@rumbo/contracts';
import type { DraftChange } from '@rumbo/contracts/provisional';

import { formatDay, formatDuration, formatPartialDate } from '../format';
import { monthsWorked } from '../profile-summary';
import type { Lane } from '../roadmap/single-line';

/**
 * The Profile tab as data (docs/product/views.md, #113). Pure, so every rule is unit-tested here;
 * the components only lay it out.
 */

export const LANGUAGE_LEVEL_LABEL: Readonly<Record<Language['level'], string>> = {
  elementary: 'Elementary',
  limited: 'Limited working',
  professional: 'Professional working',
  full_professional: 'Full professional',
  native: 'Native',
};

/** "AR" from "Alex Rivera": first and last word, for the avatar that stands in for a photo. */
export function initials(name: string): string {
  const words = name.trim().split(/\s+/);
  const ends = words.length > 1 ? [words[0], words.at(-1)] : words;
  return ends.map((word) => word?.[0]?.toUpperCase() ?? '').join('');
}

/** Open positions first, then the most recent start: the order a CV reads in. */
export function timeline(
  experiences: readonly Experience[],
  now: Date,
): (Experience & { readonly period: string })[] {
  return [...experiences]
    .sort(
      (a, b) =>
        Number(a.end !== null) - Number(b.end !== null) ||
        b.start.slice(0, 7).localeCompare(a.start.slice(0, 7)),
    )
    .map((e) => ({
      ...e,
      period: `${formatPartialDate(e.start)} – ${e.end === null ? 'Present' : formatPartialDate(e.end)} · ${formatDuration(monthsWorked([e], now))}`,
    }));
}

/** "2017 – 2019", one end alone, or null when the entry has no dates. */
export function educationPeriod(start?: string, end?: string): string | null {
  const dates = [start, end].flatMap((d) => (d ? [formatPartialDate(d)] : []));
  return dates.length > 0 ? dates.join(' – ') : null;
}

export interface SkillRow {
  readonly skill: ProfileSkill;
  readonly approved: number;
  readonly awaiting: number;
}

/**
 * Skills by category, each category in the order it first appears and the best-backed skills
 * first, as a CV leads with them; only approved evidence counts yet.
 */
export function skillGroups(skills: readonly ProfileSkill[]): [string, SkillRow[]][] {
  const groups = new Map<string, SkillRow[]>();
  for (const skill of skills) {
    const approved = skill.evidence.filter((e) => e.approvedAt !== null).length;
    const row = { skill, approved, awaiting: skill.evidence.length - approved };
    groups.set(skill.category, [...(groups.get(skill.category) ?? []), row]);
  }
  return [...groups].map(([category, rows]) => [
    category,
    rows.sort((a, b) => b.approved - a.approved || b.awaiting - a.awaiting),
  ]);
}

/** The latest import of each kind: re-importing replaces what the earlier one brought. */
export function lastImports(
  sources: readonly ProfileSource[],
): Partial<Record<ProfileSource['kind'], string>> {
  const latest: Partial<Record<ProfileSource['kind'], string>> = {};
  for (const { kind, importedAt } of sources) {
    const seen = latest[kind];
    if (seen === undefined || importedAt > seen) latest[kind] = importedAt;
  }
  return latest;
}

/** The tab's provenance line; the strip below it says where the data came from. */
export function profileProvenance(profile: Profile): string {
  return `Updated ${formatDay(profile.updatedAt)}`;
}

/** Readable names for the profile entries evidence points at (#111). */
export function sourceNames(profile: Profile): Record<string, string> {
  const entries: [string, string][] = [
    ...profile.experiences.map((e): [string, string] => [e.id, `${e.title} · ${e.organization}`]),
    ...profile.certifications.map((c): [string, string] => [
      c.id,
      c.issuer ? `${c.name} · ${c.issuer}` : c.name,
    ]),
  ];
  return Object.fromEntries(entries);
}

/**
 * LinkedIn's edit pages per section. `/in/me` resolves to whoever is signed in, so no stored URL
 * is needed. LinkedIn does not document these paths: F4 (#44) checks them before relying on them.
 */
const LINKEDIN_EDIT: Readonly<Record<DraftChange['section'], string>> = {
  headline: 'https://www.linkedin.com/in/me/edit/intro/',
  about: 'https://www.linkedin.com/in/me/edit/forms/summary/new/',
  experience: 'https://www.linkedin.com/in/me/details/experience/',
};

export interface Suggestion {
  readonly change: DraftChange;
  /** What it changes, in words: "Headline", or "Bullet · Title · Organization". */
  readonly place: string;
  readonly target: { readonly name: string; readonly color: Lane['color'] };
  /** When rumbo suggested it, as the row shows it. */
  readonly date: string;
  readonly editUrl: string;
}

/** Each change with what the view says about it; lib/data has checked they fit (#113). */
export function suggestions(
  changes: readonly DraftChange[],
  profile: Profile,
  lanes: readonly Lane[],
): Suggestion[] {
  const names = sourceNames(profile);
  return changes.flatMap((change) => {
    const lane = lanes.find((l) => l.target.id === change.targetId);
    if (!lane) return [];
    return [
      {
        change,
        place: placeOf(change, names),
        target: { name: lane.target.roleFamily.name, color: lane.color },
        date: formatDay(change.createdAt),
        editUrl: LINKEDIN_EDIT[change.section],
      },
    ];
  });
}

function placeOf(change: DraftChange, names: Readonly<Record<string, string>>): string {
  if (change.section === 'headline') return 'Headline';
  if (change.section === 'about') return 'About';
  const position = names[change.experienceId] ?? change.experienceId;
  return `${change.before === null ? 'New bullet' : 'Bullet'} · ${position}`;
}
