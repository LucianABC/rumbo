'use client';

import { createContext, type ReactNode, use, useCallback, useMemo, useState } from 'react';

import type { Decision } from '../lib/labels';

export interface Decisions {
  readonly decisions: Readonly<Record<string, Decision>>;
  /** Null takes the decision back. */
  readonly decide: (id: string, decision: Decision | null) => void;
}

/**
 * What the user decided on things waiting for approval: local state only until the feature behind
 * them lands (docs/product/views.md, #113, #114). It lives above the tabs so a decision survives
 * moving between them and a tab's badge drops as soon as it is made.
 */
export function createDecisions() {
  const Context = createContext<Decisions>({ decisions: {}, decide: () => undefined });

  function Provider({ children }: { readonly children: ReactNode }) {
    const [decisions, setDecisions] = useState<Decisions['decisions']>({});
    const decide = useCallback<Decisions['decide']>((id, decision) => {
      setDecisions(({ [id]: _previous, ...rest }) =>
        decision === null ? rest : { ...rest, [id]: decision },
      );
    }, []);
    const value = useMemo(() => ({ decisions, decide }), [decisions, decide]);
    return <Context value={value}>{children}</Context>;
  }

  return { Provider, useDecisions: () => use(Context) };
}
