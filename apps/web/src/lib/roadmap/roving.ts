/**
 * Where a key moves focus in a list with a roving tabindex (spec 01, M2, #110): ↑/← to the
 * previous item, ↓/→ to the next, Home/End to the ends. Stops at the ends instead of wrapping, so
 * the position is never ambiguous. Null for keys that do not move focus.
 */
export function rovingIndex(key: string, index: number, count: number): number | null {
  if (count === 0) return null;
  switch (key) {
    case 'ArrowUp':
    case 'ArrowLeft':
      return Math.max(index - 1, 0);
    case 'ArrowDown':
    case 'ArrowRight':
      return Math.min(index + 1, count - 1);
    case 'Home':
      return 0;
    case 'End':
      return count - 1;
    default:
      return null;
  }
}
