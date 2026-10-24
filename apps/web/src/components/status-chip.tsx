import type { Gap, ItemStatus } from '@rumbo/contracts';
import { cn } from 'cn';

import { GAP_STATUS_LABEL, ITEM_STATUS_LABEL } from '../lib/labels';

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
  return <Chip style={STYLE[status]} label={ITEM_STATUS_LABEL[status]} className={className} />;
}

const GAP_STYLE: Readonly<Record<Gap['status'], string>> = {
  open: STYLE.pending,
  in_progress: STYLE.in_progress,
  closed: STYLE.done,
};

/** A gap's status in the same chip as items, with the gap's own words (#111). */
export function GapStatusChip({
  status,
  className,
}: {
  readonly status: Gap['status'];
  readonly className?: string;
}) {
  return <Chip style={GAP_STYLE[status]} label={GAP_STATUS_LABEL[status]} className={className} />;
}

function Chip({
  style,
  label,
  className,
}: {
  readonly style: string;
  readonly label: string;
  readonly className?: string | undefined;
}) {
  return (
    <span
      className={cn(
        'inline-flex h-5 shrink-0 items-center rounded-full border px-2 text-2xs font-medium whitespace-nowrap',
        style,
        className,
      )}
    >
      {label}
    </span>
  );
}
