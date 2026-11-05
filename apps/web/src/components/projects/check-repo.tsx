'use client';

import { RefreshCw } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { repoCheckResult } from '../../lib/projects/projects-view';
import { Button } from '../ui/button';

/** Long enough to read as work being done. */
const SAMPLE_CHECK_MS = 1200;

/**
 * Check repo now, as a sample until F5 (#45): it runs nothing and says so. The real one runs
 * `push.analyze` over the commits not analyzed yet (agents.md). Only this button reads the result,
 * so it stays here and not in the store.
 */
export function CheckRepo({
  project,
  commitCount,
}: {
  readonly project: string;
  readonly commitCount: number;
}) {
  const [status, setStatus] = useState<'idle' | 'checking' | 'checked'>('idle');
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(
    () => () => {
      clearTimeout(timer.current);
    },
    [],
  );

  const check = () => {
    if (status === 'checking') return;
    setStatus('checking');
    timer.current = setTimeout(() => {
      setStatus('checked');
    }, SAMPLE_CHECK_MS);
  };

  // The name starts with the visible text, whichever it is (WCAG 2.5.3, as on ProjectLink).
  const label = status === 'checking' ? 'Checking…' : 'Check repo now';

  return (
    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
      {/* aria-disabled, not disabled: disabling the button would drop keyboard focus mid-check. */}
      <Button
        type="button"
        size="sm"
        variant="outline"
        aria-disabled={status === 'checking'}
        aria-label={`${label}: ${project}`}
        onClick={check}
      >
        <RefreshCw
          aria-hidden
          className={status === 'checking' ? 'motion-safe:animate-spin' : undefined}
        />
        {label}
      </Button>
      <p role="status" className="text-xs text-muted-foreground">
        {status === 'checked' ? repoCheckResult(commitCount) : null}
      </p>
    </div>
  );
}
