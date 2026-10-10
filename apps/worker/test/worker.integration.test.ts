import { createPrisma, type PrismaClient } from '@rumbo/db';
import { startTestDatabase, type TestDatabase } from '@rumbo/db/testing';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { HEARTBEAT_CRON, HEARTBEAT_QUEUE, HEARTBEAT_SOURCE } from '../src/jobs/heartbeat.js';
import { startWorker, type Worker } from '../src/worker.js';

describe('worker', () => {
  let db: TestDatabase;
  let prisma: PrismaClient;
  let worker: Worker;

  beforeAll(async () => {
    db = await startTestDatabase();
    prisma = createPrisma(db.url);
    worker = await startWorker({ databaseUrl: db.url });
  });

  afterAll(async () => {
    await worker.stop();
    await prisma.$disconnect();
    await db.stop();
  });

  it('schedules system.heartbeat every minute', async () => {
    const schedules = await worker.boss.getSchedules(HEARTBEAT_QUEUE);

    expect(schedules).toEqual([expect.objectContaining({ cron: HEARTBEAT_CRON })]);
  });

  it('consumes a system.heartbeat job and writes a heartbeat row', async () => {
    // Sending directly instead of waiting up to a minute for the cron to fire.
    await worker.boss.send(HEARTBEAT_QUEUE);

    await expect
      .poll(() => prisma.heartbeat.count({ where: { source: HEARTBEAT_SOURCE } }), {
        timeout: 15_000,
        interval: 250,
      })
      .toBe(1);
  });

  it('restarts against an existing installation', async () => {
    // Every deploy and every local `docker compose up` boots against a database pg-boss already set up.
    const second = await startWorker({ databaseUrl: db.url });
    await second.stop();

    expect(await worker.boss.getSchedules(HEARTBEAT_QUEUE)).toHaveLength(1);
  });
});
