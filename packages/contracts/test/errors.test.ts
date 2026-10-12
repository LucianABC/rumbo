import { describe, expect, it } from 'vitest';

import { ErrorEnvelope, ValidationDetails } from '../src/index.js';

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

describe('ValidationDetails', () => {
  it('accepts issues with schema bounds', () => {
    const details = {
      issues: [
        { path: ['name'], code: 'too_small', expected: 'string', minimum: 1, inclusive: true },
        { path: ['items', 0, 'id'], code: 'invalid_format', format: 'uuid' },
        { path: ['big'], code: 'too_big', maximum: '9007199254740993' },
      ],
    };

    expect(ValidationDetails.safeParse(details).success).toBe(true);
  });

  it('rejects issues without a path or code', () => {
    expect(ValidationDetails.safeParse({ issues: [{ code: 'custom' }] }).success).toBe(false);
    expect(ValidationDetails.safeParse({ issues: [{ path: ['x'] }] }).success).toBe(false);
    expect(
      ValidationDetails.safeParse({ issues: [{ path: ['x'], code: 'too_tiny' }] }).success,
    ).toBe(false);
  });
});
