import type { TailoredCv } from '@rumbo/contracts/provisional';
import { afterEach, describe, expect, it, vi } from 'vitest';

import ProfilePage from '../src/app/(tabs)/profile/page';
import { getProfile, getRoadmap, getTailoredCvs } from '../src/lib/data';
import { logger } from '../src/lib/logger';
import { applyCv, cvChanges, cvOutdated } from '../src/lib/profile/tailored-cv';
import { renderTab, testStore } from './support/store';

vi.mock('next/server', () => ({ connection: () => Promise.resolve() }));

// Each test can break the CVs; a getter so the switch reaches lib/data's import.
const cvs = vi.hoisted((): { override: unknown } => ({ override: undefined }));
vi.mock('../src/mocks/cvs', async (importOriginal) => {
  const real = await importOriginal<{ cvs: unknown }>();
  return {
    get cvs() {
      return cvs.override ?? real.cvs;
    },
  };
});

afterEach(() => {
  cvs.override = undefined;
  vi.restoreAllMocks();
});

async function render(target?: string, store?: Awaited<ReturnType<typeof testStore>>) {
  const page = await ProfilePage({ searchParams: Promise.resolve(target ? { target } : {}) });
  return renderTab(page, store);
}

async function cvFor(targetId: string): Promise<TailoredCv> {
  const all = await getTailoredCvs(getProfile(), await getRoadmap());
  const cv = all?.find((c) => c.targetId === targetId);
  if (!cv) throw new Error(`no CV for ${targetId}`);
  return cv;
}

describe('Profile sub-tabs (#191)', () => {
  it('lists Base, then every target primary first, with Base selected by default', async () => {
    const html = await render();

    expect(html).toContain('aria-label="Show CV"');
    expect(html).toMatch(/aria-current="true"[^>]*href="\/profile"><span[^>]*>Base</);
    const order = ['Data Analyst', 'Business Analyst', 'Support Operations Lead'].map((name) =>
      html.indexOf(name, html.indexOf('aria-label="Show CV"')),
    );
    expect(order).toEqual([...order].sort((a, b) => a - b));
    expect(html).toContain('href="?target=data-analyst"');
    expect(html).toContain('Edit profile');
    expect(html).toContain('Profile sources');
  });

  it("shows a target's CV laid out as a CV, with its downloads and no edit mode", async () => {
    const cv = await cvFor('data-analyst');
    const html = await render('data-analyst');

    expect(html).toMatch(/aria-current="true"[^>]*href="\?target=data-analyst"/);
    expect(html).toContain('aria-label="Your CV for Data Analyst"');
    expect(html).toContain(cv.headline);
    expect(html).toContain('Written for Data Analyst');
    expect(html).toContain('Download PDF');
    expect(html).toContain('Download DOCX');
    expect(html).toContain('Show changes from Base');
    expect(html).toContain('Fix it in Base');
    expect(html).not.toContain('Edit profile');
    expect(html).not.toContain('Profile sources');
    expect(html).not.toContain('Out of date');
  });

  it('leaves out the skills and bullets the CV did not pick', async () => {
    const html = await render('data-analyst');

    expect(html).not.toContain('Requirements analysis');
    expect(html).not.toContain('Wrote the escalation playbook the team uses today.');
  });

  it('offers to generate the CV of a target that has none yet', async () => {
    const html = await render('support-ops-lead');

    expect(html).toContain('No CV for Support Operations Lead yet');
    expect(html).toContain('Generate CV for this target');
    expect(html).not.toContain('Download PDF');
  });

  it('opens Base for a target the user does not have', async () => {
    const html = await render('unknown-target');

    expect(html).toContain('Edit profile');
    expect(html).toMatch(/aria-current="true"[^>]*href="\/profile"/);
  });

  it('says the CVs are unavailable when they do not fit the profile, and keeps Base', async () => {
    const warn = vi.spyOn(logger, 'warn').mockImplementation(() => undefined);
    const real = await cvFor('data-analyst');
    cvs.override = { cvs: [{ ...real, skillIds: ['ps-not-in-profile'] }] };

    expect(await render('data-analyst')).toContain('CV unavailable');
    expect(await render()).toContain('Edit profile');
    expect(warn.mock.calls.some((call) => call[1] === 'tailored CVs unavailable')).toBe(true);
  });

  it('marks the CV out of date once Base changes, and still offers its download', async () => {
    const profile = await getProfile();
    const edited = { ...profile, about: 'Rewritten about text.' };
    const html = await render('data-analyst', await testStore({ editedProfile: edited }));

    expect(html).toContain('Out of date.');
    expect(html).toContain('Regenerate');
    expect(html).toContain('Download PDF');
  });

  it('keeps a CV from an older profile, out of date, beside a current one', async () => {
    const warn = vi.spyOn(logger, 'warn').mockImplementation(() => undefined);
    const current = await cvFor('data-analyst');
    const old = {
      ...(await cvFor('business-analyst')),
      profileUpdatedAt: '2026-09-01T00:00:00.000Z',
      // The profile has dropped both since this CV was written.
      positions: [{ experienceId: 'experience-gone', highlights: ['A bullet from back then.'] }],
      skillIds: ['ps-requirements-analysis', 'ps-gone'],
    };
    cvs.override = { cvs: [current, old] };

    const oldHtml = await render('business-analyst');
    expect(oldHtml).toContain('Out of date.');
    expect(oldHtml).toContain('Regenerate');
    expect(oldHtml).toContain(old.headline);
    expect(oldHtml).toContain('Requirements analysis');
    expect(oldHtml).not.toContain('A bullet from back then.');

    const currentHtml = await render('data-analyst');
    expect(currentHtml).toContain(current.headline);
    expect(currentHtml).not.toContain('Out of date.');
    expect(warn).not.toHaveBeenCalled();
  });
});

describe('a CV against Base (#191)', () => {
  it('keeps the profile facts and takes the CV text', async () => {
    const profile = await getProfile();
    const cv = await cvFor('business-analyst');
    const laid = applyCv(profile, cv);

    expect(laid.name).toBe(profile.name);
    expect(laid.headline).toBe(cv.headline);
    expect(laid.experiences.map((e) => e.id)).toEqual(['experience-current-job']);
    expect(laid.skills.map((s) => s.id).sort()).toEqual([...cv.skillIds].sort());
  });

  it('lists each change in words: headline, bullets, positions and skills left out', async () => {
    const profile = await getProfile();
    const changes = cvChanges(profile, await cvFor('business-analyst'));

    expect(changes.map((c) => c.section)).toEqual([
      'headline',
      'about',
      'position',
      'position',
      'skills',
    ]);
    const current = changes.find(
      (c) => c.section === 'position' && c.experienceId === 'experience-current-job',
    );
    expect(current).toMatchObject({
      omitted: false,
      removed: ['Triage about 60 tickets a day and route bugs with reproduction steps.'],
      added: ['Route bugs to the product team with reproduction steps, about 60 tickets a day.'],
    });
    expect(changes).toContainEqual(
      expect.objectContaining({ experienceId: 'experience-call-center', omitted: true }),
    );
    expect(changes.at(-1)).toEqual({
      section: 'skills',
      omitted: ['Ticket triage', 'Help desk tools', 'SQL'],
    });
  });

  it('has nothing to show for a CV that says what Base says', async () => {
    const profile = await getProfile();
    const same: TailoredCv = {
      targetId: 'data-analyst',
      generatedAt: profile.updatedAt,
      profileUpdatedAt: profile.updatedAt,
      headline: profile.headline,
      about: profile.about ?? null,
      positions: profile.experiences.map((e) => ({ experienceId: e.id, highlights: e.highlights })),
      skillIds: profile.skills.map((s) => s.id),
    };

    expect(cvChanges(profile, same)).toEqual([]);
  });

  it('goes out of date on content edits, not on the headline the CV rewrites anyway', async () => {
    const profile = await getProfile();
    const cv = await cvFor('data-analyst');

    expect(cvOutdated(cv, profile, profile)).toBe(false);
    expect(cvOutdated(cv, profile, { ...profile, headline: 'Another headline' })).toBe(false);
    expect(cvOutdated(cv, profile, { ...profile, about: 'Another about' })).toBe(true);
    expect(cvOutdated(cv, profile, { ...profile, skills: profile.skills.slice(1) })).toBe(true);
  });

  it('is out of date when written from an earlier version of the profile', async () => {
    const profile = await getProfile();
    const cv = { ...(await cvFor('data-analyst')), profileUpdatedAt: '2026-09-01T00:00:00.000Z' };

    expect(cvOutdated(cv, profile, profile)).toBe(true);
  });
});
