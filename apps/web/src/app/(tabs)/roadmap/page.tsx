import { deriveRoadmapView } from '@rumbo/contracts';
import type { Metadata } from 'next';
import Link from 'next/link';

import { PageHeader } from '../../../components/page-header';
import { ChangeTargets } from '../../../components/roadmap/change-targets';
import { LineLegend } from '../../../components/roadmap/line-legend';
import { RoadmapExplorer } from '../../../components/roadmap/roadmap-explorer';
import { SummaryBand, SummaryUnavailable } from '../../../components/roadmap/summary-band';
import { coverage } from '../../../lib/coverage';
import {
  getProfile,
  getProfileSummary,
  getRoadmap,
  getRoadmapLayout,
  getSummaryData,
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
  // The profile does not depend on the roadmap, so it loads alongside it (#112).
  const pendingProfile = getProfile();
  // getSummaryData handles its rejection; this only keeps it from going unhandled when the
  // roadmap fails first.
  pendingProfile.catch(() => undefined);
  const roadmap = await getRoadmap();
  const [layout, band] = await Promise.all([
    getRoadmapLayout(roadmap),
    getSummaryData(pendingProfile, roadmap),
  ]);
  const colors = getTargetColors(roadmap, layout);
  const view = deriveRoadmapView(roadmap);
  const line = singleLine(roadmap, view, colors);
  const provenance = band ? marketProvenance(band.market) : null;

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
        {band ? (
          <SummaryBand
            who={getProfileSummary(band.profile, band.market, roadmap)}
            targets={targetSummaries(
              line.lanes,
              coverage(
                band.profile,
                band.market,
                line.lanes.map((l) => l.target.id),
              ),
            )}
            changeTargets={<ChangeTargets preview={changePreview(roadmap, line.lanes)} />}
          />
        ) : (
          <SummaryUnavailable />
        )}
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
