import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { DIRECTIONS } from '../src/app/tokens/directions';
import TokensPage, { metadata } from '../src/app/tokens/page';
import { contrastRatio, formatRatio } from '../src/lib/contrast';

// next/font only works inside Next's compiler; outside it a font is just a variable class name.
vi.mock('next/font/google', () => {
  const font = (options: { variable: string }) => ({ variable: options.variable.slice(2) });
  return {
    Archivo: font,
    Bricolage_Grotesque: font,
    Figtree: font,
    IBM_Plex_Mono: font,
    Inter: font,
    JetBrains_Mono: font,
  };
});

const html = renderToStaticMarkup(TokensPage());

describe('/tokens', () => {
  it('shows both directions, each in light and dark', () => {
    expect(metadata.title).toBe('Tokens · rumbo');
    for (const d of DIRECTIONS) {
      expect(html).toContain(`aria-label="${d.name}, light"`);
      expect(html).toContain(`aria-label="${d.name}, dark"`);
    }
  });

  it('renders dark panels under the dark variant so shadcn dark: styles apply', () => {
    expect(html.match(/<section[^>]*class="[^"]*\bdark\b/g)).toHaveLength(2);
  });

  it('shows the measured ratio for every line color', () => {
    for (const d of DIRECTIONS) {
      for (const theme of ['light', 'dark'] as const) {
        const p = d.palettes[theme];
        for (const line of p.lines) {
          expect(html).toContain(formatRatio(contrastRatio(line, p.background)));
        }
      }
    }
  });

  it('applies each direction’s fonts and radius as panel variables', () => {
    expect(html).toContain('--font-heading:var(--font-a-heading)');
    expect(html).toContain('--font-heading:var(--font-b-heading)');
    expect(html).toContain('--radius:0.25rem');
    expect(html).toContain('--radius:0.75rem');
  });

  it('marks the current tab and names badges for screen readers', () => {
    expect(html.match(/aria-current="page"/g)).toHaveLength(4);
    expect(html).toContain('needs your review');
    expect(html).toContain('open tasks');
  });

  it('names each direction’s typefaces, B with the owner’s pick (#105)', () => {
    expect(html).toContain('Type: Archivo / Inter / JetBrains Mono');
    expect(html).toContain('Type: Bricolage Grotesque / Figtree / IBM Plex Mono');
  });

  it('describes the map sample as an image', () => {
    expect(html).toMatch(/<svg[^>]*role="img"[^>]*aria-label="Sample map/);
  });
});
