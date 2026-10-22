'use client';

import { XIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

import type { SingleLineRow } from '../../lib/roadmap/single-line';
import { joinNames } from '../../lib/roadmap/single-line';
import { useMediaQuery } from '../../lib/use-media-query';
import { StationDetail } from './station-detail';

type MilestoneRow = Extract<SingleLineRow, { kind: 'milestone' }>;

/**
 * A station's detail panel (spec 01, M2, #109): a side sheet from `md` (Base UI Dialog) and a
 * bottom sheet that swipes down to close on phones (Base UI Drawer), per ADR 0007. Both are modal
 * dialogs: they trap focus, close on Esc and give focus back to the station that opened them.
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
  const wide = useMediaQuery('(min-width: 48rem)');
  const onOpenChange = (next: boolean) => {
    if (!next) onClose();
  };
  const description = row
    ? `Moves you toward ${joinNames(row.serves.map((t) => t.roleFamily.name))}`
    : '';

  if (wide) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="right"
          className="w-full gap-0 overflow-y-auto data-[side=right]:sm:max-w-md"
        >
          {row ? (
            <>
              <SheetHeader className="pr-12">
                <SheetTitle className="text-xl font-bold">{row.milestone.title}</SheetTitle>
                <SheetDescription className="sr-only">{description}</SheetDescription>
              </SheetHeader>
              <div className="px-4 pb-6">
                <StationDetail row={row} gapNames={gapNames} />
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange} showSwipeHandle>
      <DrawerContent>
        {row ? (
          <>
            <DrawerHeader className="relative pr-12 group-data-[swipe-axis=y]/drawer-popup:text-left">
              <DrawerTitle className="text-xl font-bold">{row.milestone.title}</DrawerTitle>
              <DrawerDescription className="sr-only">{description}</DrawerDescription>
              <DrawerClose
                render={
                  <Button variant="ghost" size="icon-sm" className="absolute top-3 right-3" />
                }
              >
                <XIcon aria-hidden />
                <span className="sr-only">Close</span>
              </DrawerClose>
            </DrawerHeader>
            {/* Focusable, so keyboards can scroll it when it holds no link (WCAG 2.1.1, #110). */}
            <div
              role="region"
              aria-label="Station details"
              tabIndex={0}
              className="overflow-y-auto rounded-sm px-4 pt-4 pb-8 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
            >
              <StationDetail row={row} gapNames={gapNames} />
            </div>
          </>
        ) : null}
      </DrawerContent>
    </Drawer>
  );
}
