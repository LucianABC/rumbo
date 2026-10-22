'use client';

import { XIcon } from 'lucide-react';
import { useState } from 'react';

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
  gapNames,
  onClose,
}: {
  readonly row: MilestoneRow | null;
  readonly gapNames: Readonly<Record<string, string>>;
  readonly onClose: () => void;
}) {
  const wide = useMediaQuery('(min-width: 48rem)');
  const open = row !== null;
  // Keep showing the last station while the panel animates closed, instead of an empty panel.
  const [shown, setShown] = useState(row);
  if (row !== null && row !== shown) setShown(row);
  const onOpenChange = (next: boolean) => {
    if (!next) onClose();
  };
  const description = shown
    ? `Moves you toward ${joinNames(shown.serves.map((t) => t.roleFamily.name))}`
    : '';

  if (wide) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="right"
          className="w-full gap-0 overflow-y-auto data-[side=right]:sm:max-w-md"
        >
          {shown ? (
            <>
              <SheetHeader className="pr-12">
                <SheetTitle className="text-xl font-bold">{shown.milestone.title}</SheetTitle>
                <SheetDescription className="sr-only">{description}</SheetDescription>
              </SheetHeader>
              <div className="px-4 pb-6">
                <StationDetail row={shown} gapNames={gapNames} />
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
        {shown ? (
          <>
            <DrawerHeader className="relative pr-12 group-data-[swipe-axis=y]/drawer-popup:text-left">
              <DrawerTitle className="text-xl font-bold">{shown.milestone.title}</DrawerTitle>
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
            <div className="overflow-y-auto px-4 pt-4 pb-8">
              <StationDetail row={shown} gapNames={gapNames} />
            </div>
          </>
        ) : null}
      </DrawerContent>
    </Drawer>
  );
}
