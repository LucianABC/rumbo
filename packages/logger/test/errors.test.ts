import { describe, expect, it, vi } from 'vitest';

import { serializeError, shortPath } from '../src/errors.js';

function withCode(code: unknown): Error {
  return Object.assign(new Error('x'), { code });
}

describe('serializeError', () => {
  it.each([
    'ECONNREFUSED',
    'ENOTFOUND',
    'ETIMEDOUT',
    'ERR_INVALID_ARG_TYPE',
    'P2002',
    '23505',
    '57P01',
  ])('keeps the known code %s', (code) => {
    expect(serializeError(withCode(code))).toMatchObject({ code });
  });

  it.each(['AnaPerez', 'PEREZ', 'EANA', 'failed for Ana Perez', ''])(
    'drops the free-form code %s, which could carry a name',
    (code) => {
      expect(serializeError(withCode(code))).not.toHaveProperty('code');
    },
  );

  it('keeps numeric codes', () => {
    expect(serializeError(withCode(42))).toMatchObject({ code: 42 });
  });

  it('drops every other property, which often carries the payload', () => {
    const error = Object.assign(new Error('x'), { payload: { cvText: 'Ana Perez' } });

    expect(JSON.stringify(serializeError(error))).not.toContain('Ana');
  });

  it('keeps stack frames only, with paths that carry no user directory', () => {
    vi.spyOn(process, 'cwd').mockReturnValue('C:\\Users\\lucia\\Code\\Rumbo');
    const error = new Error('x');
    error.stack = [
      'Error: failed for Ana Perez',
      '    at Db.executeSql (C:\\Users\\lucia\\Code\\Rumbo\\node_modules\\.pnpm\\pg-pool@3.14.0\\node_modules\\pg-pool\\index.js:45:11)',
      '    at greet (file:///C:/Users/lucia/Code/Rumbo/apps/api/dist/main.js:3:9)',
      '    at C:\\Users\\lucia\\elsewhere\\script.js:1:2',
      '    at main (/home/ana/project/app.js:10:5)',
      '    at process.processTicksAndRejections (node:internal/process/task_queues:104:5)',
    ].join('\n');

    expect(serializeError(error).stack).toBe(
      [
        'at Db.executeSql (node_modules/pg-pool/index.js:45:11)',
        'at greet (apps/api/dist/main.js:3:9)',
        'at script.js:1:2',
        'at main (app.js:10:5)',
        'at process.processTicksAndRejections (node:internal/process/task_queues:104:5)',
      ].join('\n'),
    );
    vi.restoreAllMocks();
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

  it('handles plain objects copied from an error, as pg-boss emits for worker failures', () => {
    const source = Object.assign(new TypeError('job for Ana Perez failed'), { code: 'ECONNRESET' });
    const copied = {
      ...Object.fromEntries(Object.entries(source)),
      message: source.message,
      stack: source.stack,
      queue: 'system.heartbeat',
      data: { fullName: 'Ana Perez' },
    };

    const out = serializeError(copied);

    expect(out).toMatchObject({ type: 'TypeError', code: 'ECONNRESET' });
    expect(out.stack).toMatch(/^at /);
    expect(JSON.stringify(out)).not.toMatch(/Ana|Perez/);
  });

  it('does not take a type from a stack whose first line is not an identifier', () => {
    expect(serializeError({ stack: 'Ana Perez: failed' })).toMatchObject({ type: 'Error' });
  });

  it('describes non-errors by their type only', () => {
    expect(serializeError('Ana Perez')).toEqual({ type: 'string' });
  });
});

describe('shortPath', () => {
  it('keeps container paths relative to the working directory', () => {
    vi.spyOn(process, 'cwd').mockReturnValue('/app');
    expect(shortPath('/app/dist/main.js')).toBe('dist/main.js');
    vi.restoreAllMocks();
  });
});
