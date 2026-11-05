'use client';

import { createDecisions } from '../decisions';

/** What the user decided on each piece of project evidence (#114). */
const evidence = createDecisions();

export const EvidenceDecisionsProvider = evidence.Provider;
export const useEvidenceDecisions = evidence.useDecisions;
