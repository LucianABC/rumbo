'use client';

import { useState } from 'react';

import { LINK } from '../skills/shared';

/**
 * Updates a profile source. The demo processes no files (docs/product/views.md, #113), so a click
 * says when it arrives instead of pretending anything was imported.
 */
export function SourceAction({ label }: { readonly label: string }) {
  const [asked, setAsked] = useState(false);
  return (
    <>
      <button
        type="button"
        className={`${LINK} text-sm`}
        onClick={() => {
          setAsked(true);
        }}
      >
        {label}
      </button>
      <span role="status" className="w-full text-xs text-muted-foreground not-empty:mt-1">
        {asked ? 'Not available yet: importing arrives with Profile (F1).' : null}
      </span>
    </>
  );
}
