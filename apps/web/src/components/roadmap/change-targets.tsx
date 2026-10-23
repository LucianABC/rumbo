'use client';

import { XIcon } from 'lucide-react';
import { useState } from 'react';

import { Badge } from '@/components/ui/badge';
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

import type { ChangePreview, ItemOutcome } from '../../lib/roadmap/summary';
import { useMediaQuery } from '../../lib/use-media-query';

const TITLE = 'Change targets';
const DESCRIPTION = 'A preview of a later feature. Nothing here is edited or recalculated.';

/**
 * Change targets, mocked for the demo (spec 01, #112): a read-only explainer of the flow in
 * docs/product/views.md ("Changing the goal") with a sample preview derived from the loaded plan.
 * Same responsive dialog as the station panel: side sheet from `md`, bottom sheet on phones.
 */
export function ChangeTargets({ preview }: { readonly preview: ChangePreview | null }) {
  const [open, setOpen] = useState(false);
  const wide = useMediaQuery('(min-width: 48rem)');
  const trigger = (
    <Button
      variant="outline"
      size="sm"
      onClick={() => {
        setOpen(true);
      }}
    >
      {TITLE}
    </Button>
  );

  if (wide) {
    return (
      <>
        {trigger}
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetContent
            side="right"
            className="w-full gap-0 overflow-y-auto data-[side=right]:sm:max-w-md"
          >
            <SheetHeader className="pr-12">
              <PreviewBadge />
              <SheetTitle className="text-xl font-bold">{TITLE}</SheetTitle>
              <SheetDescription>{DESCRIPTION}</SheetDescription>
            </SheetHeader>
            <div className="px-4 pb-6">
              <Explainer preview={preview} />
            </div>
          </SheetContent>
        </Sheet>
      </>
    );
  }

  return (
    <>
      {trigger}
      <Drawer open={open} onOpenChange={setOpen} showSwipeHandle>
        <DrawerContent>
          <DrawerHeader className="relative pr-12 group-data-[swipe-axis=y]/drawer-popup:text-left">
            <PreviewBadge />
            <DrawerTitle className="text-xl font-bold">{TITLE}</DrawerTitle>
            <DrawerDescription>{DESCRIPTION}</DrawerDescription>
            <DrawerClose
              render={<Button variant="ghost" size="icon-sm" className="absolute top-3 right-3" />}
            >
              <XIcon aria-hidden />
              <span className="sr-only">Close</span>
            </DrawerClose>
          </DrawerHeader>
          {/* Focusable, so keyboards can scroll it: it holds no link (WCAG 2.1.1, #110). */}
          <div
            role="region"
            aria-label="How changing targets works"
            tabIndex={0}
            className="overflow-y-auto rounded-sm px-4 pt-4 pb-8 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
          >
            <Explainer preview={preview} />
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}

function PreviewBadge() {
  return (
    <Badge variant="outline" className="mb-1 w-fit">
      Preview · coming with F2b
    </Badge>
  );
}

const STEPS = [
  ['Pick again', 'Your answers and targets come prefilled, with fresh suggestions.'],
  ['See the preview', 'Per target: which gaps appear, stay or go, and which items change.'],
  [
    'Apply',
    'Removed targets are archived. Market, gaps and roadmap are recalculated. Approved evidence and done items are never lost.',
  ],
  ['Keep the history', 'Roadmap notes when targets changed, with the previous version read-only.'],
] as const;

const OUTCOME_LABEL: Readonly<Record<Exclude<ItemOutcome, 'kept'>, string>> = {
  dropped: 'Dropped',
  not_needed: 'Kept, not needed for current targets',
};

function Explainer({ preview }: { readonly preview: ChangePreview | null }) {
  const changed =
    preview?.items.flatMap((i) => (i.outcome === 'kept' ? [] : [{ ...i, outcome: i.outcome }])) ??
    [];
  const kept = (preview?.items.length ?? 0) - changed.length;

  return (
    <div className="flex flex-col gap-6">
      <section aria-labelledby="change-steps" className="flex flex-col gap-3">
        <h3 id="change-steps" className="text-xs font-semibold text-muted-foreground uppercase">
          How it will work
        </h3>
        <ol className="flex flex-col gap-3">
          {STEPS.map(([title, body], i) => (
            <li key={title} className="flex gap-3">
              <span
                aria-hidden
                className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted font-mono text-xs font-semibold"
              >
                {i + 1}
              </span>
              <div>
                <p className="text-sm font-medium">{title}</p>
                <p className="text-sm text-muted-foreground">{body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section
        aria-labelledby="change-sample"
        className="flex flex-col gap-3 rounded-lg border border-dashed p-4"
      >
        <h3 id="change-sample" className="text-xs font-semibold text-muted-foreground uppercase">
          Sample preview
        </h3>
        {preview ? (
          <>
            <p className="text-sm">
              If you dropped <strong>{preview.dropped.roleFamily.name}</strong>:
            </p>
            <div className="flex flex-col gap-1.5">
              <h4 className="text-xs text-muted-foreground">Gaps that go</h4>
              {preview.gapsGone.length > 0 ? (
                <ul role="list" className="flex flex-col gap-1">
                  {preview.gapsGone.map(({ gap, share }) => (
                    <li key={gap.id} className="flex items-baseline justify-between gap-3 text-sm">
                      <span>{gap.skill.name}</span>
                      <span className="font-mono text-xs tabular-nums text-muted-foreground">
                        in {Math.round(share * 100)}% of its postings
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">
                  None: every gap is shared with another target.
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                {preview.gapsKept} {preview.gapsKept === 1 ? 'gap stays' : 'gaps stay'}.
              </p>
            </div>
            <div className="flex flex-col gap-1.5">
              <h4 className="text-xs text-muted-foreground">Items that change</h4>
              {changed.length > 0 ? (
                <ul role="list" className="flex flex-col gap-2">
                  {changed.map(({ item, milestone, outcome }) => (
                    <li key={item.id} className="text-sm">
                      <p>{item.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {milestone} ·{' '}
                        <span className="font-medium text-foreground">
                          {OUTCOME_LABEL[outcome]}
                        </span>
                      </p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">None.</p>
              )}
              <p className="text-xs text-muted-foreground">
                {kept} {kept === 1 ? 'item stays' : 'items stay'}.
              </p>
            </div>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            With a single target there is nothing to drop; the preview will show what adding one
            changes.
          </p>
        )}
      </section>
    </div>
  );
}
