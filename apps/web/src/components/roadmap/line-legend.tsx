import { cn } from 'cn';

import { LINE_BG } from '../../lib/line-colors';
import type { Lane } from '../../lib/roadmap/single-line';

/** Which line is which target: color always next to the name (docs/product/views.md, #108). */
export function LineLegend({ lanes }: { readonly lanes: readonly Lane[] }) {
  return (
    // role="list": Safari drops list semantics under Tailwind's `list-style: none` (#108).
    <ul role="list" aria-label="Lines" className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
      {lanes.map(({ target, color }) => (
        <li key={target.id} className="inline-flex items-center gap-2">
          <span aria-hidden className={cn('h-1 w-5 rounded-full', LINE_BG[color])} />
          <span className={cn(target.isPrimary && 'font-semibold')}>{target.roleFamily.name}</span>
          {target.isPrimary ? (
            <span className="text-xs text-muted-foreground">(primary)</span>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
