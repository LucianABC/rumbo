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

/** A stretch still ahead of the user: the same line, faded (#108). */
export const LINE_BG_AHEAD: Readonly<Record<LineColorToken, string>> = {
  'line-1': 'bg-line-1/35',
  'line-2': 'bg-line-2/35',
  'line-3': 'bg-line-3/35',
};

export const LINE_BORDER: Readonly<Record<LineColorToken, string>> = {
  'line-1': 'border-line-1',
  'line-2': 'border-line-2',
  'line-3': 'border-line-3',
};

/** SVG strokes and fills for the subway map (#117). */
export const LINE_STROKE: Readonly<Record<LineColorToken, string>> = {
  'line-1': 'stroke-line-1',
  'line-2': 'stroke-line-2',
  'line-3': 'stroke-line-3',
};

export const LINE_FILL: Readonly<Record<LineColorToken, string>> = {
  'line-1': 'fill-line-1',
  'line-2': 'fill-line-2',
  'line-3': 'fill-line-3',
};
