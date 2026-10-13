import { Writable } from 'node:stream';

import { createLogger } from '@rumbo/logger';
import { describe, expect, it, vi } from 'vitest';

import { installShutdown, SHUTDOWN_SIGNALS } from '../src/shutdown.js';
import type { Worker } from '../src/worker.js';

function setup(stop: () => Promise<void>) {
  const lines: Record<string, unknown>[] = [];
  const destination = new Writable({
    write(chunk: Buffer, _encoding, callback) {
      lines.push(JSON.parse(chunk.toString()) as Record<string, unknown>);
      callback();
    },
  });
  const listeners = new Map<string, () => void>();
  const proc = {
    once: vi.fn((signal: string, listener: () => void) => listeners.set(signal, listener)),
    exit: vi.fn<(code: number) => void>(),
  };
  const stopMock = vi.fn(stop);
  const worker = { stop: stopMock } as unknown as Worker;
  installShutdown(worker, createLogger({ service: 'worker', destination }), proc);
  return { lines, listeners, proc, stop: stopMock };
}

describe('installShutdown', () => {
  it('listens once for each shutdown signal', () => {
    const { proc } = setup(() => Promise.resolve());

    expect(proc.once.mock.calls.map(([signal]) => signal)).toEqual([...SHUTDOWN_SIGNALS]);
  });

  it.each(SHUTDOWN_SIGNALS)('stops the worker and exits 0 on %s', async (signal) => {
    const { listeners, proc, stop } = setup(() => Promise.resolve());

    listeners.get(signal)?.();

    await vi.waitFor(() => {
      expect(proc.exit).toHaveBeenCalledWith(0);
    });
    expect(stop).toHaveBeenCalledOnce();
  });

  it('exits 1 and logs the error, without its message, when the worker fails to stop', async () => {
    const { lines, listeners, proc } = setup(() => Promise.reject(new Error('queue AnaPerez')));

    listeners.get('SIGTERM')?.();

    await vi.waitFor(() => {
      expect(proc.exit).toHaveBeenCalledWith(1);
    });
    expect(lines).toContainEqual(
      expect.objectContaining({ msg: 'worker failed to stop cleanly', err: { type: 'Error' } }),
    );
    expect(JSON.stringify(lines)).not.toContain('AnaPerez');
  });
});
