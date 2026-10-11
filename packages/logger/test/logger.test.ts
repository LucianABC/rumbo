import { Writable } from 'node:stream';

import { describe, expect, it } from 'vitest';

import { createLogger, type Logger, REDACTED } from '../src/index.js';

function capture() {
  const lines: Record<string, unknown>[] = [];
  const destination = new Writable({
    write(chunk: Buffer, _encoding, callback) {
      lines.push(JSON.parse(chunk.toString()) as Record<string, unknown>);
      callback();
    },
  });
  return { lines, destination };
}

describe('createLogger', () => {
  it('writes JSON lines with service, level label and ISO time', () => {
    const { lines, destination } = capture();

    createLogger({ service: 'api', destination }).info({ durationMs: 12 }, 'request done');

    expect(lines[0]).toMatchObject({
      service: 'api',
      level: 'info',
      durationMs: 12,
      msg: 'request done',
    });
    expect(String(lines[0]?.time)).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('redacts log objects, child bindings and message arguments', () => {
    const { lines, destination } = capture();
    const logger = createLogger({ service: 'api', destination });

    logger
      .child({ reqId: 'r1', email: 'ana@example.com' })
      .warn(
        { user: { fullName: 'Ana Pérez' }, token: 'abc' },
        'login failed for %s',
        'ana@example.com',
      );

    expect(lines[0]).toMatchObject({
      reqId: 'r1',
      email: REDACTED,
      user: { fullName: REDACTED },
      token: REDACTED,
      msg: 'login failed for [EMAIL]',
    });
    expect(JSON.stringify(lines[0])).not.toContain('ana@example.com');
  });

  it('logs errors by known type and code, never by message or stack', () => {
    const { lines, destination } = capture();
    const error = Object.assign(new TypeError('job Ana Perez failed'), { code: 'ECONNREFUSED' });

    createLogger({ service: 'worker', destination }).error({ err: error }, 'pg-boss error');

    const line = lines[0] as { msg: string; err: { type: string; code: string } };
    expect(line.msg).toBe('pg-boss error');
    expect(line.err).toMatchObject({ type: 'TypeError', code: 'ECONNREFUSED' });
    expect(line.err).not.toHaveProperty('stack');
    expect(JSON.stringify(line)).not.toMatch(/Ana|Perez/);
  });

  it.each([
    [
      'an error logged directly',
      (logger: Logger, err: Error) => {
        logger.error(err);
      },
    ],
    [
      'an error under err without a message',
      (logger: Logger, err: Error) => {
        logger.error({ err });
      },
    ],
  ])('uses the error type as message for %s', (_label, log) => {
    const { lines, destination } = capture();

    log(createLogger({ service: 'api', destination }), new RangeError('no user Ana Perez'));

    expect(lines[0]).toMatchObject({ msg: 'RangeError', err: { type: 'RangeError' } });
    expect(JSON.stringify(lines[0])).not.toMatch(/Ana|Perez/);
  });

  describe('errors that are not Error instances', () => {
    const source = new TypeError('job for Ana Perez failed');
    // Same shape pg-boss emits: own properties plus message and stack.
    const copied = {
      ...Object.fromEntries(Object.entries(source)),
      message: source.message,
      stack: source.stack,
    };

    it.each([
      ['a copied error under err', { err: copied }],
      ['an error that went through JSON', { err: { message: 'no user Ana Perez' } }],
    ])('never takes the message of %s as msg', (_label, object) => {
      const { lines, destination } = capture();

      createLogger({ service: 'worker', destination }).error(object);

      expect(JSON.stringify(lines[0])).not.toMatch(/Ana|Perez/);
    });

    it('keeps level, time, service and msg when a copied error is logged directly', () => {
      const { lines, destination } = capture();

      createLogger({ service: 'worker', destination }).error(copied);

      expect(lines[0]).toMatchObject({
        level: 'error',
        service: 'worker',
        msg: 'TypeError',
        err: { type: 'TypeError' },
      });
      expect(lines[0]).toHaveProperty('time');
      expect(JSON.stringify(lines[0])).not.toMatch(/Ana|Perez/);
    });
  });

  it('logs errors under any key and at any depth by their safe fields only', () => {
    const { lines, destination } = capture();
    const error = Object.assign(new Error('failed for Ana Perez'), {
      payload: { cvText: 'Ana Perez, Buenos Aires' },
    });

    createLogger({ service: 'worker', destination }).error(
      {
        error,
        job: { lastError: error },
        attempts: [error],
        // Same shape pg-boss emits: own properties plus message and stack.
        copied: {
          ...Object.fromEntries(Object.entries(error)),
          message: error.message,
          stack: error.stack,
        },
      },
      'job failed',
    );

    expect(lines[0]).toMatchObject({
      error: { type: 'Error' },
      job: { lastError: { type: 'Error' } },
      attempts: [{ type: 'Error' }],
      copied: { type: 'Error' },
    });
    expect(JSON.stringify(lines[0])).not.toMatch(/Ana|Perez|Buenos/);
  });

  it('keeps safe fields of the cause chain', () => {
    const { lines, destination } = capture();
    const cause = Object.assign(new Error('row for Ana Perez'), { code: 'P2002' });

    createLogger({ service: 'api', destination }).error(
      { err: new Error('save failed for Ana Perez', { cause }) },
      'save failed',
    );

    expect(lines[0]).toMatchObject({
      err: { type: 'Error', cause: { type: 'Error', code: 'P2002' } },
    });
    expect(JSON.stringify(lines[0])).not.toMatch(/Ana|Perez/);
  });

  it('respects the level', () => {
    const { lines, destination } = capture();
    const logger = createLogger({ service: 'api', level: 'warn', destination });

    logger.info('hidden');
    logger.warn('shown');

    expect(lines.map((line) => line.msg)).toEqual(['shown']);
  });
});
