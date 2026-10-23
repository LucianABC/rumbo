import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import RoadmapPage from '../src/app/(tabs)/roadmap/page';
import { logger } from '../src/lib/logger';

// A market that does not fit the roadmap (no snapshot per target): getMarket rejects (#145).
vi.mock('next/server', () => ({ connection: () => Promise.resolve() }));
vi.mock('../src/mocks/market', () => ({ market: { snapshots: [] } }));

describe('Roadmap with invalid market data (#112)', () => {
  it('degrades only the summary band and still renders the plan', async () => {
    const warn = vi.spyOn(logger, 'warn').mockImplementation(() => undefined);

    const html = renderToStaticMarkup(await RoadmapPage());

    expect(html).toContain('Summary unavailable');
    expect(html).not.toContain('Your targets');
    expect(html).not.toContain('Market data from');
    expect(html).toContain('aria-label="Stations"');
    // Leaves a trace saying which source failed, with the error under `err` (AI rule 5).
    expect(warn).toHaveBeenCalledOnce();
    const [fields, message] = warn.mock.calls[0] as unknown as [Record<string, unknown>, string];
    expect(message).toBe('roadmap summary unavailable');
    expect(fields.source).toBe('market');
    expect(fields.err).toBeInstanceOf(Error);
  });
});
