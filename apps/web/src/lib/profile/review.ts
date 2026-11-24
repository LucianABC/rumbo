'use client';

import type { DraftChange } from '@rumbo/contracts/provisional';
import { useMemo } from 'react';

import { usePlan, useProfile } from '../store';
import { profileCompleteness, type ProfileReview, suggestions } from './profile-view';

/**
 * What the header's notifications and Profile's badge need, from the profile the store holds: an
 * edit moves the bell's completeness the same as Profile's bar (#168). Each part is null when its
 * data cannot be read (#113).
 */
export function useProfileReview(changes: readonly DraftChange[] | null): ProfileReview {
  const profile = useProfile();
  const { lanes } = usePlan();
  return useMemo(
    () => ({
      suggestions: profile && changes ? suggestions(changes, profile, lanes) : null,
      completeness: profile ? profileCompleteness(profile) : null,
    }),
    [profile, changes, lanes],
  );
}
