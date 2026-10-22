import { deriveRoadmapView } from '@rumbo/contracts';
import type { Metadata } from 'next';

import { PageHeader } from '../../../components/page-header';
import { LineLegend } from '../../../components/roadmap/line-legend';
import { RoadmapExplorer } from '../../../components/roadmap/roadmap-explorer';
import { SingleLineView } from '../../../components/roadmap/single-line-view';
import { getRoadmap, getRoadmapLayout, getTargetColors } from '../../../lib/data';
import { singleLine } from '../../../lib/roadmap/single-line';
import { subwayMap } from '../../../lib/roadmap/subway-map';

export const metadata: Metadata = { title: 'Roadmap · rumbo' };

/**
 * The roadmap (spec 01): the subway map from `lg` when the layout fits (M3, #117) over the station
 * list, which is the single line on smaller screens and without a layout (M2, #108). The summary
 * band (#112) goes above both.
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
        {layout ? (
          <RoadmapExplorer line={line} map={subwayMap(roadmap, layout, view, colors)} />
        ) : (
          <SingleLineView line={line} />
        )}
      </div>
    </>
  );
}
