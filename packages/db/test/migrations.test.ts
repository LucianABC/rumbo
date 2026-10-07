import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createPrisma, type PrismaClient } from '../src/index.js';

// Same image family as production (RDS PostgreSQL 16 + pgvector, ADR 0002).
const IMAGE = 'pgvector/pgvector:pg16';
const packageDir = fileURLToPath(new URL('..', import.meta.url));
const prismaCli = createRequire(import.meta.url).resolve('prisma/build/index.js');

describe('database migrations', () => {
  let container: StartedPostgreSqlContainer;
  let prisma: PrismaClient;

  beforeAll(async () => {
    container = await new PostgreSqlContainer(IMAGE).start();
    const databaseUrl = container.getConnectionUri();

    // Apply migrations exactly as the deploy step does: `prisma migrate deploy`.
    execFileSync(process.execPath, [prismaCli, 'migrate', 'deploy'], {
      cwd: packageDir,
      env: { ...process.env, DATABASE_URL: databaseUrl, PRISMA_HIDE_UPDATE_MESSAGE: '1' },
      stdio: 'pipe',
    });

    prisma = createPrisma(databaseUrl);
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await container.stop();
  });

  it('installs the pgvector extension', async () => {
    const rows = await prisma.$queryRaw<{ extname: string }[]>`
      SELECT extname FROM pg_extension WHERE extname = 'vector'`;

    expect(rows).toEqual([{ extname: 'vector' }]);
  });

  it('creates the heartbeat table', async () => {
    const created = await prisma.heartbeat.create({ data: { source: 'test' } });
    const latest = await prisma.heartbeat.findFirst({ orderBy: { createdAt: 'desc' } });

    expect(latest?.id).toBe(created.id);
    expect(latest?.source).toBe('test');
  });
});
