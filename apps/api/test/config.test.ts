import { describe, expect, it } from 'vitest';

import { loadConfig } from '../src/config.js';

const DATABASE_URL = 'postgresql://rumbo:s3cret@db:5432/rumbo';

// Parsing rules (empty = unset, every error named, values never echoed) are tested in @rumbo/config.
describe('loadConfig', () => {
  it('applies defaults for the optional values', () => {
    expect(loadConfig({ DATABASE_URL })).toEqual({
      port: 3001,
      host: '127.0.0.1',
      databaseUrl: DATABASE_URL,
      version: 'dev',
      commit: 'unknown',
      logLevel: 'info',
      corsOrigins: [],
    });
  });

  it('reads every variable', () => {
    expect(
      loadConfig({
        DATABASE_URL,
        PORT: '8080',
        HOST: '0.0.0.0',
        APP_VERSION: '1.2.3',
        GIT_COMMIT: 'abc123',
        LOG_LEVEL: 'debug',
        CORS_ORIGINS: 'https://app.example, http://localhost:4000',
      }),
    ).toEqual({
      port: 8080,
      host: '0.0.0.0',
      databaseUrl: DATABASE_URL,
      version: '1.2.3',
      commit: 'abc123',
      logLevel: 'debug',
      corsOrigins: ['https://app.example', 'http://localhost:4000'],
    });
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

  it('normalizes CORS_ORIGINS to the form browsers send', () => {
    expect(
      loadConfig({ DATABASE_URL, CORS_ORIGINS: 'https://App.example:443/' }).corsOrigins,
    ).toEqual(['https://app.example']);
  });

  it.each(['https://app.example/path', 'ftp://app.example', 'app.example'])(
    'rejects CORS_ORIGINS=%s, which is not an http(s) origin',
    (value) => {
      expect(() => loadConfig({ DATABASE_URL, CORS_ORIGINS: value })).toThrow(/CORS_ORIGINS/);
    },
  );

  it('rejects an unknown LOG_LEVEL', () => {
    expect(() => loadConfig({ DATABASE_URL, LOG_LEVEL: 'verbose' })).toThrow(/LOG_LEVEL/);
  });
});
