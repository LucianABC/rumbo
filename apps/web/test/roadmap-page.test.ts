import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import RoadmapPage from '../src/app/(tabs)/roadmap/page';

// A market that does not fit the roadmap (no snapshot per target): getMarket rejects (#145).
vi.mock('next/server', () => ({ connection: () => Promise.resolve() }));
vi.mock('../src/mocks/market', () => ({ market: { snapshots: [] } }));

describe('Roadmap with invalid market data (#112)', () => {
  it('degrades only the summary band and still renders the plan', async () => {
    const html = renderToStaticMarkup(await RoadmapPage());

    expect(html).toContain('Summary unavailable');
    expect(html).not.toContain('Your targets');
    expect(html).not.toContain('Market data from');
    expect(html).toContain('aria-label="Stations"');
  });
});
