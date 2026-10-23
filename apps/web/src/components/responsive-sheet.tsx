'use client';

import { XIcon } from 'lucide-react';
import type { ReactNode } from 'react';

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

import { useMediaQuery } from '../lib/use-media-query';

/**
 * A modal panel per ADR 0007: a side sheet from `md` (Base UI Dialog) and a bottom sheet that
 * swipes down to close on phones (Base UI Drawer). Both trap focus, close on Esc and give focus
 * back to what opened them. Shared by the station panel (#109) and Change targets (#112).
 */
export function ResponsiveSheet({
  open,
  onClose,
  title,
  description,
  hideDescription = false,
  eyebrow,
  regionLabel,
  children,
}: {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly title: string;
  readonly description: string;
  /** Keep the description for assistive tech only. */
  readonly hideDescription?: boolean;
  /** Shown above the title, e.g. a "Preview" badge. */
  readonly eyebrow?: ReactNode;
  /** Names the bottom sheet's scroll region. */
  readonly regionLabel: string;
  readonly children: ReactNode;
}) {
  const wide = useMediaQuery('(min-width: 48rem)');
  const onOpenChange = (next: boolean) => {
    if (!next) onClose();
  };
  const descriptionClass = hideDescription ? 'sr-only' : undefined;

  if (wide) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="right"
          className="w-full gap-0 overflow-y-auto data-[side=right]:sm:max-w-md"
        >
          <SheetHeader className="pr-12">
            {eyebrow}
            <SheetTitle className="text-xl font-bold">{title}</SheetTitle>
            <SheetDescription className={descriptionClass}>{description}</SheetDescription>
          </SheetHeader>
          <div className="px-4 pb-6">{children}</div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange} showSwipeHandle>
      <DrawerContent>
        <DrawerHeader className="relative pr-12 group-data-[swipe-axis=y]/drawer-popup:text-left">
          {eyebrow}
          <DrawerTitle className="text-xl font-bold">{title}</DrawerTitle>
          <DrawerDescription className={descriptionClass}>{description}</DrawerDescription>
          <DrawerClose
            render={<Button variant="ghost" size="icon-sm" className="absolute top-3 right-3" />}
          >
            <XIcon aria-hidden />
            <span className="sr-only">Close</span>
          </DrawerClose>
        </DrawerHeader>
        {/* Focusable, so keyboards can scroll it when it holds no link (WCAG 2.1.1, #110). */}
        <div
          role="region"
          aria-label={regionLabel}
          tabIndex={0}
          className="overflow-y-auto rounded-sm px-4 pt-4 pb-8 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
        >
          {children}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
