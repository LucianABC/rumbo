import { describe, expect, it } from 'vitest';

import { loadConfig } from '../src/config.js';

const DATABASE_URL = 'postgresql://rumbo:s3cret@db:5432/rumbo';

// Parsing rules (empty = unset, every error named, values never echoed) are tested in @rumbo/config.
describe('loadConfig', () => {
  it('applies defaults for the optional values', () => {
    expect(loadConfig({ DATABASE_URL })).toEqual({
      port: 3001,
      databaseUrl: DATABASE_URL,
      version: 'dev',
      commit: 'unknown',
    });
  });

  it('reads every variable', () => {
    expect(
      loadConfig({ DATABASE_URL, PORT: '8080', APP_VERSION: '1.2.3', GIT_COMMIT: 'abc123' }),
    ).toEqual({ port: 8080, databaseUrl: DATABASE_URL, version: '1.2.3', commit: 'abc123' });
  });

  it('fails fast and names DATABASE_URL when it is missing', () => {
    expect(() => loadConfig({})).toThrow(/DATABASE_URL/);
  });

  it('rejects a non-Postgres DATABASE_URL', () => {
    expect(() => loadConfig({ DATABASE_URL: 'mysql://db/rumbo' })).toThrow(/DATABASE_URL/);
  });

  it.each(['0', '70000', 'abc', '30.5'])('rejects PORT=%s', (port) => {
    expect(() => loadConfig({ DATABASE_URL, PORT: port })).toThrow(/PORT/);
  });
});
