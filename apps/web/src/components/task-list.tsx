import { cn } from 'cn';
import { Circle, CircleCheck } from 'lucide-react';

import type { TaskRow } from '../lib/projects/projects-view';
import { DraftStatusChip } from './status-chip';

/**
 * A project's tasks, the same on Roadmap and Projects (owner, #114). Done means what the rows say:
 * stored, or proved by evidence the user approved. The icon only repeats what the words say.
 */
export function TaskList({ tasks }: { readonly tasks: readonly TaskRow[] }) {
  return (
    <ul role="list" className="flex flex-col gap-1.5 text-sm">
      {tasks.map((task) => (
        <li key={task.id} className="flex items-start gap-2">
          {task.done ? (
            <CircleCheck aria-hidden className="mt-0.5 size-4 shrink-0 text-success" />
          ) : (
            <Circle aria-hidden className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          )}
          <span
            className={cn('min-w-0 break-words', task.done && 'text-muted-foreground line-through')}
          >
            <span className="sr-only">{task.done ? 'Done: ' : 'To do: '}</span>
            {task.title}
          </span>
          {task.awaitingEvidence ? <DraftStatusChip status="awaiting" /> : null}
        </li>
      ))}
    </ul>
  );
}
