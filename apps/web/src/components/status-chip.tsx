import type { ItemStatus } from '@rumbo/contracts';
import { cn } from 'cn';

import { ITEM_STATUS_LABEL } from '../lib/labels';

const STYLE: Readonly<Record<ItemStatus, string>> = {
  done: 'border-success/40 text-success',
  in_progress: 'border-primary/40 bg-primary/10 text-primary',
  pending: 'border-border text-muted-foreground',
};

/**
 * One chip style per status, shared by every tab (docs/product/views.md, #108). The word is always
 * there, so the status never rests on color.
 */
export function StatusChip({
  status,
  className,
}: {
  readonly status: ItemStatus;
  readonly className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex h-5 shrink-0 items-center rounded-full border px-2 text-2xs font-medium whitespace-nowrap',
        STYLE[status],
        className,
      )}
    >
      {ITEM_STATUS_LABEL[status]}
    </span>
  );
}
