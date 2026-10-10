import { describe, expect, it } from 'vitest';

import { loadConfig } from '../src/config.js';

describe('loadConfig', () => {
  it('fails fast and names DATABASE_URL when it is missing', () => {
    expect(() => loadConfig({})).toThrow('DATABASE_URL');
  });

  it('applies defaults for the optional values', () => {
    expect(loadConfig({ DATABASE_URL: 'postgresql://db' })).toEqual({
      port: 3001,
      databaseUrl: 'postgresql://db',
      version: 'dev',
      commit: 'unknown',
    });
  });

  it.each(['0', '70000', 'abc', '30.5'])('rejects PORT=%s', (port) => {
    expect(() => loadConfig({ DATABASE_URL: 'postgresql://db', PORT: port })).toThrow(
      `Invalid PORT: ${port}`,
    );
  });
});
