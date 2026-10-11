import { Writable } from 'node:stream';

import { describe, expect, it } from 'vitest';

import { createLogger, REDACTED } from '../src/index.js';

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

  it('redacts errors logged under err', () => {
    const { lines, destination } = capture();

    createLogger({ service: 'worker', destination }).error(
      { err: new Error('connect postgresql://rumbo:s3cret@db/rumbo') },
      'job failed',
    );

    expect(JSON.stringify(lines[0])).not.toContain('s3cret');
    expect(lines[0]).toMatchObject({ err: { type: 'Error' } });
  });

  it('redacts the message pino takes from an error logged directly', () => {
    const { lines, destination } = capture();

    createLogger({ service: 'api', destination }).error(new Error('no user ana@example.com'));

    expect(lines[0]).toMatchObject({ msg: 'no user [EMAIL]', err: { type: 'Error' } });
    expect(JSON.stringify(lines[0])).not.toContain('ana@example.com');
  });

  it('respects the level', () => {
    const { lines, destination } = capture();
    const logger = createLogger({ service: 'api', level: 'warn', destination });

    logger.info('hidden');
    logger.warn('shown');

    expect(lines.map((line) => line.msg)).toEqual(['shown']);
  });
});
