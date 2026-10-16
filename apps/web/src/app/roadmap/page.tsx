import { deriveRoadmapView, isInterchange } from '@rumbo/contracts';
import type { Metadata } from 'next';

import { getRoadmap } from '../../lib/data';

export const metadata: Metadata = { title: 'Roadmap · rumbo' };

const STATUS_LABEL = { pending: 'pending', in_progress: 'in progress', done: 'done' } as const;
const ITEM_LABEL = {
  project: 'practice project',
  education: 'education',
  work_experience: 'work experience',
} as const;

/** Walking-skeleton view of the roadmap: the data, unstyled, in plan order (spec 01, M0). */
export default async function RoadmapPage() {
  const roadmap = await getRoadmap();
  const view = deriveRoadmapView(roadmap);
  const targetName = new Map(roadmap.targets.map((t) => [t.id, t.roleFamily.name]));

  return (
    <main>
      <h1>Roadmap</h1>
      <p>From: {roadmap.from}</p>
      <ol>
        {roadmap.milestones.map((milestone) => {
          const targets = (view.targetsByMilestone.get(milestone.id) ?? []).map((id) =>
            targetName.get(id),
          );
          const status = view.statusByMilestone.get(milestone.id) ?? 'pending';
          return (
            <li key={milestone.id} data-testid="station">
              <strong>{milestone.title}</strong>
              {milestone.id === view.currentMilestoneId && ' (you are here)'} —{' '}
              {STATUS_LABEL[status]} · serves {targets.join(', ')}
              {isInterchange(view, milestone.id) && ' · interchange'}
              <ul>
                {milestone.items.map((item) => (
                  <li key={item.id}>
                    {item.title} ({ITEM_LABEL[item.type]}, {STATUS_LABEL[item.status]})
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
