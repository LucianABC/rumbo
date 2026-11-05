import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

import ProjectsPage from '../src/app/(tabs)/projects/page';
import { logger } from '../src/lib/logger';

vi.mock('next/server', () => ({ connection: () => Promise.resolve() }));

// Each test can break one mock; getters so the switch reaches lib/data's imports.
const state = vi.hoisted(() => ({ progress: 'real' }));
vi.mock('../src/mocks/progress', async (importOriginal) => {
  const real = await importOriginal<{ progress: unknown }>();
  return {
    get progress() {
      if (state.progress === 'invalid') return { projects: 'nope' };
      if (state.progress === 'unfit') {
        return {
          syncedAt: '2026-10-14T18:30:00.000Z',
          projects: [{ itemId: 'not-here', lastPushAt: '2026-10-14T18:30:00.000Z', commits: [] }],
        };
      }
      return real.progress;
    },
  };
});

afterEach(() => {
  state.progress = 'real';
  vi.restoreAllMocks();
});

async function page(): Promise<string> {
  return renderToStaticMarkup(await ProjectsPage());
}

describe('ProjectsPage', () => {
  it('shows every project in its section, with the id Skills & gaps links to (#111)', async () => {
    const html = await page();

    expect(html).toMatch(/Active <span[^>]*>\(2\)/);
    expect(html).toMatch(/Completed <span[^>]*>\(1\)/);
    // Roadmap links to these (projectHref); a deliverable holds its own when a repo is shared.
    for (const id of ['sales-dashboard', 'open-data-case', 'practice-queries']) {
      expect(html).toMatch(new RegExp(`<details id="project-${id}"[^>]*scroll-mt-28`));
    }
  });

  it('says when the activity was synced', async () => {
    expect(await page()).toContain('Repo activity synced 14 Oct 2026');
  });

  it('offers Approve and Reject only on what awaits the user, each naming what it decides', async () => {
    const html = await page();

    expect(html).toContain('aria-label="Approve: Commit a3f9c21, Sales dashboard project"');
    expect(html).toContain('aria-label="Reject: Commit a3f9c21, Sales dashboard project"');
    expect(html.match(/aria-label="Approve: /g)).toHaveLength(1);
    expect(html).toContain('Matched to: Clean and model the data');
  });

  it('shows every project the same way, each deliverable with its station and gaps', async () => {
    const html = await page();

    expect(html.match(/>Deliverables</g)).toHaveLength(3);
    expect(html).toContain('Deliverable: </span>');
    expect(html).toContain('Roadmap station: </span>');
    expect(html).toContain('>Build a public dashboard<');
    // Before the fold, so a closed deliverable still says where it belongs.
    expect(html).toMatch(/Build a public dashboard<\/a>.*?<details id="project-sales-dashboard"/);
    // Before the fold too, so a closed deliverable still says what it closes.
    expect(html).toMatch(/gap-data-visualization.*?<details id="project-sales-dashboard"/);
    expect(html).toContain('href="/roadmap?line=');
  });

  it('names each deliverable’s lines in words, not by color alone', async () => {
    const html = await page();

    expect(html).toContain('title="Data Analyst"');
    expect(html).toContain('>DA</span>');
    expect(html).toContain('<span class="sr-only">Business Analyst</span>');
    expect(html).not.toContain('See on Roadmap');
  });

  it('spells out what the tab badge counts', async () => {
    const html = await page();

    expect(html).toContain('4 open tasks');
    expect(html).toContain('1 awaiting approval');
  });

  it('links each project to its repo', async () => {
    const html = await page();

    expect(html).toContain('href="https://github.com/example-user/sales-dashboard"');
    expect(html).toContain('github.com/example-user/sales-dashboard</span>');
    expect(html).toContain('href="https://github.com/example-user/practice-queries"');
  });

  it('hints at a missing repo instead of showing activity', async () => {
    expect(await page()).toContain('No repo linked yet');
  });

  it('keeps the cards when the activity is invalid', async () => {
    state.progress = 'invalid';
    const warn = vi.spyOn(logger, 'warn').mockImplementation(() => undefined);

    const html = await page();

    expect(html).toContain('Repo activity is unavailable right now');
    expect(html).toContain('Recent commits are unavailable right now.');
    expect(html).toContain('Sales dashboard project');
    expect(warn).toHaveBeenCalledOnce();
  });

  it('treats activity for another roadmap like invalid data', async () => {
    state.progress = 'unfit';
    vi.spyOn(logger, 'warn').mockImplementation(() => undefined);

    expect(await page()).toContain('Repo activity is unavailable right now');
  });
});
