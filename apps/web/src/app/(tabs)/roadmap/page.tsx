import type { Metadata } from 'next';

import { MarketProvenance } from '../../../components/market-provenance';
import { PageHeader } from '../../../components/page-header';
import { RoadmapTab } from '../../../components/roadmap/roadmap-tab';
import { getMarketOrNull, getRoadmap } from '../../../lib/data';
import { marketProvenance } from '../../../lib/roadmap/summary';

export const metadata: Metadata = { title: 'Roadmap · rumbo' };

/**
 * The roadmap (spec 01). The plan and the profile come from the store the tabs layout hydrates
 * (#168); this page reads only what is its own: the URL and the market for the summary band.
 */
export default async function RoadmapPage({
  searchParams,
}: {
  readonly searchParams: Promise<{ line?: string | string[]; station?: string | string[] }>;
}) {
  const [market, params] = await Promise.all([getRoadmap().then(getMarketOrNull), searchParams]);
  const provenance = market ? marketProvenance(market) : null;

  return (
    <>
      <PageHeader
        title="Roadmap"
        provenance={provenance ? <MarketProvenance {...provenance} /> : null}
      />
      <RoadmapTab
        line={params.line}
        station={params.station}
        market={market}
        now={new Date().toISOString()}
      />
    </>
  );
}
