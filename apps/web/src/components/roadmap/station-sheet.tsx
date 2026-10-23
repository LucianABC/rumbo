'use client';

import type { SingleLineRow } from '../../lib/roadmap/single-line';
import { joinNames } from '../../lib/roadmap/single-line';
import { ResponsiveSheet } from '../responsive-sheet';
import { StationDetail } from './station-detail';

type MilestoneRow = Extract<SingleLineRow, { kind: 'milestone' }>;

/**
 * A station's detail panel (spec 01, M2, #109): a side sheet from `md` and a bottom sheet on
 * phones (ResponsiveSheet), giving focus back to the station that opened it.
 */
export function StationSheet({
  row,
  open,
  gapNames,
  onClose,
}: {
  /** The station to show; still set while the panel animates closed (#142). */
  readonly row: MilestoneRow | null;
  readonly open: boolean;
  readonly gapNames: Readonly<Record<string, string>>;
  readonly onClose: () => void;
}) {
  return (
    <ResponsiveSheet
      open={open}
      onClose={onClose}
      title={row?.milestone.title ?? ''}
      description={
        row ? `Moves you toward ${joinNames(row.serves.map((t) => t.roleFamily.name))}` : ''
      }
      hideDescription
      regionLabel="Station details"
    >
      {row ? <StationDetail row={row} gapNames={gapNames} /> : null}
    </ResponsiveSheet>
  );
}
