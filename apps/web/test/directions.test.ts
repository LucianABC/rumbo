import { describe, expect, it } from 'vitest';

import { DIRECTIONS, type ThemeName } from '../src/app/tokens/directions';
import { contrastRatio, MIN_GRAPHIC, MIN_TEXT } from '../src/lib/contrast';

const THEMES: readonly ThemeName[] = ['light', 'dark'];

// Spec 01, M1: line colors ≥ 3:1 against the map background in both themes, text ≥ 4.5:1 (#105).
describe.each(DIRECTIONS.map((d) => [d.name, d] as const))('%s', (_, direction) => {
  describe.each(THEMES)('%s', (theme) => {
    const p = direction.palettes[theme];

    it.each(p.lines.map((line, i) => [`line-${String(i + 1)}`, line] as const))(
      '%s keeps 3:1 against the map background',
      (_name, line) => {
        expect(contrastRatio(line, p.background)).toBeGreaterThanOrEqual(MIN_GRAPHIC);
      },
    );

    it('pending stations keep 3:1 against the map background', () => {
      expect(contrastRatio(p.pending, p.background)).toBeGreaterThanOrEqual(MIN_GRAPHIC);
    });

    it.each(['foreground', 'muted', 'success', 'attention'] as const)(
      '%s text keeps 4.5:1 on background and surface',
      (role) => {
        expect(contrastRatio(p[role], p.background)).toBeGreaterThanOrEqual(MIN_TEXT);
        expect(contrastRatio(p[role], p.surface)).toBeGreaterThanOrEqual(MIN_TEXT);
      },
    );

    it('text on the primary fill keeps 4.5:1', () => {
      expect(contrastRatio(p.onPrimary, p.primary)).toBeGreaterThanOrEqual(MIN_TEXT);
    });
  });
});
