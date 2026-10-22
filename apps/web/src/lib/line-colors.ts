import type { LineColorToken } from '@rumbo/contracts';

/**
 * Tailwind utilities per target color slot. Spelled out in full because Tailwind only generates
 * classes it finds literally in the source (#106).
 */
export const LINE_BG: Readonly<Record<LineColorToken, string>> = {
  'line-1': 'bg-line-1',
  'line-2': 'bg-line-2',
  'line-3': 'bg-line-3',
};
