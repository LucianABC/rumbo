import { describe, expect, it } from 'vitest';

import { coverage, LINE_THRESHOLDS } from '../src/index.js';

describe('coverage', () => {
  it('measures src with the threshold for the kind of package', () => {
    expect(coverage('package')).toMatchObject({
      provider: 'v8',
      include: ['src/**'],
      exclude: [],
      thresholds: { lines: LINE_THRESHOLDS.package },
    });
    expect(coverage('app').thresholds).toEqual({ lines: LINE_THRESHOLDS.app });
  });

  it('excludes only the listed globs', () => {
    const result = coverage('app', [{ glob: 'src/main.ts', reason: 'entrypoint' }]);

    expect(result.exclude).toEqual(['src/main.ts']);
  });
});
