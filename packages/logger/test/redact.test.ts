import { describe, expect, it } from 'vitest';

import { isSensitiveKey, redact, REDACTED, redactString } from '../src/redact.js';

describe('redactString', () => {
  it.each([
    ['contact ana.perez+jobs@example.com now', 'contact [EMAIL] now'],
    ['Authorization: Bearer abc.def-123_xyz', `Authorization: Bearer ${REDACTED}`],
    ['token eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjMifQ.c2lnbmF0dXJl here', `token ${REDACTED} here`],
    ['key sk-ant-api03-AbCdEfGhIjKlMnOpQrSt', `key ${REDACTED}`],
    ['gh ghp_0123456789abcdefghijABCDEFGHIJ', `gh ${REDACTED}`],
    ['aws AKIAIOSFODNN7EXAMPLE', `aws ${REDACTED}`],
    [
      'connect postgresql://rumbo:s3cret@db:5432/rumbo failed',
      `connect postgresql://${REDACTED}@db:5432/rumbo failed`,
    ],
  ])('masks %s', (input, expected) => {
    expect(redactString(input)).toBe(expected);
  });

  it('leaves ordinary text alone', () => {
    const text = 'GET /api/v1/healthz 200 in 12ms (queue system.heartbeat)';
    expect(redactString(text)).toBe(text);
  });
});

describe('isSensitiveKey', () => {
  it.each([
    'email',
    'userEmail',
    'first_name',
    'fullName',
    'name',
    'accessToken',
    'API_KEY',
    'set-cookie',
    'dbPassword',
  ])('flags %s', (key) => {
    expect(isSensitiveKey(key)).toBe(true);
  });

  it.each(['userId', 'queue', 'status', 'durationMs', 'reqId', 'service', 'tokens'])(
    'keeps %s',
    (key) => {
      expect(isSensitiveKey(key)).toBe(false);
    },
  );
});

describe('redact', () => {
  it('replaces values under personal and secret keys, at any depth', () => {
    const input = {
      userId: 'u_1',
      profile: { fullName: 'Ana Pérez', email: 'ana@example.com', skills: ['TypeScript'] },
      headers: { authorization: 'Bearer x', cookie: 'sid=1', accept: 'application/json' },
      items: [{ name: 'Ana' }, { title: 'Senior Engineer' }],
    };

    expect(redact(input)).toEqual({
      userId: 'u_1',
      profile: { fullName: REDACTED, email: REDACTED, skills: ['TypeScript'] },
      headers: { authorization: REDACTED, cookie: REDACTED, accept: 'application/json' },
      items: [{ name: REDACTED }, { title: 'Senior Engineer' }],
    });
  });

  it('masks patterns inside free text values', () => {
    expect(redact({ note: 'reply to ana@example.com' })).toEqual({ note: 'reply to [EMAIL]' });
  });

  it('reduces errors to their safe fields, without message or payload', () => {
    const error = Object.assign(new TypeError('no user Ana Perez'), { payload: { name: 'Ana' } });

    const out = redact({ err: error }) as { err: Record<string, unknown> };

    expect(out.err).toMatchObject({ type: 'TypeError' });
    expect(JSON.stringify(out)).not.toMatch(/Ana|Perez/);
  });

  it('does not mutate the input', () => {
    const input = { email: 'ana@example.com' };
    redact(input);
    expect(input.email).toBe('ana@example.com');
  });

  it('survives cycles and very deep objects', () => {
    const cyclic: Record<string, unknown> = { a: 1 };
    cyclic.self = cyclic;
    let deep: Record<string, unknown> = { leaf: true };
    for (let i = 0; i < 20; i += 1) deep = { child: deep };

    expect(redact(cyclic)).toEqual({ a: 1, self: '[Circular]' });
    expect(JSON.stringify(redact(deep))).toContain('[Truncated]');
  });

  it('keeps primitives, null and dates', () => {
    const date = new Date('2026-10-12T00:00:00Z');
    expect(redact({ n: 1, b: true, z: null, d: date })).toEqual({
      n: 1,
      b: true,
      z: null,
      d: date,
    });
  });
});
