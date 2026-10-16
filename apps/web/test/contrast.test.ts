import { describe, expect, it } from 'vitest';

import { contrastRatio, luminance } from './support/contrast';

describe('contrast', () => {
  it('matches the WCAG reference values', () => {
    expect(luminance('#000000')).toBe(0);
    expect(luminance('#ffffff')).toBe(1);
    expect(contrastRatio('#000000', '#ffffff')).toBe(21);
    // WebAIM's checker gives 4.54:1 for #767676 on white, the usual AA borderline gray.
    expect(contrastRatio('#767676', '#ffffff')).toBeCloseTo(4.54, 2);
  });

  it('is order independent', () => {
    expect(contrastRatio('#1d5bbf', '#f6f5f1')).toBe(contrastRatio('#f6f5f1', '#1d5bbf'));
  });

  it('rejects anything but #rrggbb', () => {
    expect(() => luminance('#fff')).toThrow('#rrggbb');
    expect(() => luminance('oklch(0.5 0 0)')).toThrow('#rrggbb');
  });
});
