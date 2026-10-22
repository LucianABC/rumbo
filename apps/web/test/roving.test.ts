import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import RoadmapPage from '../src/app/(tabs)/roadmap/page';
import { rovingIndex } from '../src/lib/roadmap/roving';

vi.mock('next/server', () => ({ connection: () => Promise.resolve() }));

describe('rovingIndex (#110)', () => {
  it('moves to the previous and next item with the arrow keys', () => {
    expect(rovingIndex('ArrowDown', 1, 4)).toBe(2);
    expect(rovingIndex('ArrowRight', 1, 4)).toBe(2);
    expect(rovingIndex('ArrowUp', 1, 4)).toBe(0);
    expect(rovingIndex('ArrowLeft', 1, 4)).toBe(0);
  });

  it('stops at the ends instead of wrapping', () => {
    expect(rovingIndex('ArrowUp', 0, 4)).toBe(0);
    expect(rovingIndex('ArrowDown', 3, 4)).toBe(3);
  });

  it('jumps to the first and last item with Home and End', () => {
    expect(rovingIndex('Home', 2, 4)).toBe(0);
    expect(rovingIndex('End', 0, 4)).toBe(3);
  });

  it('ignores other keys and empty lists', () => {
    expect(rovingIndex('Enter', 1, 4)).toBeNull();
    expect(rovingIndex('a', 1, 4)).toBeNull();
    expect(rovingIndex('ArrowDown', 0, 0)).toBeNull();
  });
});

describe('station list tab stop', () => {
  it('makes the list one Tab stop, entered at "you are here", with instructions', async () => {
    const html = renderToStaticMarkup(await RoadmapPage());
    const buttons = [...html.matchAll(/<button[^>]*data-station-id[^>]*>/g)].map((m) => m[0]);
    const tabbable = buttons.filter((b) => b.includes('tabindex="0"'));

    expect(buttons.length).toBeGreaterThan(1);
    expect(tabbable).toHaveLength(1);
    expect(tabbable[0]).toMatch(/aria-label="[^"]*, you are here"/);
    expect(buttons.every((b) => /aria-describedby="[^"]+"/.test(b))).toBe(true);
    expect(html).toContain('Use the arrow keys to move between stations');
  });
});
