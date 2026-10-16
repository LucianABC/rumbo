import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { contrastRatio, MIN_GRAPHIC, MIN_TEXT } from './support/contrast';

// The design tokens are measured straight from globals.css, so a color edit that breaks
// contrast fails here (spec 01, M1; #106).
const css = readFileSync(fileURLToPath(new URL('../src/app/globals.css', import.meta.url)), 'utf8');

function variables(block: string | undefined): Map<string, string> {
  if (block === undefined) throw new Error('Theme block not found in globals.css');
  return new Map(
    [...block.matchAll(/--([\w-]+):\s*([^;]+);/g)].map((m) => [m[1] ?? '', (m[2] ?? '').trim()]),
  );
}

const light = variables(/^:root \{([^}]*)\}/m.exec(css)?.[1]);
const dark = variables(
  /@media \(prefers-color-scheme: dark\) \{\s*:root \{([^}]*)\}/.exec(css)?.[1],
);

const COLORS = [...dark.keys()];

describe('theme tokens', () => {
  it('dark mode follows the system preference', () => {
    expect(css).toContain('@custom-variant dark (@media (prefers-color-scheme: dark));');
  });

  it('dark overrides exactly the light colors, and every color is hex', () => {
    expect(COLORS.length).toBeGreaterThan(30);
    for (const name of COLORS) {
      expect(light.get(name), name).toMatch(/^#[0-9a-f]{6}$/);
      expect(dark.get(name), name).toMatch(/^#[0-9a-f]{6}$/);
    }
    const lightColors = [...light].filter(([, value]) => value.startsWith('#')).map(([n]) => n);
    expect(lightColors.sort()).toEqual([...COLORS].sort());
  });

  it('exposes the line colors under the LineColorToken names', () => {
    for (const token of ['line-1', 'line-2', 'line-3']) {
      expect(css).toContain(`--color-${token}: var(--${token});`);
    }
  });

  describe.each([
    ['light', light],
    ['dark', dark],
  ] as const)('%s', (_, theme) => {
    const get = (name: string): string => {
      const value = theme.get(name) ?? light.get(name);
      if (value === undefined) throw new Error(`No --${name} in globals.css`);
      return value;
    };

    it.each(['line-1', 'line-2', 'line-3', 'pending', 'ring'])(
      '%s keeps 3:1 against the background',
      (name) => {
        expect(contrastRatio(get(name), get('background'))).toBeGreaterThanOrEqual(MIN_GRAPHIC);
      },
    );

    it.each(['foreground', 'muted-foreground', 'success', 'attention', 'destructive'])(
      '%s text keeps 4.5:1 on background and card',
      (name) => {
        expect(contrastRatio(get(name), get('background'))).toBeGreaterThanOrEqual(MIN_TEXT);
        expect(contrastRatio(get(name), get('card'))).toBeGreaterThanOrEqual(MIN_TEXT);
      },
    );

    it('text on the primary fill keeps 4.5:1', () => {
      expect(contrastRatio(get('primary-foreground'), get('primary'))).toBeGreaterThanOrEqual(
        MIN_TEXT,
      );
    });

    // Hover states, skeletons and secondary buttons sit on the page background; a fill equal to
    // it makes them invisible (review of #132).
    it.each(['muted', 'accent', 'secondary'])('%s fill differs from the background', (name) => {
      expect(get(name)).not.toBe(get('background'));
      expect(contrastRatio(get('muted-foreground'), get(name))).toBeGreaterThanOrEqual(MIN_TEXT);
    });

    // Line colors identify targets (docs/product/views.md); errors and focus must not look like one.
    it.each(['destructive', 'ring'])('%s is not a target line color', (name) => {
      for (const line of ['line-1', 'line-2', 'line-3']) {
        expect(get(name)).not.toBe(get(line));
      }
    });
  });
});
