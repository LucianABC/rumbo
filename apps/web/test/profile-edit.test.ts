import { Profile as ProfileSchema } from '@rumbo/contracts';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ProfileEditor } from '../src/components/profile/profile-editor';
import { getProfile } from '../src/lib/data';
import {
  addItem,
  applyDraft,
  changeCount,
  draftErrors,
  headerErrorKey,
  itemErrorKey,
  type ProfileDraft,
  removeItem,
  restoreItem,
  type SectionId,
  setHeaderField,
  setItemField,
  skillsLosingEvidence,
  toDraft,
} from '../src/lib/profile/profile-edit';
import { useAppStore } from '../src/lib/store';

vi.mock('next/server', () => ({ connection: () => Promise.resolve() }));

const NOW = '2026-11-05T12:00:00.000Z';

/** Adds an item and fills it. */
function added(draft: ProfileDraft, section: SectionId, fields: Record<string, string>) {
  const { draft: next, key } = addItem(draft, section);
  const filled = Object.entries(fields).reduce(
    (d, [name, value]) => setItemField(d, section, key, name, value),
    next,
  );
  return { draft: filled, key };
}

function firstKey(draft: ProfileDraft, section: SectionId): string {
  const [item] = draft.sections[section];
  if (!item) throw new Error(`no ${section}`);
  return item.key;
}

describe('toDraft and applyDraft', () => {
  it('round-trips an untouched profile, down to fields no form shows', async () => {
    const profile = await getProfile();

    expect(applyDraft(toDraft(profile), profile, profile.updatedAt)).toEqual(profile);
  });

  it('stamps the edit and always passes the contract', async () => {
    const profile = await getProfile();
    const draft = setHeaderField(toDraft(profile), 'name', 'Someone Else');

    const saved = applyDraft(draft, profile, NOW);

    expect(saved?.name).toBe('Someone Else');
    expect(saved?.updatedAt).toBe(NOW);
    expect(ProfileSchema.safeParse(saved).success).toBe(true);
  });

  it('drops an optional field left empty instead of storing an empty string', async () => {
    const profile = await getProfile();

    const saved = applyDraft(setHeaderField(toDraft(profile), 'about', '  '), profile, NOW);

    expect(saved).not.toHaveProperty('about');
  });

  it('reads an empty end as a position still held, and highlights one per line', async () => {
    const profile = await getProfile();
    const start = toDraft(profile);
    const { draft } = added(start, 'experiences', {
      title: 'Analyst',
      organization: 'Acme',
      start: '2024-02',
      highlights: 'First\n\n  Second  ',
    });

    const [position] = applyDraft(draft, profile, NOW)?.experiences ?? [];

    expect(position).toMatchObject({ title: 'Analyst', end: null });
    expect(position?.highlights).toEqual(['First', 'Second']);
    expect(position?.id).not.toBe('');
  });
});

describe('changeCount', () => {
  it('counts each changed field of the header and each changed item once', async () => {
    const draft = toDraft(await getProfile());
    const key = firstKey(draft, 'experiences');

    const edited = setItemField(
      setItemField(setHeaderField(draft, 'name', 'New'), 'experiences', key, 'title', 'A'),
      'experiences',
      key,
      'organization',
      'B',
    );

    expect(changeCount(draft)).toBe(0);
    expect(changeCount(edited)).toBe(2);
  });

  it('takes a change back when the field returns to its original', async () => {
    const draft = toDraft(await getProfile());
    const name = draft.header.name ?? '';

    expect(changeCount(setHeaderField(setHeaderField(draft, 'name', 'X'), 'name', name))).toBe(0);
  });

  it('counts a removal, and undoing it takes it back', async () => {
    const draft = toDraft(await getProfile());
    const key = firstKey(draft, 'education');
    const removed = removeItem(draft, 'education', key);

    expect(changeCount(removed)).toBe(1);
    expect(changeCount(restoreItem(removed, 'education', key))).toBe(0);
  });

  it('forgets an item added and deleted in the same edit', async () => {
    const draft = toDraft(await getProfile());
    const { draft: next, key } = addItem(draft, 'languages');

    expect(changeCount(next)).toBe(1);
    expect(changeCount(removeItem(next, 'languages', key))).toBe(0);
  });
});

describe('draftErrors', () => {
  it('has none for the profile as imported', async () => {
    expect(draftErrors(toDraft(await getProfile()))).toEqual({});
  });

  it('requires the name and the description', async () => {
    const draft = setHeaderField(toDraft(await getProfile()), 'name', '   ');

    expect(draftErrors(draft)[headerErrorKey('name')]).toBe('Name is required.');
  });

  it('takes a year or a month, and nothing else, as a date', async () => {
    const draft = toDraft(await getProfile());
    const key = firstKey(draft, 'experiences');
    const error = (value: string) =>
      draftErrors(setItemField(draft, 'experiences', key, 'start', value))[
        itemErrorKey('experiences', key, 'start')
      ];

    expect(error('2021')).toBeUndefined();
    expect(error('2021-03')).toBeUndefined();
    expect(error('March 2021')).toContain('2021-03');
    expect(error('2021-13')).toContain('2021-03');
  });

  it('rejects an end before its start', async () => {
    const draft = toDraft(await getProfile());
    const { draft: next, key } = added(draft, 'education', {
      credential: 'Diploma',
      institution: 'A school',
      start: '2020',
      end: '2019',
    });

    expect(draftErrors(next)[itemErrorKey('education', key, 'end')]).toContain('before the start');
  });

  it('rejects a skill the profile already has, whatever its case', async () => {
    const profile = await getProfile();
    const name = profile.skills[0]?.skill.name ?? '';
    const { draft, key } = added(toDraft(profile), 'skills', {
      name: name.toUpperCase(),
      category: 'Data',
    });

    // On the new one: a saved skill has no field to show it on, so Save would block silently.
    expect(Object.keys(draftErrors(draft))).toEqual([itemErrorKey('skills', key, 'name')]);
  });

  it('does not let a removed item block Save', async () => {
    const draft = toDraft(await getProfile());
    const key = firstKey(draft, 'experiences');
    const broken = setItemField(draft, 'experiences', key, 'title', '');

    expect(draftErrors(removeItem(broken, 'experiences', key))).toEqual({});
  });
});

describe('deleting what evidence points at', () => {
  it('says which skills lose evidence, and stays valid after Save', async () => {
    const profile = await getProfile();
    const pointed = profile.skills
      .flatMap((s) => s.evidence)
      .find((e) => e.sourceType === 'experience');
    const key = pointed?.sourceRef ?? '';
    expect(key).not.toBe('');

    const losing = skillsLosingEvidence(profile, 'experiences', key);
    const saved = applyDraft(removeItem(toDraft(profile), 'experiences', key), profile, NOW);

    expect(losing.length).toBeGreaterThan(0);
    expect(saved).not.toBeNull();
    expect(saved?.experiences.map((e) => e.id)).not.toContain(key);
    expect(saved?.skills.flatMap((s) => s.evidence).map((e) => e.sourceRef)).not.toContain(key);
  });

  it('has nothing to say for an entry no evidence points at', async () => {
    expect(skillsLosingEvidence(await getProfile(), 'education', 'anything')).toEqual([]);
  });
});

describe('adding a skill', () => {
  it('carries approved manual evidence: the user’s own edit needs no approval', async () => {
    const profile = await getProfile();
    const { draft } = added(toDraft(profile), 'skills', { name: 'dbt Core', category: 'Data' });

    const skill = applyDraft(draft, profile, NOW)?.skills.find((s) => s.skill.name === 'dbt Core');

    expect(skill).toMatchObject({ id: 'dbt-core', category: 'Data' });
    expect(skill?.evidence).toEqual([
      expect.objectContaining({ sourceType: 'manual', approvedAt: NOW }),
    ]);
  });

  it('never repeats an id, however two names reduce', async () => {
    const profile = await getProfile();
    const first = added(toDraft(profile), 'skills', { name: 'C', category: 'Languages' });
    const second = added(first.draft, 'skills', { name: 'C++', category: 'Languages' });

    const saved = applyDraft(second.draft, profile, NOW);
    const ids = saved?.skills.filter((s) => s.category === 'Languages').map((s) => s.id) ?? [];

    expect(new Set(ids).size).toBe(2);
  });
});

describe('the editor', () => {
  it('shows saved skills as chips by category, each with its own delete', async () => {
    const profile = await getProfile();
    const [first] = profile.skills;
    const html = renderToStaticMarkup(
      createElement(ProfileEditor, {
        profile,
        onSave: () => undefined,
        onClose: () => undefined,
      }),
    );

    expect(html).toContain(`aria-label="Delete: ${first?.skill.name ?? ''}"`);
    expect(html).toContain(`<dt class="text-xs font-medium text-primary">${first?.category ?? ''}`);
    expect(html).not.toContain('edit-skills.');
  });
});

describe('the saved profile in the store', () => {
  beforeEach(() => {
    useAppStore.setState(useAppStore.getInitialState(), true);
  });

  it('starts empty, so the server never renders anyone else’s edits', () => {
    expect(useAppStore.getInitialState().editedProfile).toBeNull();
  });

  it('keeps what was saved', async () => {
    const profile = await getProfile();

    useAppStore.getState().saveProfile(profile);

    expect(useAppStore.getState().editedProfile).toBe(profile);
  });
});
