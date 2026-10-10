import type { PrismaClient } from '@rumbo/db';
import type { PgBoss } from 'pg-boss';

export const HEARTBEAT_QUEUE = 'system.heartbeat';
// Every minute; the status page treats a heartbeat older than 5 minutes as stale (walking-skeleton.md).
export const HEARTBEAT_CRON = '* * * * *';
export const HEARTBEAT_SOURCE = 'worker';

/** Writes the row GET /api/v1/healthz reports as lastHeartbeatAt. */
export async function writeHeartbeat(prisma: PrismaClient): Promise<void> {
  await prisma.heartbeat.create({ data: { source: HEARTBEAT_SOURCE } });
}

export async function registerHeartbeat(boss: PgBoss, prisma: PrismaClient): Promise<void> {
  // Queues must exist before send/schedule/work (pg-boss 10+). Both calls are safe on every boot.
  await boss.createQueue(HEARTBEAT_QUEUE);
  await boss.schedule(HEARTBEAT_QUEUE, HEARTBEAT_CRON);
  await boss.work(HEARTBEAT_QUEUE, async () => {
    await writeHeartbeat(prisma);
  });
}
