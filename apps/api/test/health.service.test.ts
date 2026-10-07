import type { PrismaClient } from '@rumbo/db';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { AppConfig } from '../src/config.js';
import { DB_PING_TIMEOUT_MS, HealthService } from '../src/health/health.service.js';

const config: AppConfig = {
  port: 3001,
  databaseUrl: 'postgresql://unused',
  version: '1.2.3',
  commit: 'abc1234',
};

function fakePrisma(options: {
  ping: () => Promise<unknown>;
  latest?: () => Promise<{ createdAt: Date } | null>;
}): PrismaClient {
  return {
    $queryRaw: vi.fn(options.ping),
    heartbeat: { findFirst: vi.fn(options.latest ?? (() => Promise.resolve(null))) },
  } as unknown as PrismaClient;
}

describe('HealthService', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('reports ok with the last heartbeat when the database answers', async () => {
    const createdAt = new Date('2026-10-07T12:00:00.000Z');
    const service = new HealthService(
      fakePrisma({
        ping: () => Promise.resolve([1]),
        latest: () => Promise.resolve({ createdAt }),
      }),
      config,
    );

    await expect(service.check()).resolves.toEqual({
      status: 'ok',
      db: 'up',
      version: '1.2.3',
      commit: 'abc1234',
      lastHeartbeatAt: '2026-10-07T12:00:00.000Z',
    });
  });

  it('reports a null heartbeat when none has been written yet', async () => {
    const service = new HealthService(fakePrisma({ ping: () => Promise.resolve([1]) }), config);

    await expect(service.check()).resolves.toMatchObject({ db: 'up', lastHeartbeatAt: null });
  });

  it('reports degraded when the database refuses the query', async () => {
    const latest = vi.fn();
    const service = new HealthService(
      fakePrisma({ ping: () => Promise.reject(new Error('ECONNREFUSED')), latest }),
      config,
    );

    await expect(service.check()).resolves.toMatchObject({
      status: 'degraded',
      db: 'down',
      lastHeartbeatAt: null,
    });
    expect(latest).not.toHaveBeenCalled();
  });

  it('reports degraded when the database does not answer in time', async () => {
    vi.useFakeTimers();
    const service = new HealthService(
      fakePrisma({ ping: () => new Promise(() => undefined) }),
      config,
    );

    const result = service.check();
    await vi.advanceTimersByTimeAsync(DB_PING_TIMEOUT_MS);

    await expect(result).resolves.toMatchObject({ db: 'down' });
  });
});
