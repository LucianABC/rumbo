'use client';

import { cn } from 'cn';
import { Bell, Check, ChevronRight, CircleHelp, Copy, ExternalLink, Undo2, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { Button, buttonVariants } from '@/components/ui/button';

import { DRAFT_STATUS_LABEL, type DraftStatus } from '../../lib/labels';
import { LINE_BG } from '../../lib/line-colors';
import type { Suggestion } from '../../lib/profile/profile-view';
import { ResponsiveSheet } from '../responsive-sheet';
import { Unavailable } from '../skills/shared';
import { DraftStatusChip } from '../status-chip';
import { type DraftDecision, useDraftDecisions } from './draft-decisions';

/**
 * Suggested changes as notifications (docs/product/views.md, #113): a bell with what is left to
 * review, opening a panel of short rows. The data is provisional until the F4 spec (#44).
 */
export function SuggestedChanges({
  suggestions,
}: {
  /** Null when the changes could not be read. */
  readonly suggestions: readonly Suggestion[] | null;
}) {
  const [open, setOpen] = useState(false);
  const { decisions } = useDraftDecisions();
  const left = (suggestions ?? []).filter((s) => decisions[s.change.id] === undefined).length;

  return (
    <>
      <Button
        type="button"
        variant="outline"
        className={cn(left > 0 && 'border-attention/40 bg-attention/10')}
        onClick={() => {
          setOpen(true);
        }}
      >
        <Bell aria-hidden className={cn(left > 0 && 'text-attention')} />
        Suggested changes
        {left > 0 ? (
          <span className="ml-1 rounded-full bg-attention px-1.5 font-mono text-xs font-semibold text-background tabular-nums">
            {left}
            <span className="sr-only"> to review</span>
          </span>
        ) : null}
      </Button>
      <ResponsiveSheet
        open={open}
        onClose={() => {
          setOpen(false);
        }}
        title="Suggested changes"
        description="Sample drafts: real ones arrive with Drafting (F4). rumbo cannot edit LinkedIn, so you approve the text here and apply it there."
        regionLabel="Suggested changes"
      >
        {suggestions ? (
          <NotificationList suggestions={suggestions} />
        ) : (
          <Unavailable title="Suggested changes unavailable">
            They could not be read, or they no longer match your profile.
          </Unavailable>
        )}
      </ResponsiveSheet>
    </>
  );
}

/** One row per change; opening a row closes the last one, so the panel stays short. */
export function NotificationList({ suggestions }: { readonly suggestions: readonly Suggestion[] }) {
  const { decisions, decide } = useDraftDecisions();
  const left = suggestions.filter((s) => decisions[s.change.id] === undefined).length;

  if (suggestions.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Nothing to review. Suggestions appear when your targets change what your profile should say.
      </p>
    );
  }
  return (
    <div className="flex flex-col gap-3">
      <p role="status" className="text-xs text-muted-foreground">
        <span className="font-mono tabular-nums">{left}</span> left to review
      </p>
      <ul role="list" aria-label="Notifications" className="flex flex-col gap-2">
        {suggestions.map((suggestion) => (
          <Notification
            key={suggestion.change.id}
            suggestion={suggestion}
            decision={decisions[suggestion.change.id]}
            onDecide={(decision) => {
              decide(suggestion.change.id, decision);
            }}
          />
        ))}
      </ul>
    </div>
  );
}

function Notification({
  suggestion: { change, place, target, date, editUrl },
  decision,
  onDecide,
}: {
  readonly suggestion: Suggestion;
  readonly decision: DraftDecision | undefined;
  readonly onDecide: (decision: DraftDecision | null) => void;
}) {
  const status: DraftStatus = decision ?? 'awaiting';
  const actions = useRef<HTMLDivElement>(null);
  const shown = useRef(status);

  // Deciding removes the button that was just pressed: focus moves to the next action, so a
  // keyboard user does not fall back to the top of the panel.
  useEffect(() => {
    if (shown.current === status) return;
    shown.current = status;
    actions.current?.querySelector<HTMLElement>('button, a')?.focus();
  }, [status]);

  return (
    <li
      className={cn(
        'min-w-0 rounded-lg border',
        status === 'awaiting' && 'border-attention/30 bg-attention/5',
        status === 'approved' && 'border-success/30 bg-success/5',
      )}
    >
      <details name="suggested-changes" className="group">
        <summary className="flex cursor-pointer list-none items-start gap-2.5 rounded-lg p-3 outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset [&::-webkit-details-marker]:hidden">
          {/* The unread dot, with the status in words beside it for screen readers. */}
          <span
            aria-hidden
            className={cn(
              'mt-1.5 size-2 shrink-0 rounded-full',
              status === 'awaiting' ? 'bg-attention' : 'bg-transparent',
            )}
          />
          <span className="min-w-0 flex-1">
            <span
              className={cn(
                'block text-sm break-words',
                status === 'awaiting' ? 'font-semibold' : 'text-muted-foreground',
              )}
            >
              {place}
            </span>
            <span className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
              <span
                aria-hidden
                className={cn('h-1 w-4 shrink-0 rounded-full', LINE_BG[target.color])}
              />
              For {target.name} · {date}
            </span>
          </span>
          {status === 'awaiting' ? (
            <span className="sr-only">{DRAFT_STATUS_LABEL.awaiting}</span>
          ) : (
            <DraftStatusChip status={status} />
          )}
          <ChevronRight
            aria-hidden
            className="mt-0.5 size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-90"
          />
        </summary>
        <div className="flex flex-col gap-3 border-t p-3">
          {status === 'rejected' ? null : (
            <>
              <div className="flex flex-col gap-2 text-sm">
                {change.before === null ? null : <Removed text={change.before} />}
                <Added text={change.after} />
              </div>
              {change.question ? (
                <p className="flex gap-2 text-sm">
                  <CircleHelp aria-hidden className="mt-0.5 size-4 shrink-0 text-attention" />
                  <span>
                    <span className="font-medium">One fact would make this stronger: </span>
                    {change.question}
                  </span>
                </p>
              ) : null}
            </>
          )}
          <div ref={actions} className="flex flex-wrap items-center gap-2">
            {status === 'awaiting' ? (
              <>
                <Button
                  type="button"
                  size="sm"
                  aria-label={`Approve: ${place}`}
                  onClick={() => {
                    onDecide('approved');
                  }}
                >
                  <Check aria-hidden />
                  Approve
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  aria-label={`Reject: ${place}`}
                  onClick={() => {
                    onDecide('rejected');
                  }}
                >
                  <X aria-hidden />
                  Reject
                </Button>
              </>
            ) : null}
            {status === 'approved' ? (
              <>
                <CopyButton text={change.after} place={place} />
                <a
                  href={editUrl}
                  target="_blank"
                  rel="noreferrer"
                  className={buttonVariants({ size: 'sm', variant: 'outline' })}
                >
                  <ExternalLink aria-hidden />
                  Open on LinkedIn
                  <span className="sr-only"> (opens in a new tab)</span>
                </a>
              </>
            ) : null}
            {status === 'awaiting' ? null : (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                aria-label={`Undo: ${place}`}
                onClick={() => {
                  onDecide(null);
                }}
              >
                <Undo2 aria-hidden />
                Undo
              </Button>
            )}
          </div>
        </div>
      </details>
    </li>
  );
}

/** Both sides say what they are in words and with a sign, so the diff never rests on color. */
function Removed({ text }: { readonly text: string }) {
  return (
    <del className="block rounded-md border-l-2 border-destructive/60 bg-destructive/10 px-3 py-2 no-underline">
      <span className="block text-2xs font-medium text-muted-foreground">− Removed</span>
      {text}
    </del>
  );
}

function Added({ text }: { readonly text: string }) {
  return (
    <ins className="block rounded-md border-l-2 border-success bg-success/10 px-3 py-2 no-underline">
      <span className="block text-2xs font-medium text-muted-foreground">+ Added</span>
      {text}
    </ins>
  );
}

/**
 * The Clipboard API rejects without permission or focus, and is missing on plain http, where
 * reading it throws before there is a promise to reject (#113).
 */
async function copy(text: string): Promise<'copied' | 'failed'> {
  try {
    await navigator.clipboard.writeText(text);
    return 'copied';
  } catch {
    return 'failed';
  }
}

function CopyButton({ text, place }: { readonly text: string; readonly place: string }) {
  const [result, setResult] = useState<'copied' | 'failed' | null>(null);
  return (
    <>
      <Button
        type="button"
        size="sm"
        aria-label={`Copy: ${place}`}
        onClick={() => {
          void copy(text).then(setResult);
        }}
      >
        <Copy aria-hidden />
        Copy
      </Button>
      <span role="status" className="text-xs text-muted-foreground">
        {result === 'copied' ? 'Copied' : null}
        {result === 'failed' ? 'Could not copy: select the text above instead.' : null}
      </span>
    </>
  );
}
