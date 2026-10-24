'use client';

import { RefreshCw } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';

/**
 * Checks the market again on demand (owner, #111). The demo has no market search behind it, so a
 * click says when it arrives instead of pretending the data got fresher.
 */
export function MarketRefresh() {
  const [asked, setAsked] = useState(false);
  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="xs"
        className="align-middle"
        onClick={() => {
          setAsked(true);
        }}
      >
        <RefreshCw aria-hidden />
        Check market again
      </Button>
      <span role="status" className="ml-2 text-xs">
        {asked
          ? 'Not available yet: on-demand checks arrive with live market data, alongside a scheduled check you set in Settings.'
          : null}
      </span>
    </>
  );
}
