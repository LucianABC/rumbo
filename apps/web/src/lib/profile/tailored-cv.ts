import type { Experience, Profile } from '@rumbo/contracts';
import { sameValue, type TailoredCv } from '@rumbo/contracts/provisional';

import type { CvChange, CvEntryChange } from './tailored-cv.types';

/**
 * A target's CV laid out as a profile (#191), so it renders like Base. Its content is the copy the
 * CV saved when it was written, so editing Base never changes a saved CV before Regenerate
 * (docs/product/views.md, Profile, CV per target). Name, contact and languages follow Base: they
 * do not mark a CV out of date, so the CV shows them as they are now.
 */
export function applyCv(profile: Profile, cv: TailoredCv): Profile {
  const { about: _baseAbout, ...rest } = profile;
  return {
    ...rest,
    headline: cv.headline,
    ...(cv.about === null ? {} : { about: cv.about }),
    experiences: cv.experiences,
    education: cv.education,
    certifications: cv.certifications,
    skills: cv.skills,
  };
}

/** What the CV changes from Base, section by section, in the CV's reading order (#191). */
export function cvChanges(base: Profile, cv: TailoredCv): CvChange[] {
  const changes: CvChange[] = [];
  if (cv.headline !== base.headline) {
    changes.push({ section: 'headline', before: base.headline, after: cv.headline });
  }
  if (cv.about !== (base.about ?? null)) {
    changes.push({ section: 'about', before: base.about ?? null, after: cv.about });
  }
  const inCv = new Map(cv.experiences.map((e) => [e.id, e]));
  for (const experience of base.experiences) {
    const copy = inCv.get(experience.id);
    if (!copy) {
      changes.push(position(experience, 'omitted', [], []));
      continue;
    }
    const removed = experience.highlights.filter((h) => !copy.highlights.includes(h));
    const added = copy.highlights.filter((h) => !experience.highlights.includes(h));
    const factsChanged = !sameValue(facts(experience), facts(copy));
    if (factsChanged || removed.length + added.length > 0) {
      changes.push(position(copy, factsChanged ? 'changedInBase' : 'reworded', removed, added));
    }
  }
  const inBase = new Set(base.experiences.map((e) => e.id));
  for (const copy of cv.experiences) {
    if (!inBase.has(copy.id)) changes.push(position(copy, 'notInBase', [], []));
  }
  const entries = [
    entryChange('skills', base.skills, cv.skills, (s) => s.skill.name),
    entryChange('education', base.education, cv.education, (e) => e.credential),
    entryChange('certifications', base.certifications, cv.certifications, (c) => c.name),
  ];
  for (const change of entries) {
    if (change.omitted.length + change.notInBase.length + change.changedInBase.length > 0) {
      changes.push(change);
    }
  }
  return changes;
}

function facts({ highlights: _bullets, ...rest }: Experience) {
  return rest;
}

function position(
  experience: Experience,
  status: Extract<CvChange, { section: 'position' }>['status'],
  removed: readonly string[],
  added: readonly string[],
): CvChange {
  return {
    section: 'position',
    experienceId: experience.id,
    title: experience.title,
    status,
    removed,
    added,
  };
}

/** Entries Base has that the CV leaves out, and the CV's copies Base has dropped or changed. */
function entryChange<T extends { readonly id: string }>(
  section: CvEntryChange['section'],
  base: readonly T[],
  cv: readonly T[],
  name: (entry: T) => string,
): CvEntryChange {
  const baseById = new Map(base.map((e) => [e.id, e]));
  const cvIds = new Set(cv.map((e) => e.id));
  return {
    section,
    omitted: base.filter((e) => !cvIds.has(e.id)).map(name),
    notInBase: cv.filter((e) => !baseById.has(e.id)).map(name),
    changedInBase: cv
      .filter((e) => {
        const now = baseById.get(e.id);
        return now !== undefined && !sameValue(now, e);
      })
      .map(name),
  };
}

/**
 * Whether the profile's content changed since the CV was written from it (docs/product/views.md,
 * Profile, CV per target): skills, experience, education, certifications or about. Name, contact
 * and headline edits do not count, since the CV writes its own headline.
 *
 * `imported` is the profile as loaded, before this visit's edits. A CV written from an earlier
 * version of it is out of date as a whole: which fields changed since cannot be told, and saying
 * it is current could hand the user a CV that contradicts Base.
 */
export function cvOutdated(cv: TailoredCv, imported: Profile, current: Profile): boolean {
  if (cv.profileUpdatedAt !== imported.updatedAt) return true;
  const content = (p: Profile) =>
    JSON.stringify([p.skills, p.experiences, p.education, p.certifications, p.about ?? null]);
  return content(imported) !== content(current);
}
