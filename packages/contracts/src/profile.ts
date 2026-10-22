import { z } from 'zod';

import { Id, WebUrl } from './ids.js';
import { EvidenceRef, SkillRef } from './roadmap.js';

/**
 * One user's professional profile as the views read it (ADR 0004, docs/product/views.md, #145):
 * who they are, where they worked and studied, and each skill with the evidence behind it. F1
 * (#41) extracts it from a CV or a LinkedIn export and its spec may adjust this shape.
 */

/** A year, or a year and month: what CVs and LinkedIn exports actually give (`2021`, `2021-03`). */
export const PartialDate = z.string().regex(/^\d{4}(-(0[1-9]|1[0-2]))?$/);
export type PartialDate = z.infer<typeof PartialDate>;

export const Experience = z.object({
  /** Referenced by evidence with `sourceType: 'experience'`. */
  id: Id,
  title: z.string().min(1),
  organization: z.string().min(1),
  start: PartialDate,
  /** Null while the user still holds the position. */
  end: PartialDate.nullable(),
  location: z.string().min(1).optional(),
  summary: z.string().min(1).optional(),
  highlights: z.array(z.string().min(1)),
});
export type Experience = z.infer<typeof Experience>;

export const Education = z.object({
  id: Id,
  institution: z.string().min(1),
  /** The degree or program, e.g. "Diploma in Business Analysis". */
  credential: z.string().min(1),
  start: PartialDate.optional(),
  end: PartialDate.optional(),
});
export type Education = z.infer<typeof Education>;

export const Certification = z.object({
  id: Id,
  name: z.string().min(1),
  issuer: z.string().min(1).optional(),
  issuedAt: PartialDate.optional(),
});
export type Certification = z.infer<typeof Certification>;

export const Language = z.object({
  name: z.string().min(1),
  level: z.enum(['elementary', 'limited', 'professional', 'full_professional', 'native']),
});
export type Language = z.infer<typeof Language>;

/** A skill in the profile and the evidence for it; nothing counts until approved (AI rule 2). */
export const ProfileSkill = z.object({
  id: Id,
  skill: SkillRef,
  /** Groups skills on the Profile tab, e.g. "Front-end", "AI", "Leadership". */
  category: z.string().min(1),
  evidence: z.array(EvidenceRef),
});
export type ProfileSkill = z.infer<typeof ProfileSkill>;

/** Where the profile came from, shown on Profile and Sources. */
export const ProfileSource = z.object({
  kind: z.enum(['cv', 'linkedin_export']),
  importedAt: z.iso.datetime(),
});
export type ProfileSource = z.infer<typeof ProfileSource>;

const ProfileShape = z.object({
  name: z.string().min(1),
  headline: z.string().min(1),
  location: z.string().min(1).optional(),
  linkedinUrl: WebUrl.optional(),
  about: z.string().min(1).optional(),
  experiences: z.array(Experience),
  education: z.array(Education),
  certifications: z.array(Certification),
  languages: z.array(Language),
  skills: z.array(ProfileSkill),
  sources: z.array(ProfileSource),
  updatedAt: z.iso.datetime(),
});

function duplicates(ids: readonly string[]): string[] {
  return [...new Set(ids.filter((id, i) => ids.indexOf(id) !== i))];
}

export const Profile = ProfileShape.superRefine((profile, ctx) => {
  const issue = (message: string, path: (string | number)[]) => {
    ctx.addIssue({ code: 'custom', message, path });
  };

  const collections: [string, string[]][] = [
    ['experiences', profile.experiences.map((e) => e.id)],
    ['education', profile.education.map((e) => e.id)],
    ['certifications', profile.certifications.map((c) => c.id)],
    ['skills', profile.skills.map((s) => s.id)],
    ['skills', profile.skills.map((s) => s.skill.id)],
    ['evidence', profile.skills.flatMap((s) => s.evidence.map((e) => e.id))],
  ];
  for (const [name, ids] of collections) {
    for (const id of duplicates(ids)) issue(`duplicate ${name} id "${id}"`, [name]);
  }

  profile.experiences.forEach((experience, i) => {
    if (experience.end !== null && experience.end < experience.start) {
      issue(`experience "${experience.id}" ends before it starts`, ['experiences', i]);
    }
  });

  // Experience evidence must point at an experience in this profile, or it proves nothing.
  const experienceIds = new Set(profile.experiences.map((e) => e.id));
  profile.skills.forEach((skill, i) => {
    skill.evidence.forEach((evidence, j) => {
      if (evidence.sourceType === 'experience' && !experienceIds.has(evidence.sourceRef)) {
        issue(`evidence "${evidence.id}" references unknown experience "${evidence.sourceRef}"`, [
          'skills',
          i,
          'evidence',
          j,
        ]);
      }
    });
  });
});
export type Profile = z.infer<typeof Profile>;
