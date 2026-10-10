import { describe, expect, it } from 'vitest';

import { loadConfig } from '../src/config.js';

describe('loadConfig', () => {
  it('fails fast and names DATABASE_URL when it is missing', () => {
    expect(() => loadConfig({})).toThrow('DATABASE_URL');
  });

  it('reads DATABASE_URL', () => {
    expect(loadConfig({ DATABASE_URL: 'postgresql://db' })).toEqual({
      databaseUrl: 'postgresql://db',
    });
  });
});
