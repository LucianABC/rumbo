import { deriveRoadmapView } from '@rumbo/contracts';
import type { Metadata } from 'next';

import { PageHeader } from '../../../components/page-header';
import { LineLegend } from '../../../components/roadmap/line-legend';
import { SingleLineView } from '../../../components/roadmap/single-line-view';
import { getRoadmap, getRoadmapLayout, getTargetColors } from '../../../lib/data';
import { singleLine } from '../../../lib/roadmap/single-line';

export const metadata: Metadata = { title: 'Roadmap · rumbo' };

/**
 * The roadmap as a single line (spec 01, M2, #108). The summary band (#112) goes above it, and
 * from `lg` the subway map (#117) is drawn over it when the layout fits.
 */
export default async function RoadmapPage() {
  const roadmap = await getRoadmap();
  const colors = getTargetColors(roadmap, await getRoadmapLayout(roadmap));
  const line = singleLine(roadmap, deriveRoadmapView(roadmap), colors);

  return (
    <>
      <PageHeader title="Roadmap" />
      <div className="flex flex-col gap-6">
        <LineLegend lanes={line.lanes} />
        <SingleLineView line={line} />
      </div>
    </>
  );
}
