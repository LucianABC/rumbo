import { describe, expect, it } from 'vitest';

import { serializeError } from '../src/errors.js';

describe('serializeError', () => {
  it('drops free-form codes, which could carry data', () => {
    const error = Object.assign(new Error('x'), { code: 'failed for Ana Perez' });

    expect(serializeError(error)).not.toHaveProperty('code');
  });

  it('keeps numeric codes', () => {
    expect(serializeError(Object.assign(new Error('x'), { code: 42 }))).toMatchObject({ code: 42 });
  });

  it('stops following causes after a few levels', () => {
    let error = new Error('root');
    for (let i = 0; i < 10; i += 1) error = new Error(`level ${String(i)}`, { cause: error });

    expect(JSON.stringify(serializeError(error)).match(/"cause"/g)).toHaveLength(3);
  });

  it('unwraps the output of the standard pino err serializer, which pino-http applies first', () => {
    const wrapped = {
      type: 'Error',
      message: 'no user Ana Perez',
      raw: new RangeError('no user Ana Perez'),
    };

    expect(serializeError(wrapped)).toMatchObject({ type: 'RangeError' });
    expect(JSON.stringify(serializeError(wrapped))).not.toMatch(/Ana|Perez/);
  });

  it('describes non-errors by their type only', () => {
    expect(serializeError('Ana Perez')).toEqual({ type: 'string' });
  });
});
