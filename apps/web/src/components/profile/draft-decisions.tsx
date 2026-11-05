'use client';

import { createContext, type ReactNode, use, useCallback, useMemo, useState } from 'react';

export type DraftDecision = 'approved' | 'rejected';

interface DraftDecisions {
  readonly decisions: Readonly<Record<string, DraftDecision>>;
  /** Null takes the decision back. */
  readonly decide: (id: string, decision: DraftDecision | null) => void;
}

const Context = createContext<DraftDecisions>({ decisions: {}, decide: () => undefined });

/**
 * What the user decided on each suggested change: local state only (docs/product/views.md, #113).
 * It lives above the tabs so a decision survives moving between them and the Profile badge drops
 * as soon as it is made.
 */
export function DraftDecisionsProvider({ children }: { readonly children: ReactNode }) {
  const [decisions, setDecisions] = useState<DraftDecisions['decisions']>({});
  const decide = useCallback<DraftDecisions['decide']>((id, decision) => {
    setDecisions(({ [id]: _previous, ...rest }) =>
      decision === null ? rest : { ...rest, [id]: decision },
    );
  }, []);
  const value = useMemo(() => ({ decisions, decide }), [decisions, decide]);
  return <Context value={value}>{children}</Context>;
}

export function useDraftDecisions(): DraftDecisions {
  return use(Context);
}
