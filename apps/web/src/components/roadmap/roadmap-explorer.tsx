'use client';

import { useState } from 'react';

import type { SingleLine, SingleLineRow } from '../../lib/roadmap/single-line';
import type { SubwayMap } from '../../lib/roadmap/subway-map';
import { SingleLineView } from './single-line-view';
import { StationSheet } from './station-sheet';
import { SubwayMapView } from './subway-map-view';

type MilestoneRow = Extract<SingleLineRow, { kind: 'milestone' }>;

/**
 * The roadmap's interactive part (spec 01): the subway map from `lg` when there is a layout
 * (#117), the station list always (#108), and the station panel either one opens (#109). They
 * share which targets are highlighted and which station is open.
 */
export function RoadmapExplorer({
  line,
  map,
  gapNames,
}: {
  readonly line: SingleLine;
  readonly map: SubwayMap | null;
  readonly gapNames: Readonly<Record<string, string>>;
}) {
  const [active, setActive] = useState<readonly string[] | null>(null);
  // The last station opened stays set after closing, so the panel keeps its content while it
  // animates out; `open` alone says whether it shows (#142).
  const [stationId, setStationId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const station = line.rows.find(
    (row): row is MilestoneRow => row.kind === 'milestone' && row.id === stationId,
  );
  const openStation = (id: string) => {
    setStationId(id);
    setOpen(true);
  };

  return (
    <>
      {map ? (
        <div className="hidden lg:block">
          <SubwayMapView map={map} active={active} onActivate={setActive} onOpen={openStation} />
        </div>
      ) : null}
      <SingleLineView
        line={line}
        withMap={map !== null}
        onActivate={setActive}
        onOpen={openStation}
      />
      <StationSheet
        row={station ?? null}
        open={open}
        gapNames={gapNames}
        onClose={() => {
          setOpen(false);
        }}
      />
    </>
  );
}
