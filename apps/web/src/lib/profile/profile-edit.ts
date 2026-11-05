import {
  type Certification,
  type Education,
  endsBeforeStart,
  type Experience,
  type Language,
  PartialDate,
  Profile,
  type ProfileSkill,
} from '@rumbo/contracts';

import { LANGUAGE_LEVEL_LABEL } from './profile-view';

/**
 * Editing the profile (docs/product/views.md, #170), pure so every rule is unit-tested here. A
 * draft is the profile as forms: every field a string, every item with its original, so a diff is
 * always one comparison away. Nothing changes until `applyDraft`, which validates the result with
 * the contract.
 */

export type Form = Readonly<Record<string, string>>;

export interface DraftItem {
  readonly key: string;
  readonly value: Form;
  /** Null for an item added in this edit. */
  readonly original: Form | null;
  readonly removed: boolean;
}

export type SectionId = 'experiences' | 'education' | 'certifications' | 'languages' | 'skills';

export interface ProfileDraft {
  readonly header: Form;
  readonly originalHeader: Form;
  readonly sections: Readonly<Record<SectionId, readonly DraftItem[]>>;
}

export interface FieldDef {
  readonly name: string;
  readonly label: string;
  readonly required?: boolean;
  readonly kind?: 'date' | 'multiline' | 'level';
  readonly hint?: string;
  /** Spans the whole row: long text. */
  readonly wide?: boolean;
}

export interface SectionDef {
  readonly id: SectionId;
  readonly title: string;
  /** "Add a position". */
  readonly addLabel: string;
  readonly fields: readonly FieldDef[];
  /** An existing item can only be deleted: a new name is another skill (#170). */
  readonly fixedOnceSaved?: boolean;
  /** The item in one line, for its heading and its removed state. */
  readonly summary: (value: Form) => string;
}

export const HEADER_FIELDS: readonly FieldDef[] = [
  { name: 'name', label: 'Name', required: true },
  { name: 'location', label: 'Location' },
  { name: 'headline', label: 'Description', required: true, wide: true },
  { name: 'about', label: 'About', kind: 'multiline', wide: true },
];

const DATE_HINT = 'A year or a month: 2021 or 2021-03';

const joined = (...parts: readonly (string | undefined)[]) => parts.filter(Boolean).join(' · ');

export const SECTIONS: readonly SectionDef[] = [
  {
    id: 'experiences',
    title: 'Experience',
    addLabel: 'Add a position',
    summary: (v) => joined(v.title, v.organization) || 'New position',
    fields: [
      { name: 'title', label: 'Title', required: true },
      { name: 'organization', label: 'Organization', required: true },
      { name: 'start', label: 'Start', required: true, kind: 'date', hint: DATE_HINT },
      { name: 'end', label: 'End', kind: 'date', hint: `${DATE_HINT}. Empty if it is current.` },
      { name: 'location', label: 'Location' },
      { name: 'summary', label: 'Summary', kind: 'multiline', wide: true },
      {
        name: 'highlights',
        label: 'Highlights',
        kind: 'multiline',
        hint: 'One per line',
        wide: true,
      },
    ],
  },
  {
    id: 'education',
    title: 'Education',
    addLabel: 'Add education',
    summary: (v) => joined(v.credential, v.institution) || 'New education',
    fields: [
      { name: 'credential', label: 'Credential', required: true },
      { name: 'institution', label: 'Institution', required: true },
      { name: 'start', label: 'Start', kind: 'date', hint: DATE_HINT },
      { name: 'end', label: 'End', kind: 'date', hint: DATE_HINT },
    ],
  },
  {
    id: 'certifications',
    title: 'Certifications',
    addLabel: 'Add a certification',
    summary: (v) => joined(v.name, v.issuer) || 'New certification',
    fields: [
      { name: 'name', label: 'Name', required: true },
      { name: 'issuer', label: 'Issuer' },
      { name: 'issuedAt', label: 'Date', kind: 'date', hint: DATE_HINT },
    ],
  },
  {
    id: 'languages',
    title: 'Languages',
    addLabel: 'Add a language',
    summary: (v) => joined(v.name) || 'New language',
    fields: [
      { name: 'name', label: 'Language', required: true },
      { name: 'level', label: 'Level', required: true, kind: 'level' },
    ],
  },
  {
    id: 'skills',
    title: 'Skills',
    addLabel: 'Add a skill',
    fixedOnceSaved: true,
    summary: (v) => joined(v.name, v.category) || 'New skill',
    fields: [
      { name: 'name', label: 'Skill', required: true },
      {
        name: 'category',
        label: 'Category',
        required: true,
        hint: 'For example: Data, Leadership',
      },
    ],
  },
];

const EMPTY_FORM: Readonly<Record<SectionId, Form>> = {
  experiences: {
    title: '',
    organization: '',
    start: '',
    end: '',
    location: '',
    summary: '',
    highlights: '',
  },
  education: { credential: '', institution: '', start: '', end: '' },
  certifications: { name: '', issuer: '', issuedAt: '' },
  languages: { name: '', level: 'professional' },
  skills: { name: '', category: '' },
};

const experienceForm = (e: Experience): Form => ({
  title: e.title,
  organization: e.organization,
  start: e.start,
  end: e.end ?? '',
  location: e.location ?? '',
  summary: e.summary ?? '',
  highlights: e.highlights.join('\n'),
});
const educationForm = (e: Education): Form => ({
  credential: e.credential,
  institution: e.institution,
  start: e.start ?? '',
  end: e.end ?? '',
});
const certificationForm = (c: Certification): Form => ({
  name: c.name,
  issuer: c.issuer ?? '',
  issuedAt: c.issuedAt ?? '',
});
const languageForm = (l: Language): Form => ({ name: l.name, level: l.level });
const skillForm = (s: ProfileSkill): Form => ({ name: s.skill.name, category: s.category });

function saved(key: string, value: Form): DraftItem {
  return { key, value, original: value, removed: false };
}

export function toDraft(profile: Profile): ProfileDraft {
  const header: Form = {
    name: profile.name,
    headline: profile.headline,
    location: profile.location ?? '',
    about: profile.about ?? '',
  };
  return {
    header,
    originalHeader: header,
    sections: {
      experiences: profile.experiences.map((e) => saved(e.id, experienceForm(e))),
      education: profile.education.map((e) => saved(e.id, educationForm(e))),
      certifications: profile.certifications.map((c) => saved(c.id, certificationForm(c))),
      // Languages have no id; their place in the list identifies them while editing.
      languages: profile.languages.map((l, i) => saved(`language-${String(i)}`, languageForm(l))),
      skills: profile.skills.map((s) => saved(s.id, skillForm(s))),
    },
  };
}

function withItems(
  draft: ProfileDraft,
  section: SectionId,
  items: readonly DraftItem[],
): ProfileDraft {
  return { ...draft, sections: { ...draft.sections, [section]: items } };
}

export function setHeaderField(draft: ProfileDraft, name: string, value: string): ProfileDraft {
  return { ...draft, header: { ...draft.header, [name]: value } };
}

export function setItemField(
  draft: ProfileDraft,
  section: SectionId,
  key: string,
  name: string,
  value: string,
): ProfileDraft {
  return withItems(
    draft,
    section,
    draft.sections[section].map((item) =>
      item.key === key ? { ...item, value: { ...item.value, [name]: value } } : item,
    ),
  );
}

/** A new item goes first, where the user is looking. Returns its key to move focus to it. */
export function addItem(
  draft: ProfileDraft,
  section: SectionId,
): { readonly draft: ProfileDraft; readonly key: string } {
  const taken = new Set(draft.sections[section].map((i) => i.key));
  let n = 1;
  while (taken.has(`new-${section}-${String(n)}`)) n += 1;
  const key = `new-${section}-${String(n)}`;
  const item: DraftItem = { key, value: EMPTY_FORM[section], original: null, removed: false };
  return { draft: withItems(draft, section, [item, ...draft.sections[section]]), key };
}

/** An item added in this edit just goes; a saved one stays, marked removed, until Save. */
export function removeItem(draft: ProfileDraft, section: SectionId, key: string): ProfileDraft {
  const items = draft.sections[section];
  const isNew = items.some((i) => i.key === key && i.original === null);
  return withItems(
    draft,
    section,
    isNew
      ? items.filter((i) => i.key !== key)
      : items.map((i) => (i.key === key ? { ...i, removed: true } : i)),
  );
}

export function restoreItem(draft: ProfileDraft, section: SectionId, key: string): ProfileDraft {
  return withItems(
    draft,
    section,
    draft.sections[section].map((i) => (i.key === key ? { ...i, removed: false } : i)),
  );
}

export function headerFieldChanged(draft: ProfileDraft, name: string): boolean {
  return draft.header[name] !== draft.originalHeader[name];
}

export function itemFieldChanged(item: DraftItem, name: string): boolean {
  return item.original !== null && item.value[name] !== item.original[name];
}

function itemChanged(item: DraftItem): boolean {
  if (item.removed || item.original === null) return true;
  return Object.keys(item.value).some((name) => itemFieldChanged(item, name));
}

/** Header fields and items that differ: what the bar counts. Undoing an edit takes it back. */
export function changeCount(draft: ProfileDraft): number {
  const header = Object.keys(draft.header).filter((n) => headerFieldChanged(draft, n)).length;
  const items = Object.values(draft.sections).flat().filter(itemChanged).length;
  return header + items;
}

export function headerErrorKey(name: string): string {
  return `header.${name}`;
}

export function itemErrorKey(section: SectionId, key: string, name: string): string {
  return `${section}.${key}.${name}`;
}

function fieldError(field: FieldDef, value: string): string | null {
  const text = value.trim();
  if (field.required && text === '') return `${field.label} is required.`;
  if (field.kind === 'date' && text !== '' && !PartialDate.safeParse(text).success) {
    return 'Use a year or a month: 2021 or 2021-03.';
  }
  return null;
}

function skillName(item: DraftItem): string {
  return (item.value.name ?? '').trim().toLowerCase();
}

/** What blocks Save, by field. Removed items cannot block it: they are going away. */
export function draftErrors(draft: ProfileDraft): Readonly<Record<string, string>> {
  const errors: Record<string, string> = {};
  for (const field of HEADER_FIELDS) {
    const error = fieldError(field, draft.header[field.name] ?? '');
    if (error) errors[headerErrorKey(field.name)] = error;
  }
  for (const def of SECTIONS) {
    for (const item of draft.sections[def.id]) {
      if (item.removed) continue;
      for (const field of def.fields) {
        const error = fieldError(field, item.value[field.name] ?? '');
        if (error) errors[itemErrorKey(def.id, item.key, field.name)] = error;
      }
      const start = item.value.start?.trim() ?? '';
      const end = item.value.end?.trim() ?? '';
      const key = itemErrorKey(def.id, item.key, 'end');
      if (
        !errors[key] &&
        PartialDate.safeParse(start).success &&
        PartialDate.safeParse(end).success &&
        endsBeforeStart(start, end)
      ) {
        errors[key] = 'The end cannot be before the start.';
      }
    }
  }
  // Saved skills first: only a new one has a field to show the error on, and new ones come first.
  const skills = draft.sections.skills.filter((item) => !item.removed);
  const names = new Set(skills.filter((i) => i.original !== null).map(skillName));
  for (const item of skills.filter((i) => i.original === null)) {
    const name = skillName(item);
    if (name !== '' && names.has(name)) {
      errors[itemErrorKey('skills', item.key, 'name')] = 'This skill is already in your profile.';
    }
    names.add(name);
  }
  return errors;
}

/** An optional field, left out when empty: the contract rejects an empty string. */
function optional(key: string, value: string | undefined): Readonly<Record<string, string>> {
  const trimmed = value?.trim();
  return trimmed ? { [key]: trimmed } : {};
}

const text = (value: string | undefined) => value?.trim() ?? '';

/** What deleting an entry takes with it: evidence cannot point at an entry that is gone. */
export function skillsLosingEvidence(
  profile: Profile,
  section: SectionId,
  key: string,
): readonly string[] {
  const type = { experiences: 'experience', certifications: 'certification' } as const;
  if (section !== 'experiences' && section !== 'certifications') return [];
  return profile.skills
    .filter((s) => s.evidence.some((e) => e.sourceType === type[section] && e.sourceRef === key))
    .map((s) => s.skill.name);
}

function slug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function uniqueId(base: string, taken: Set<string>): string {
  let id = base;
  for (let n = 2; taken.has(id); n += 1) id = `${base}-${String(n)}`;
  taken.add(id);
  return id;
}

/** A skill the user adds themself: their own edit needs no approval (AI rule 2 is about agents). */
function addedSkill(value: Form, ids: Set<string>, now: string): ProfileSkill {
  const name = text(value.name);
  const id = uniqueId(slug(name) || 'skill', ids);
  return {
    id,
    skill: { id, name },
    category: text(value.category),
    evidence: [
      { id: `ev-${id}`, sourceType: 'manual', sourceRef: 'Added by you', approvedAt: now },
    ],
  };
}

/**
 * The profile the draft describes, or null when it does not pass the contract: the fields'
 * validation should have caught that first. Fields a form does not show are kept from `base`.
 */
export function applyDraft(draft: ProfileDraft, base: Profile, now: string): Profile | null {
  const kept = (section: SectionId) => draft.sections[section].filter((i) => !i.removed);
  const existing = <T extends { id: string }>(items: readonly T[], key: string) =>
    items.find((i) => i.id === key);
  const ids = (items: readonly { id: string }[]) => new Set(items.map((i) => i.id));

  const experienceIds = ids(base.experiences);
  const experiences = kept('experiences').map(({ key, value }): Experience => ({
    ...existing(base.experiences, key),
    id: existing(base.experiences, key)?.id ?? uniqueId('experience', experienceIds),
    title: text(value.title),
    organization: text(value.organization),
    start: text(value.start),
    end: text(value.end) || null,
    highlights: text(value.highlights)
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean),
    ...optional('location', value.location),
    ...optional('summary', value.summary),
  }));

  const educationIds = ids(base.education);
  const education = kept('education').map(({ key, value }): Education => ({
    id: existing(base.education, key)?.id ?? uniqueId('education', educationIds),
    credential: text(value.credential),
    institution: text(value.institution),
    ...optional('start', value.start),
    ...optional('end', value.end),
  }));

  const certificationIds = ids(base.certifications);
  const certifications = kept('certifications').map(({ key, value }): Certification => ({
    id: existing(base.certifications, key)?.id ?? uniqueId('certification', certificationIds),
    name: text(value.name),
    ...optional('issuer', value.issuer),
    ...optional('issuedAt', value.issuedAt),
  }));

  const languages = kept('languages').map(({ value }): Language => ({
    name: text(value.name),
    level: value.level as Language['level'],
  }));

  const gone = {
    experience: new Set(draft.sections.experiences.filter((i) => i.removed).map((i) => i.key)),
    certification: new Set(
      draft.sections.certifications.filter((i) => i.removed).map((i) => i.key),
    ),
  };
  const skillIds = new Set(base.skills.flatMap((s) => [s.id, s.skill.id]));
  const skills = kept('skills').map(({ key, value }): ProfileSkill => {
    const skill = existing(base.skills, key);
    if (!skill) return addedSkill(value, skillIds, now);
    return {
      ...skill,
      evidence: skill.evidence.filter(
        (e) =>
          !(
            (e.sourceType === 'experience' || e.sourceType === 'certification') &&
            gone[e.sourceType].has(e.sourceRef)
          ),
      ),
    };
  });

  const { location: _location, about: _about, ...rest } = base;
  const result = Profile.safeParse({
    ...rest,
    name: text(draft.header.name),
    headline: text(draft.header.headline),
    ...optional('location', draft.header.location),
    ...optional('about', draft.header.about),
    experiences,
    education,
    certifications,
    languages,
    skills,
    updatedAt: now,
  });
  return result.success ? result.data : null;
}

export const LEVEL_OPTIONS = Object.entries(LANGUAGE_LEVEL_LABEL) as readonly [
  Language['level'],
  string,
][];
