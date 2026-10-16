import degradedPayload from '@rumbo/contracts/fixtures/health.degraded.json' with { type: 'json' };
import okPayload from '@rumbo/contracts/fixtures/health.ok.json' with { type: 'json' };
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import RootLayout, { metadata } from '../src/app/layout';
import StatusPage from '../src/app/page';

// connection() only opts the page out of prerendering; outside a Next request it has nothing to do.
vi.mock('next/server', () => ({ connection: () => Promise.resolve() }));
// next/font only works inside Next's compiler; outside it a font is just its variable class name.
vi.mock('next/font/google', () => {
  const font = (options: { variable: string }) => ({ variable: options.variable.slice(2) });
  return { Bricolage_Grotesque: font, Figtree: font, IBM_Plex_Mono: font };
});

const NOW = new Date('2026-10-10T12:00:00.000Z');

function respond(status: number, body: unknown) {
  vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockResolvedValue(Response.json(body, { status })));
}

async function renderPage(): Promise<string> {
  return renderToStaticMarkup(await StatusPage());
}

function field(html: string, testId: string): string | undefined {
  return new RegExp(`data-testid="${testId}">([^<]*)<`).exec(html)?.[1];
}

beforeEach(() => {
  vi.useFakeTimers({ now: NOW, toFake: ['Date'] });
  vi.stubEnv('API_INTERNAL_URL', 'http://api:3001');
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('status page', () => {
  it('shows everything up with a fresh heartbeat and the version', async () => {
    respond(200, okPayload);

    const html = await renderPage();

    expect(field(html, 'api-status')).toBe('up');
    expect(field(html, 'db-status')).toBe('db: up');
    expect(field(html, 'heartbeat-status')).toBe('ok, last 42s ago');
    expect(html).toContain('1.0.0 (abc123)');
  });

  it('marks an old heartbeat as stale', async () => {
    respond(200, { ...okPayload, lastHeartbeatAt: '2026-10-10T11:50:00.000Z' });

    expect(field(await renderPage(), 'heartbeat-status')).toBe('stale, last 10m ago');
  });

  it('says there is no heartbeat yet on an empty database', async () => {
    respond(200, { ...okPayload, lastHeartbeatAt: null });

    expect(field(await renderPage(), 'heartbeat-status')).toBe('none yet');
  });

  it('shows the database down from a 503 report', async () => {
    respond(503, degradedPayload);

    const html = await renderPage();

    expect(field(html, 'db-status')).toBe('db: down');
    expect(field(html, 'heartbeat-status')).toBe('unknown');
  });

  it('shows the API down and the version unknown when the API is unreachable', async () => {
    vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockRejectedValue(new TypeError('fetch failed')));

    const html = await renderPage();

    expect(field(html, 'api-status')).toBe('down');
    expect(html).toContain('<dd>unknown</dd>');
  });
});

describe('root layout', () => {
  it('wraps pages in an English document with the theme typefaces', () => {
    const html = renderToStaticMarkup(RootLayout({ children: 'page' }));

    expect(html).toMatch(/^<html lang="en" class="font-display font-body font-data">/);
    expect(html).toContain('<body>page</body>');
    expect(metadata.title).toBe('rumbo');
  });
});
