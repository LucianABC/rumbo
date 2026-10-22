'use client';

import { useState } from 'react';

import type { SingleLine } from '../../lib/roadmap/single-line';
import type { SubwayMap } from '../../lib/roadmap/subway-map';
import { SingleLineView } from './single-line-view';
import { SubwayMapView } from './subway-map-view';

/**
 * Map and station list together (spec 01, M3, #117): the map from `lg`, the list always. They
 * share which targets are highlighted, so hovering or focusing a station in the list lights its
 * lines on the map.
 */
export function RoadmapExplorer({
  line,
  map,
}: {
  readonly line: SingleLine;
  readonly map: SubwayMap;
}) {
  const [active, setActive] = useState<readonly string[] | null>(null);

  return (
    <>
      <div className="hidden lg:block">
        <SubwayMapView map={map} active={active} onActivate={setActive} />
      </div>
      <SingleLineView line={line} withMap onActivate={setActive} />
    </>
  );
}
