import { createPrisma } from '@rumbo/db';
import { PgBoss } from 'pg-boss';

import type { WorkerConfig } from './config.js';
import { registerHeartbeat } from './jobs/heartbeat.js';

export interface Worker {
  readonly boss: PgBoss;
  /** Stops polling, waits for active jobs to finish, then closes every connection. */
  stop(): Promise<void>;
}

/** Starts pg-boss (installing or upgrading its own `pgboss` schema) and registers every job. */
export async function startWorker(config: WorkerConfig): Promise<Worker> {
  const prisma = createPrisma(config.databaseUrl);
  const boss = new PgBoss({ connectionString: config.databaseUrl, instanceName: 'worker' });
  // Background failures (polling, maintenance) are emitted here; an unhandled 'error' event would
  // crash the process. Only the message is logged: job data may carry personal data (CLAUDE.md, rule 5).
  boss.on('error', (error) => {
    console.error(`pg-boss error: ${error.message}`);
  });

  try {
    await boss.start();
    await registerHeartbeat(boss, prisma);
  } catch (error) {
    await boss.stop({ graceful: false });
    await prisma.$disconnect();
    throw error;
  }

  return {
    boss,
    stop: async () => {
      await boss.stop({ graceful: true });
      await prisma.$disconnect();
    },
  };
}
