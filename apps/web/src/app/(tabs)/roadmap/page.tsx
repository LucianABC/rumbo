import { deriveRoadmapView } from '@rumbo/contracts';
import type { Metadata } from 'next';
import Link from 'next/link';

import { PageHeader } from '../../../components/page-header';
import { ChangeTargets } from '../../../components/roadmap/change-targets';
import { LineLegend } from '../../../components/roadmap/line-legend';
import { RoadmapExplorer } from '../../../components/roadmap/roadmap-explorer';
import { SummaryBand } from '../../../components/roadmap/summary-band';
import { coverage } from '../../../lib/coverage';
import {
  getMarket,
  getProfile,
  getProfileSummary,
  getRoadmap,
  getRoadmapLayout,
  getTargetColors,
} from '../../../lib/data';
import { formatDay } from '../../../lib/format';
import { singleLine } from '../../../lib/roadmap/single-line';
import { subwayMap } from '../../../lib/roadmap/subway-map';
import { changePreview, marketProvenance, targetSummaries } from '../../../lib/roadmap/summary';

export const metadata: Metadata = { title: 'Roadmap · rumbo' };

/**
 * The roadmap (spec 01): the summary band (#112), then the subway map from `lg` when the layout
 * fits (M3, #117) over the station list, which is the single line on smaller screens and without a
 * layout (M2, #108). Either one opens a station's panel (#109).
 */
export default async function RoadmapPage() {
  const roadmap = await getRoadmap();
  const [layout, profile, market] = await Promise.all([
    getRoadmapLayout(roadmap),
    getProfile(),
    getMarket(roadmap),
  ]);
  const colors = getTargetColors(roadmap, layout);
  const view = deriveRoadmapView(roadmap);
  const line = singleLine(roadmap, view, colors);
  const targets = targetSummaries(
    line.lanes,
    coverage(
      profile,
      market,
      line.lanes.map((l) => l.target.id),
    ),
  );
  const provenance = marketProvenance(market);

  return (
    <>
      <PageHeader
        title="Roadmap"
        provenance={
          provenance ? (
            <>
              Market data from {provenance.postings} postings, checked{' '}
              {formatDay(provenance.checkedAt)} ·{' '}
              <Link href="/sources" className="underline underline-offset-4 hover:text-foreground">
                see Sources
              </Link>
            </>
          ) : null
        }
      />
      <div className="flex flex-col gap-6">
        <SummaryBand
          who={getProfileSummary(profile, market, roadmap)}
          targets={targets}
          changeTargets={<ChangeTargets preview={changePreview(roadmap, line.lanes)} />}
        />
        <LineLegend lanes={line.lanes} />
        <RoadmapExplorer
          line={line}
          map={layout ? subwayMap(roadmap, layout, view, colors) : null}
          gapNames={Object.fromEntries(roadmap.gaps.map((g) => [g.id, g.skill.name]))}
        />
      </div>
    </>
  );
}
