import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { databaseUrl, httpUrl, parseEnv } from '../src/index.js';

const schema = z.object({
  DATABASE_URL: databaseUrl(),
  API_URL: httpUrl(),
  PORT: z.coerce.number().int().min(1).max(65_535).default(3001),
});

const valid = {
  DATABASE_URL: 'postgresql://rumbo:s3cret@db:5432/rumbo',
  API_URL: 'http://api:3001',
};

function errorMessage(fn: () => unknown): string {
  try {
    fn();
  } catch (error) {
    return (error as Error).message;
  }
  throw new Error('expected the call to throw');
}

describe('parseEnv', () => {
  it('returns the parsed values with defaults applied', () => {
    expect(parseEnv(schema, valid)).toEqual({ ...valid, PORT: 3001 });
  });

  it('ignores variables the schema does not declare', () => {
    expect(parseEnv(schema, { ...valid, PATH: '/usr/bin' })).not.toHaveProperty('PATH');
  });

  it('treats an empty value as unset', () => {
    expect(parseEnv(schema, { ...valid, PORT: '' }).PORT).toBe(3001);
    expect(() => parseEnv(schema, { ...valid, API_URL: '' })).toThrow(/API_URL/);
  });

  it('names every invalid variable at once', () => {
    const message = errorMessage(() => parseEnv(schema, { PORT: 'abc' }));

    expect(message).toMatch(/^Invalid environment configuration:/);
    for (const name of ['DATABASE_URL', 'API_URL', 'PORT']) {
      expect(message).toContain(name);
    }
  });

  it('never echoes values, since some carry secrets', () => {
    const message = errorMessage(() =>
      parseEnv(schema, {
        DATABASE_URL: 'mysql://rumbo:s3cret@db/rumbo',
        API_URL: 'ftp://s3cret',
        PORT: 's3cret',
      }),
    );

    expect(message).toContain('DATABASE_URL');
    expect(message).not.toContain('s3cret');
  });

  it('never echoes values even when a schema message interpolates the input', () => {
    const custom = z.object({
      API_KEY: z.string().refine((v) => v.startsWith('sk-'), {
        error: (issue) => `bad key ${String(issue.input)}`,
      }),
    });

    const message = errorMessage(() => parseEnv(custom, { API_KEY: 's3cret' }));

    expect(message).toContain('API_KEY');
    expect(message).not.toContain('s3cret');
  });

  it('says whether a variable is missing or invalid', () => {
    const message = errorMessage(() =>
      parseEnv(schema, { DATABASE_URL: 'mysql://db/rumbo', PORT: 'abc' }),
    );

    expect(message).toContain('- API_URL: missing');
    expect(message).toContain('- DATABASE_URL: invalid url');
    expect(message).toContain('- PORT: expected number');
  });
});

describe('databaseUrl', () => {
  it.each(['postgresql://db/rumbo', 'postgres://u:p@db:5432/rumbo'])('accepts %s', (value) => {
    expect(databaseUrl().safeParse(value).success).toBe(true);
  });

  it.each(['mysql://db/rumbo', 'not a url'])('rejects %s', (value) => {
    expect(databaseUrl().safeParse(value).success).toBe(false);
  });
});

describe('httpUrl', () => {
  it.each(['http://api:3001', 'https://api.example.com'])('accepts %s', (value) => {
    expect(httpUrl().safeParse(value).success).toBe(true);
  });

  it.each(['ftp://api:3001', 'not a url'])('rejects %s', (value) => {
    expect(httpUrl().safeParse(value).success).toBe(false);
  });
});
