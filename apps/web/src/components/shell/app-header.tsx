import type { LineColorToken, Target } from '@rumbo/contracts';
import { cn } from 'cn';
import Link from 'next/link';

import { LINE_BG } from '../../lib/line-colors';

/**
 * Product name and the primary target as context (docs/product/views.md, #107). The user menu
 * (Settings, "Delete all my data") lands with the ownership endpoints (#37).
 */
export function AppHeader({
  target,
  color,
}: {
  readonly target: Target;
  readonly color: LineColorToken | undefined;
}) {
  return (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-4 border-b bg-background px-4 md:px-6">
      <Link
        href="/roadmap"
        className="rounded-md font-heading text-xl font-bold tracking-tight outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        rumbo
      </Link>
      <p className="flex min-w-0 items-center gap-2 text-sm text-muted-foreground">
        <span
          aria-hidden
          className={cn('size-2.5 shrink-0 rounded-full', color ? LINE_BG[color] : 'bg-pending')}
        />
        <span className="truncate">
          Toward <span className="font-medium text-foreground">{target.roleFamily.name}</span>
        </span>
      </p>
    </header>
  );
}
