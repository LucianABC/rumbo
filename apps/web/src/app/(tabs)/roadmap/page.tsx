import { deriveRoadmapView } from '@rumbo/contracts';
import type { Metadata } from 'next';

import { MarketProvenance } from '../../../components/market-provenance';
import { PageHeader } from '../../../components/page-header';
import { ChangeTargets } from '../../../components/roadmap/change-targets';
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
import {
  lineCurrent,
  lineFor,
  selectedStationId,
  selectedTargetId,
  singleLine,
} from '../../../lib/roadmap/single-line';
import { subwayMap } from '../../../lib/roadmap/subway-map';
import { changePreview, marketProvenance, targetSummaries } from '../../../lib/roadmap/summary';

export const metadata: Metadata = { title: 'Roadmap · rumbo' };

/**
 * The roadmap (spec 01): the summary band (#112), then the subway map from `lg` when the layout
 * fits (M3, #117) over the station list, which is the single line on smaller screens and without a
 * layout (M2, #108). Either one opens a station's panel (#109). The list shows one target's line,
 * chosen with `?line=` from the switcher under the map or the map itself, and the map highlights
 * it. With no choice the desktop list waits for one, and phones show the primary's (#148).
 * `?station=` opens that station's panel on load, for links from Skills & gaps (#111).
 */
export default async function RoadmapPage({
  searchParams,
}: {
  readonly searchParams: Promise<{ line?: string | string[]; station?: string | string[] }>;
}) {
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
  const params = await searchParams;
  const selectedId = selectedTargetId(roadmap, params.line);
  // Without a choice the phone list still needs a line, so it shows the primary's; the desktop
  // list stays hidden until the user picks one, and the map marks the plan's current milestone.
  const listId = selectedId ?? line.lanes[0]?.target.id ?? '';
  const current = lineCurrent(view, listId);
  const provenance = band ? marketProvenance(band.market) : null;

  return (
    <>
      <PageHeader
        title="Roadmap"
        provenance={provenance ? <MarketProvenance {...provenance} /> : null}
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
        <RoadmapExplorer
          lanes={line.lanes}
          line={lineFor(line, view, listId)}
          stations={line.rows.flatMap((row) => (row.kind === 'milestone' ? [row] : []))}
          selectedId={selectedId}
          initialStationId={selectedStationId(roadmap, params.station)}
          map={
            layout
              ? subwayMap(
                  roadmap,
                  layout,
                  view,
                  colors,
                  selectedId ? current : view.currentMilestoneId,
                )
              : null
          }
          gapNames={Object.fromEntries(roadmap.gaps.map((g) => [g.id, g.skill.name]))}
        />
      </div>
    </>
  );
}
