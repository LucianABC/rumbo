'use client';

import { useSyncExternalStore } from 'react';

/**
 * Whether a media query matches, kept in sync with the window. On the server, and on the first
 * client render, it reports `fallback`, so hydration never mismatches (#109).
 */
export function useMediaQuery(query: string, fallback = false): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const list = window.matchMedia(query);
      list.addEventListener('change', onChange);
      return () => {
        list.removeEventListener('change', onChange);
      };
    },
    () => window.matchMedia(query).matches,
    () => fallback,
  );
}
