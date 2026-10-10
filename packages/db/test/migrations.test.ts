import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createPrisma, type PrismaClient } from '../src/index.js';
import { startTestDatabase, type TestDatabase } from '../src/testing.js';

describe('database migrations', () => {
  let db: TestDatabase;
  let prisma: PrismaClient;

  beforeAll(async () => {
    db = await startTestDatabase();
    prisma = createPrisma(db.url);
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await db.stop();
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
