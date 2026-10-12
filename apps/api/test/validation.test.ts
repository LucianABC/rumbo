import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { toValidationDetails } from '../src/validation/validation.js';

function errorOf(schema: z.ZodType, value: unknown): z.ZodError {
  const result = schema.safeParse(value);
  if (result.success) throw new Error('expected the value to fail');
  return result.error;
}

describe('toValidationDetails', () => {
  it('turns bigint bounds into strings, which JSON can carry', () => {
    const error = errorOf(z.object({ n: z.bigint().max(10n) }), { n: 11n });

    expect(toValidationDetails(error)).toEqual({
      issues: [{ path: ['n'], code: 'too_big', origin: 'bigint', maximum: '10', inclusive: true }],
    });
  });

  it('never copies input-derived fields such as unrecognized keys or messages', () => {
    const error = errorOf(z.strictObject({ a: z.string() }), { a: 'x', AnaPerez: 1 });

    const details = toValidationDetails(error);
    expect(details).toEqual({ issues: [{ path: [], code: 'unrecognized_keys' }] });
    expect(JSON.stringify(details)).not.toContain('AnaPerez');
  });

  it('throws on anything but a ZodError, so a library change fails loudly', () => {
    expect(() => toValidationDetails(new Error('boom'))).toThrow(TypeError);
    expect(() => toValidationDetails({ issues: [] })).toThrow(TypeError);
  });
});
