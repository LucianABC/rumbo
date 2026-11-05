'use client';

import type { Decision } from '../../lib/labels';
import { createDecisions } from '../decisions';

export type DraftDecision = Decision;

/** What the user decided on each suggested change (#113). */
const drafts = createDecisions();

export const DraftDecisionsProvider = drafts.Provider;
export const useDraftDecisions = drafts.useDecisions;
