/**
 * WCAG 2.x contrast, so tests can hold the design tokens in globals.css to the minimums of spec 01
 * (#105, #106).
 */

const HEX = /^#([0-9a-f]{6})$/i;

/** Relative luminance of an sRGB `#rrggbb` color (WCAG 2.x definition). */
export function luminance(hex: string): number {
  const match = HEX.exec(hex);
  if (!match?.[1]) throw new Error(`Expected a #rrggbb color, got "${hex}"`);
  const value = Number.parseInt(match[1], 16);
  const [r, g, b] = [(value >> 16) & 0xff, (value >> 8) & 0xff, value & 0xff].map((channel) => {
    const c = channel / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Contrast ratio between two colors, from 1 to 21, order independent. */
export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

/** WCAG minimums: 4.5:1 for body text, 3:1 for graphics such as map lines (1.4.3, 1.4.11). */
export const MIN_TEXT = 4.5;
export const MIN_GRAPHIC = 3;
