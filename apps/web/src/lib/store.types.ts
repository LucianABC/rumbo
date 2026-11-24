import type {
  LineColorToken,
  Profile,
  Roadmap,
  RoadmapLayout,
  RoadmapView,
} from '@rumbo/contracts';
import type { StoreApi } from 'zustand/vanilla';

import type { Decision } from './labels';
import type { Lane } from './roadmap/single-line';

/** What the tabs layout reads from lib/data. A profile that cannot be read is null (#112). */
export interface PlanData {
  readonly roadmap: Roadmap;
  readonly layout: RoadmapLayout | null;
  readonly profile: Profile | null;
}

/** The plan after the user's decisions, with what every view derives from it, computed once. */
export interface Plan {
  readonly roadmap: Roadmap;
  readonly view: RoadmapView;
  /** Each target's color slot: one source, so a target looks the same on every tab (#102). */
  readonly colors: ReadonlyMap<string, LineColorToken>;
  /** Every target with its color, primary first. */
  readonly lanes: readonly Lane[];
}

export type Decisions = Readonly<Record<string, Decision>>;

/** What waits for the user's approval: suggested profile changes and project evidence. */
export type DecisionKind = 'drafts' | 'evidence';

export interface AppState {
  /** The data as lib/data returned it, before any decision. */
  readonly source: PlanData;
  readonly plan: Plan;
  /** What the user saved on Profile, replacing the imported profile (#170); null until then. */
  readonly editedProfile: Profile | null;
  readonly saveProfile: (profile: Profile) => void;
  /** When each profile review ran on this visit, oldest first (#170). */
  readonly reviews: readonly string[];
  readonly recordReview: (at: string) => void;
  readonly decisions: Readonly<Record<DecisionKind, Decisions>>;
  /** Null takes the decision back. */
  readonly decide: (kind: DecisionKind, id: string, decision: Decision | null) => void;
}

export type AppStore = StoreApi<AppState>;

/** State a store can start from instead of empty: tests use it, and so will stored decisions. */
export type InitialState = Partial<Pick<AppState, 'editedProfile' | 'reviews' | 'decisions'>>;
