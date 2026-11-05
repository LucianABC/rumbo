import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

import ProfilePage from '../src/app/(tabs)/profile/page';
import { NotificationList } from '../src/components/profile/suggested-changes';
import {
  getDrafts,
  getProfile,
  getProfileAnalysis,
  getRoadmap,
  getSuggestedChanges,
} from '../src/lib/data';
import { logger } from '../src/lib/logger';
import { suggestions } from '../src/lib/profile/profile-view';
import type { Lane } from '../src/lib/roadmap/single-line';

vi.mock('next/server', () => ({ connection: () => Promise.resolve() }));

// Each test can break the drafts; a getter so the switch reaches lib/data's import.
const drafts = vi.hoisted((): { override: unknown } => ({ override: undefined }));
const analysis = vi.hoisted((): { override: unknown } => ({ override: undefined }));
vi.mock('../src/mocks/analysis', async (importOriginal) => {
  const real = await importOriginal<{ analysis: unknown }>();
  return {
    get analysis() {
      return analysis.override ?? real.analysis;
    },
  };
});
vi.mock('../src/mocks/drafts', async (importOriginal) => {
  const real = await importOriginal<{ drafts: unknown }>();
  return {
    get drafts() {
      return drafts.override ?? real.drafts;
    },
  };
});

afterEach(() => {
  drafts.override = undefined;
  analysis.override = undefined;
  vi.restoreAllMocks();
});

async function render() {
  return renderToStaticMarkup(await ProfilePage());
}

/** The panel's list: a closed sheet renders nothing, so the page's markup does not have it. */
async function renderNotifications() {
  const [profile, roadmap] = await Promise.all([getProfile(), getRoadmap()]);
  const { changes } = await getDrafts(profile, roadmap);
  const lanes = roadmap.targets.map((target): Lane => ({ target, color: 'line-1' }));
  return renderToStaticMarkup(
    createElement(NotificationList, { suggestions: suggestions(changes, profile, lanes) }),
  );
}

describe('Profile (#113)', () => {
  it('shows the profile as a CV, with where it came from', async () => {
    const profile = await getProfile();
    const html = await render();

    expect(html).toContain('>Profile</h1>');
    expect(html).toContain('Updated 14 Oct 2026');
    expect(html).toContain(`>${profile.name}</h2>`);
    for (const experience of profile.experiences) {
      expect(html).toContain(experience.title);
    }
    expect(html).toContain('Present ·');
    for (const skill of profile.skills) expect(html).toContain(skill.skill.name);
    expect(html).toContain('approved evidence');
    expect(html).toContain('href="/skills#skills-you-have"');
  });

  it("opens with rumbo's analysis, labeled as opinion, and keeps the about text", async () => {
    const profile = await getProfile();
    const html = await render();

    expect(html).toContain('rumbo&#x27;s reading');
    expect(html).toContain('Sample analysis');
    expect(html).toContain('What works');
    expect(html).toContain('What to improve');
    expect(html.indexOf('rumbo&#x27;s reading')).toBeLessThan(html.indexOf('id="experience"'));
    expect(html).toContain(profile.about);
    expect(html).toContain('Customer support specialist moving into data analysis');
    expect(html).not.toContain(profile.headline);
  });

  it('keeps the profile when the analysis read another version of it', async () => {
    const warn = vi.spyOn(logger, 'warn').mockImplementation(() => undefined);
    const real = await getProfileAnalysis(getProfile());
    analysis.override = { ...real, profileUpdatedAt: '2020-01-01T00:00:00.000Z' };
    const profile = await getProfile();

    const html = await render();

    expect(html).toContain('Analysis unavailable');
    expect(html).not.toContain(profile.headline);
    expect(html).toContain(`>${profile.name}</h2>`);
    expect(warn.mock.calls[0]?.[1]).toBe('profile analysis unavailable');
  });

  it('lists Skills right below Education and certifications', async () => {
    const html = await render();

    expect(html.indexOf('id="education"')).toBeLessThan(html.indexOf('id="skills"'));
  });

  it('counts evidence awaiting approval apart, so it never reads as proven', async () => {
    expect(await render()).toContain('0 approved evidence, 1 awaiting approval');
  });

  it('opens with every profile source, its last import and how to update it', async () => {
    const html = await render();

    expect(html.indexOf('Profile sources')).toBeLessThan(html.indexOf('id="experience"'));
    for (const title of ['CV', 'LinkedIn export', 'LinkedIn profile']) {
      expect(html).toContain(`>${title}</h3>`);
    }
    for (const action of ['Upload CV', 'Import again', 'Change link']) {
      expect(html).toContain(`>${action}</button>`);
    }
    expect(html).toContain('Imported 1 Oct 2026');
    expect(html).toContain('Not imported yet');
    expect(html).toContain('Linked');
    expect(html).toContain('Save to PDF');
  });

  it('heads the page with a completeness bar computed from the profile', async () => {
    const html = await render();

    expect(html).toContain('role="progressbar"');
    expect(html).toContain('aria-valuenow="75"');
    expect(html).toContain('>75%</span>');
    expect(html).toContain('Approving what is left takes it to 93%.');
    expect(html).not.toContain('− Removed');
  });

  it('keeps the bar when there is no analysis and no drafts', async () => {
    vi.spyOn(logger, 'warn').mockImplementation(() => undefined);
    analysis.override = { nope: true };
    drafts.override = { nope: true };

    const html = await render();

    expect(html).toContain('aria-valuenow="75"');
    expect(html).toContain('Next: put numbers on at least half of your bullets.');
  });

  it('says how much each change adds', async () => {
    expect(await renderNotifications()).toContain('>+6%</span> complete');
  });

  it('shows each change as a short row with a labeled diff, awaiting a decision', async () => {
    const html = await renderNotifications();

    expect(html).toContain('aria-label="Notifications"');
    expect(html).toContain('<details name="suggested-changes"');
    expect(html).toContain('− Removed');
    expect(html).toContain('+ Added');
    expect(html).toContain('<del');
    expect(html).toContain('<ins');
    expect(html).toContain('For Data Analyst · 15 Oct 2026');
    expect(html).toContain('For Business Analyst · 12 Oct 2026');
    expect(html).toContain('One fact would make this stronger');
    expect(html).toContain('aria-label="Approve: Headline"');
    expect(html).toContain('aria-label="Reject: Headline"');
    // Copy and Open on LinkedIn appear only once the user approves the text.
    expect(html).not.toContain('Open on LinkedIn');
  });

  it('keeps the profile when the drafts no longer match it', async () => {
    const warn = vi.spyOn(logger, 'warn').mockImplementation(() => undefined);
    const roadmap = await getRoadmap();
    const [target] = roadmap.targets;
    drafts.override = {
      changes: [
        {
          id: 'x',
          section: 'headline',
          targetId: target?.id,
          createdAt: '2026-10-15T09:00:00.000Z',
          completenessGain: 5,
          before: 'Gone',
          after: 'New',
        },
      ],
    };
    const profile = await getProfile();

    const html = await render();

    expect(html).toContain(`>${profile.name}</h2>`);
    expect(html).not.toContain('to review');
    // Only the error, under `err`: its message quotes data paths (AI rule 5).
    const [fields, message] = warn.mock.calls[0] as unknown as [Record<string, unknown>, string];
    expect(message).toBe('suggested changes unavailable');
    expect(fields.err).toBeInstanceOf(Error);
  });

  it('says so when there is nothing to review', () => {
    expect(renderToStaticMarkup(createElement(NotificationList, { suggestions: [] }))).toContain(
      'Nothing to review',
    );
  });
});

describe('lib/data drafts', () => {
  it('serves drafts that fit the fictional profile and roadmap', async () => {
    const [profile, roadmap] = await Promise.all([getProfile(), getRoadmap()]);

    expect((await getDrafts(profile, roadmap)).changes.length).toBeGreaterThan(0);
  });

  it('gives null, not a rejection, when the profile cannot be read', async () => {
    vi.spyOn(logger, 'warn').mockImplementation(() => undefined);
    const roadmap = await getRoadmap();

    await expect(
      getSuggestedChanges(Promise.reject(new Error('no profile')), roadmap),
    ).resolves.toBeNull();
  });
});
