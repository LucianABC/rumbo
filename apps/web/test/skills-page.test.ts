import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

import SkillsPage from '../src/app/(tabs)/skills/page';
import { getRoadmap } from '../src/lib/data';
import { logger } from '../src/lib/logger';

vi.mock('next/server', () => ({ connection: () => Promise.resolve() }));

// Each test can break one mock; getters so the switch reaches lib/data's imports.
const broken = vi.hoisted(() => ({ market: false, profile: false }));
vi.mock('../src/mocks/market', async (importOriginal) => {
  const real = await importOriginal<{ market: unknown }>();
  return {
    get market() {
      // No snapshot per target: getMarket rejects (#145).
      return broken.market ? { snapshots: [] } : real.market;
    },
  };
});
vi.mock('../src/mocks/profile', async (importOriginal) => {
  const real = await importOriginal<{ profile: unknown }>();
  return {
    get profile() {
      return broken.profile ? { name: '' } : real.profile;
    },
  };
});

afterEach(() => {
  broken.market = false;
  broken.profile = false;
  vi.restoreAllMocks();
});

async function render(target?: string) {
  return renderToStaticMarkup(
    await SkillsPage({ searchParams: Promise.resolve(target ? { target } : {}) }),
  );
}

describe('Skills & gaps (#111)', () => {
  it("shows the primary's market, every gap and the skills the user has", async () => {
    const roadmap = await getRoadmap();
    const primary = roadmap.targets.find((t) => t.isPrimary);
    const html = await render();

    expect(html).toContain('>Skills &amp; gaps</h1>');
    expect(html).toContain(
      `aria-label="Skills ${primary?.roleFamily.name ?? ''} postings ask for most"`,
    );
    for (const gap of roadmap.gaps) expect(html).toContain(`id="gap-${gap.id}"`);
    expect(html).toContain('rumbo&#x27;s reading');
    expect(html).toContain('/roadmap?line=');
    expect(html).toContain('Skills you have');
    expect(html).not.toContain('unavailable');
  });

  it('picks the market of the target in the URL, and the primary for an unknown one', async () => {
    const roadmap = await getRoadmap();
    const primary = roadmap.targets.find((t) => t.isPrimary);
    const other = roadmap.targets.find((t) => !t.isPrimary);

    expect(await render(other?.id)).toContain(
      `aria-label="Skills ${other?.roleFamily.name ?? ''} postings ask for most"`,
    );
    expect(await render('nobody')).toContain(
      `aria-label="Skills ${primary?.roleFamily.name ?? ''} postings ask for most"`,
    );
  });

  it('keeps the gaps and their numbers when the market cannot be read', async () => {
    const warn = vi.spyOn(logger, 'warn').mockImplementation(() => undefined);
    broken.market = true;
    const roadmap = await getRoadmap();

    const html = await render();

    expect(html).toContain('Market data unavailable');
    expect(html).not.toContain('Market data from');
    for (const gap of roadmap.gaps) expect(html).toContain(`id="gap-${gap.id}"`);
    expect(html).toContain('Asked in');
    // One trace naming the source, with the error under `err` (AI rule 5).
    expect(warn).toHaveBeenCalledOnce();
    const [fields, message] = warn.mock.calls[0] as unknown as [Record<string, unknown>, string];
    expect(message).toBe('skills data unavailable');
    expect(fields.source).toBe('market');
    expect(fields.err).toBeInstanceOf(Error);
  });

  it('keeps the market and gaps when the profile cannot be read', async () => {
    vi.spyOn(logger, 'warn').mockImplementation(() => undefined);
    broken.profile = true;

    const html = await render();

    expect(html).toContain('Profile unavailable');
    expect(html).not.toContain('You have it');
    expect(html).toContain('postings ask for most');
    expect(html).toContain('id="gaps-heading"');
  });
});
