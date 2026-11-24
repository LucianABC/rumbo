import type { Profile } from '@rumbo/contracts';
import type { TailoredCv } from '@rumbo/contracts/provisional';

import type { CvChange } from './tailored-cv.types';

/**
 * A target's CV laid out as a profile (#191), so it renders like Base: the CV's own headline,
 * about and bullets over the profile's facts, keeping only the positions and skills it picked. A
 * position or skill deleted from the profile since is simply not there.
 */
export function applyCv(profile: Profile, cv: TailoredCv): Profile {
  const positions = new Map(cv.positions.map((p) => [p.experienceId, p.highlights]));
  const skills = new Set(cv.skillIds);
  const { about: _baseAbout, ...rest } = profile;
  return {
    ...rest,
    headline: cv.headline,
    ...(cv.about === null ? {} : { about: cv.about }),
    experiences: profile.experiences.flatMap((experience) => {
      const highlights = positions.get(experience.id);
      return highlights ? [{ ...experience, highlights }] : [];
    }),
    skills: profile.skills.filter((skill) => skills.has(skill.id)),
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
  for (const experience of base.experiences) {
    const position = cv.positions.find((p) => p.experienceId === experience.id);
    const highlights = position?.highlights ?? [];
    const removed = experience.highlights.filter((h) => !highlights.includes(h));
    const added = highlights.filter((h) => !experience.highlights.includes(h));
    if (!position || removed.length + added.length > 0) {
      changes.push({
        section: 'position',
        experienceId: experience.id,
        title: experience.title,
        omitted: !position,
        removed,
        added,
      });
    }
  }
  const kept = new Set(cv.skillIds);
  const omitted = base.skills.filter((s) => !kept.has(s.id)).map((s) => s.skill.name);
  if (omitted.length > 0) changes.push({ section: 'skills', omitted });
  return changes;
}

/**
 * Whether the profile's content changed since the CV was written from it (docs/product/views.md,
 * Profile, CV per target): skills, experience, education, certifications or about. Name, contact
 * and headline edits do not count, since the CV writes its own headline.
 */
export function cvOutdated(writtenFrom: Profile, current: Profile): boolean {
  const content = (p: Profile) =>
    JSON.stringify([p.skills, p.experiences, p.education, p.certifications, p.about ?? null]);
  return content(writtenFrom) !== content(current);
}
