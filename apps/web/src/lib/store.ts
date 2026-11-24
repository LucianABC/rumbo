'use client';

import {
  deriveRoadmapView,
  type Profile,
  type Roadmap,
  type RoadmapLayout,
  targetColors,
} from '@rumbo/contracts';
import {
  createContext,
  createElement,
  type ReactNode,
  useCallback,
  useContext,
  useState,
} from 'react';
import { useStore } from 'zustand';
import { createStore } from 'zustand/vanilla';

import type { Decision } from './labels';
import { decidePlan } from './progress';
import { lanesOf } from './roadmap/single-line';
import type {
  AppState,
  AppStore,
  DecisionKind,
  Decisions,
  InitialState,
  Plan,
  PlanData,
} from './store.types';

/**
 * The one store for state more than one tab reads (owner, #114, #168; views.md): the plan's
 * progress, the profile the user edits and their decisions. Data still comes only from lib/data:
 * the tabs layout reads it on the server and hydrates the store with it, so real data changes that
 * one layer. State a single component uses stays in that component, and what a URL can hold stays
 * in the URL.
 *
 * One store per request, through StoreProvider: a module-level store would be shared between
 * requests on the server, and with real data one user could see another's. Decisions are local
 * state until the features behind them land, so a reload clears them.
 */

export function createAppStore(source: PlanData, initial: InitialState = {}): AppStore {
  const decisions = initial.decisions ?? { drafts: {}, evidence: {} };
  return createStore<AppState>()((set) => ({
    source,
    plan: planOf(source, decisions.evidence),
    editedProfile: initial.editedProfile ?? null,
    saveProfile: (profile) => {
      set({ editedProfile: profile });
    },
    reviews: initial.reviews ?? [],
    recordReview: (at) => {
      set(({ reviews }) => ({ reviews: [...reviews, at] }));
    },
    decisions,
    decide: (kind, id, decision) => {
      set((state) => {
        const { [id]: _previous, ...rest } = state.decisions[kind];
        const next = {
          ...state.decisions,
          [kind]: decision === null ? rest : { ...rest, [id]: decision },
        };
        // Only evidence moves the plan; recomputing here keeps one derived plan per decision.
        return kind === 'evidence'
          ? { decisions: next, plan: planOf(state.source, next.evidence) }
          : { decisions: next };
      });
    },
  }));
}

function planOf(source: PlanData, decisions: Decisions): Plan {
  const roadmap = decidePlan(source.roadmap, decisions, new Date().toISOString());
  const colors = targetColors(source.roadmap, source.layout ?? undefined);
  return { roadmap, view: deriveRoadmapView(roadmap), colors, lanes: lanesOf(roadmap, colors) };
}

const StoreContext = createContext<AppStore | null>(null);

/** Gives every tab the same store for this request; `store` lets tests start from any state. */
export function StoreProvider(
  props: { readonly children: ReactNode } & (
    | { readonly data: PlanData; readonly store?: never }
    | { readonly store: AppStore; readonly data?: never }
  ),
) {
  const [store] = useState(() => props.store ?? createAppStore(props.data));
  return createElement(StoreContext.Provider, { value: store }, props.children);
}

export function useAppStore<T>(selector: (state: AppState) => T): T {
  const store = useContext(StoreContext);
  if (!store) throw new Error('useAppStore needs a StoreProvider: see app/(tabs)/layout.tsx');
  return useStore(store, selector);
}

/** The plan after this visit's decisions: Roadmap, Projects, Skills & gaps and the badges (#168). */
export function usePlan(): Plan {
  return useAppStore((state) => state.plan);
}

/** The roadmap as stored, before decisions: what a decision can still be taken back on. */
export function useSourceRoadmap(): Roadmap {
  return useAppStore((state) => state.source.roadmap);
}

/** The map's layout, or null when it does not fit: Roadmap then shows the list alone (#103). */
export function useRoadmapLayout(): RoadmapLayout | null {
  return useAppStore((state) => state.source.layout);
}

/** The profile every tab shows: what the user saved, else the imported one; null if unreadable. */
export function useProfile(): Profile | null {
  return useAppStore((state) => state.editedProfile ?? state.source.profile);
}

/** The saved edits, in memory only: a reload drops them until the API exists (#170). */
export function useEditedProfile() {
  const edited = useAppStore((state) => state.editedProfile);
  const save = useAppStore((state) => state.saveProfile);
  return { edited, save };
}

/** Profile reviews: their dates and how many are left (#170). */
export function useProfileReviews() {
  const reviews = useAppStore((state) => state.reviews);
  const record = useAppStore((state) => state.recordReview);
  return { reviews, record };
}

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
