import { cn } from 'cn';
import Link from 'next/link';

import { LINE_BG } from '../../lib/line-colors';
import type { Lane } from '../../lib/roadmap/single-line';

/**
 * Which target's line the station list shows (#148), and the map's legend: color always next to
 * the name (docs/product/views.md). Links to `?line=<id>`, so the choice survives a reload, can
 * be shared, and works before the page hydrates.
 */
export function LineSwitcher({
  lanes,
  selectedId,
  className,
}: {
  readonly lanes: readonly Lane[];
  /** Null while the user has not picked a line (#148). */
  readonly selectedId: string | null;
  readonly className?: string;
}) {
  return (
    <div role="group" aria-label="Show line" className={cn('flex flex-wrap gap-2', className)}>
      {lanes.map(({ target, color }) => {
        const selected = target.id === selectedId;
        return (
          <Link
            key={target.id}
            href={`?line=${encodeURIComponent(target.id)}`}
            scroll={false}
            replace
            aria-current={selected ? 'true' : undefined}
            className={cn(
              'inline-flex min-h-9 items-center gap-2 rounded-full border px-3 py-1.5 text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring',
              selected
                ? 'border-foreground bg-foreground text-background'
                : 'border-border text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
          >
            <span aria-hidden className={cn('h-1 w-5 shrink-0 rounded-full', LINE_BG[color])} />
            <span className={cn(selected && 'font-semibold')}>{target.roleFamily.name}</span>
            {target.isPrimary ? (
              <span className={cn('text-xs', selected ? 'opacity-80' : 'text-muted-foreground')}>
                (primary)
              </span>
            ) : null}
          </Link>
        );
      })}
    </div>
  );
}
