import { describe, expect, it } from 'vitest';

import { ErrorEnvelope } from '../src/index.js';

const requestId = '3f2c9a1e-7b4d-4c8e-9a6f-1d2e3f4a5b6c';

describe('ErrorEnvelope', () => {
  it('accepts an error with and without details', () => {
    const base = { code: 'NOT_FOUND', message: 'Not found', requestId };

    expect(ErrorEnvelope.safeParse({ error: base }).success).toBe(true);
    expect(ErrorEnvelope.safeParse({ error: { ...base, details: { field: 'x' } } }).success).toBe(
      true,
    );
  });

  it('rejects unknown codes and missing fields', () => {
    expect(
      ErrorEnvelope.safeParse({ error: { code: 'TEAPOT', message: 'x', requestId } }).success,
    ).toBe(false);
    expect(ErrorEnvelope.safeParse({ error: { code: 'INTERNAL', message: 'x' } }).success).toBe(
      false,
    );
  });
});
