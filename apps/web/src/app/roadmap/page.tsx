import { deriveRoadmapView, isInterchange } from '@rumbo/contracts';
import type { Metadata } from 'next';

import { getRoadmap } from '../../lib/data';
import { ITEM_STATUS_LABEL, ITEM_TYPE_LABEL } from '../../lib/labels';

export const metadata: Metadata = { title: 'Roadmap · rumbo' };

/**
 * Walking-skeleton view of the roadmap: the data in plan order, before any design (spec 01, M0).
 * The few classes only restore what Tailwind's preflight resets, so the plan order stays visible
 * as list numbers (#104).
 */
export default async function RoadmapPage() {
  const roadmap = await getRoadmap();
  const view = deriveRoadmapView(roadmap);
  const targetName = new Map(roadmap.targets.map((t) => [t.id, t.roleFamily.name]));

  return (
    <main className="p-4">
      <h1 className="text-2xl font-semibold">Roadmap</h1>
      <p className="my-2">From: {roadmap.from}</p>
      <ol className="list-decimal space-y-2 pl-6">
        {roadmap.milestones.map((milestone) => {
          const targets = (view.targetsByMilestone.get(milestone.id) ?? []).map((id) =>
            targetName.get(id),
          );
          const status = view.statusByMilestone.get(milestone.id) ?? 'pending';
          return (
            <li key={milestone.id} data-testid="station">
              <strong>{milestone.title}</strong>
              {milestone.id === view.currentMilestoneId && ' (you are here)'} —{' '}
              {ITEM_STATUS_LABEL[status]} · serves {targets.join(', ')}
              {isInterchange(view, milestone.id) && ' · interchange'}
              <ul className="list-disc pl-6">
                {milestone.items.map((item) => (
                  <li key={item.id}>
                    {item.title} ({ITEM_TYPE_LABEL[item.type]}, {ITEM_STATUS_LABEL[item.status]})
                  </li>
                ))}
              </ul>
            </li>
          );
        })}
        {roadmap.targets.map((target) => (
          <li key={target.id} data-testid="station">
            <strong>{target.roleFamily.name}</strong> — target role
            {target.isPrimary && ' (primary)'}
          </li>
        ))}
      </ol>
    </main>
  );
}
