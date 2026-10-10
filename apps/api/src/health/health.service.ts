import { Inject, Injectable } from '@nestjs/common';
import { PrismaClient } from '@rumbo/db';

import { APP_CONFIG, type AppConfig } from '../config.js';

export type DbStatus = 'up' | 'down';

export interface HealthReport {
  readonly status: 'ok' | 'degraded';
  readonly db: DbStatus;
  readonly version: string;
  readonly commit: string;
  /** Last row written by the worker heartbeat job (ISO 8601); null if none or the DB is down. */
  readonly lastHeartbeatAt: string | null;
}

// Keeps /healthz fast when the database hangs instead of refusing connections.
export const DB_PING_TIMEOUT_MS = 2_000;

@Injectable()
export class HealthService {
  constructor(
    @Inject(PrismaClient) private readonly prisma: PrismaClient,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  async check(): Promise<HealthReport> {
    const db = await this.pingDb();
    return {
      status: db === 'up' ? 'ok' : 'degraded',
      db,
      version: this.config.version,
      commit: this.config.commit,
      lastHeartbeatAt: db === 'up' ? await this.lastHeartbeatAt() : null,
    };
  }

  private async pingDb(): Promise<DbStatus> {
    try {
      await withTimeout(this.prisma.$queryRaw`SELECT 1`, DB_PING_TIMEOUT_MS);
      return 'up';
    } catch {
      return 'down';
    }
  }

  private async lastHeartbeatAt(): Promise<string | null> {
    try {
      const latest = await withTimeout(
        this.prisma.heartbeat.findFirst({
          orderBy: { createdAt: 'desc' },
          select: { createdAt: true },
        }),
        DB_PING_TIMEOUT_MS,
      );
      return latest?.createdAt.toISOString() ?? null;
    } catch {
      return null;
    }
  }
}

async function withTimeout<T>(promise: PromiseLike<T>, ms: number): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error(`Timed out after ${String(ms)} ms`));
    }, ms);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timer);
  }
}
