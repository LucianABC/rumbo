'use client';

import { useCallback } from 'react';
import { create } from 'zustand';

import type { Decision } from './labels';

/**
 * The one store for UI state more than one tab reads (owner, #114; views.md). State a single
 * component uses stays in that component, what a URL can hold stays in the URL, and data stays in
 * lib/data, read on the server.
 *
 * It starts empty and only changes from the user's clicks, so the module-level store never holds
 * anything on the server, where it would be shared between requests. Decisions are local state
 * until the features behind them land, so a reload clears them.
 */

type Decisions = Readonly<Record<string, Decision>>;

/** What waits for the user's approval: suggested profile changes and project evidence. */
type DecisionKind = 'drafts' | 'evidence';

interface AppState {
  readonly decisions: Readonly<Record<DecisionKind, Decisions>>;
  /** Null takes the decision back. */
  readonly decide: (kind: DecisionKind, id: string, decision: Decision | null) => void;
}

export const useAppStore = create<AppState>()((set) => ({
  decisions: { drafts: {}, evidence: {} },
  decide: (kind, id, decision) => {
    set(({ decisions }) => {
      const { [id]: _previous, ...rest } = decisions[kind];
      return {
        decisions: {
          ...decisions,
          [kind]: decision === null ? rest : { ...rest, [id]: decision },
        },
      };
    });
  },
}));

function useDecisions(kind: DecisionKind) {
  const decisions = useAppStore((state) => state.decisions[kind]);
  const decideKind = useAppStore((state) => state.decide);
  const decide = useCallback(
    (id: string, decision: Decision | null) => {
      decideKind(kind, id, decision);
    },
    [decideKind, kind],
  );
  return { decisions, decide };
}

/** Suggested changes: Profile, the header's bell and the tab's badge (#113). */
export function useDraftDecisions() {
  return useDecisions('drafts');
}

/** Project evidence: Projects, the stations on Roadmap and the tab's badge (#114). */
export function useEvidenceDecisions() {
  return useDecisions('evidence');
}
