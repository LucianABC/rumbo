'use client';

import type { Market } from '@rumbo/contracts/provisional';
import { useMemo } from 'react';

import { coverage } from '../../lib/coverage';
import { profileSummary } from '../../lib/profile-summary';
import {
  lineCurrent,
  lineFor,
  selectedStationId,
  selectedTargetId,
  singleLine,
} from '../../lib/roadmap/single-line';
import { subwayMap } from '../../lib/roadmap/subway-map';
import { changePreview, targetSummaries } from '../../lib/roadmap/summary';
import { usePlan, useProfile, useRoadmapLayout } from '../../lib/store';
import { ChangeTargets } from './change-targets';
import { RoadmapExplorer } from './roadmap-explorer';
import { SummaryBand, SummaryUnavailable } from './summary-band';

/**
 * The roadmap (spec 01) from the plan in the store, so the map, the list and the station panel
 * move with every decision (#168): the summary band (#112), then the subway map from `lg` when the
 * layout fits (M3, #117) over the station list, which is the single line on smaller screens and
 * without a layout (M2, #108). Either one opens a station's panel (#109). The list shows one
 * target's line, chosen with `?line=` from the switcher under the map or the map itself, and the
 * map highlights it. With no choice the desktop list waits for one, and phones show the primary's
 * (#148). `?station=` opens that station's panel on load, for links from Skills & gaps (#111).
 */
export function RoadmapTab({
  line: lineParam,
  station: stationParam,
  market,
  now,
}: {
  readonly line: string | string[] | undefined;
  readonly station: string | string[] | undefined;
  /** Null when it cannot be read: only the band degrades (#112). */
  readonly market: Market | null;
  /** The request's time, so the server and the browser render the same years (ISO). */
  readonly now: string;
}) {
  const { roadmap, view, colors } = usePlan();
  const profile = useProfile();
  const layout = useRoadmapLayout();
  const line = useMemo(() => singleLine(roadmap, view, colors), [roadmap, view, colors]);
  const selectedId = selectedTargetId(roadmap, lineParam);
  // Without a choice the phone list still needs a line, so it shows the primary's; the desktop
  // list stays hidden until the user picks one, and the map marks the plan's current milestone.
  const listId = selectedId ?? line.lanes[0]?.target.id ?? '';
  const current = lineCurrent(view, listId);
  const map = useMemo(
    () =>
      layout
        ? subwayMap(roadmap, layout, view, colors, selectedId ? current : view.currentMilestoneId)
        : null,
    [roadmap, layout, view, colors, selectedId, current],
  );

  return (
    <div className="flex flex-col gap-6">
      {profile && market ? (
        <SummaryBand
          who={profileSummary(profile, market, roadmap, new Date(now))}
          targets={targetSummaries(
            line.lanes,
            coverage(
              profile,
              market,
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
        initialStationId={selectedStationId(roadmap, stationParam)}
        map={map}
        gapNames={Object.fromEntries(roadmap.gaps.map((g) => [g.id, g.skill.name]))}
      />
    </div>
  );
}
