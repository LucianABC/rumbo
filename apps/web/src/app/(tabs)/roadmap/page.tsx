import { deriveRoadmapView } from '@rumbo/contracts';
import type { Metadata } from 'next';

import { PageHeader } from '../../../components/page-header';
import { LineLegend } from '../../../components/roadmap/line-legend';
import { RoadmapExplorer } from '../../../components/roadmap/roadmap-explorer';
import { getRoadmap, getRoadmapLayout, getTargetColors } from '../../../lib/data';
import { singleLine } from '../../../lib/roadmap/single-line';
import { subwayMap } from '../../../lib/roadmap/subway-map';

export const metadata: Metadata = { title: 'Roadmap · rumbo' };

/**
 * The roadmap (spec 01): the subway map from `lg` when the layout fits (M3, #117) over the station
 * list, which is the single line on smaller screens and without a layout (M2, #108). The summary
 * band (#112) goes above both. Either one opens a station's panel (#109).
 */
export default async function RoadmapPage() {
  const roadmap = await getRoadmap();
  const layout = await getRoadmapLayout(roadmap);
  const colors = getTargetColors(roadmap, layout);
  const view = deriveRoadmapView(roadmap);
  const line = singleLine(roadmap, view, colors);

  return (
    <>
      <PageHeader title="Roadmap" />
      <div className="flex flex-col gap-6">
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
