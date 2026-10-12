import type { INestApplication } from '@nestjs/common';
import { createPrisma } from '@rumbo/db';
import { startTestDatabase, type TestDatabase } from '@rumbo/db/testing';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { captureLogs } from './log-capture.js';
import { createTestApp } from './test-app.js';

describe('GET /api/v1/healthz', () => {
  let db: TestDatabase;
  let app: INestApplication<App>;
  const logs = captureLogs();

  beforeAll(async () => {
    db = await startTestDatabase();
    app = await createTestApp({ logs, databaseUrl: db.url });
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns 200 with db up and no heartbeat yet', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/healthz').expect(200);

    expect(res.body).toEqual({
      status: 'ok',
      db: 'up',
      version: 'test',
      commit: 'test',
      lastHeartbeatAt: null,
    });
  });

  it('does not log successful health checks, which Docker polls every few seconds', async () => {
    logs.lines.length = 0;

    await request(app.getHttpServer()).get('/api/v1/healthz').expect(200);

    expect(logs.lines.filter((line) => 'res' in line)).toEqual([]);
  });

  it('reports the latest heartbeat written by the worker', async () => {
    const prisma = createPrisma(db.url);
    const heartbeat = await prisma.heartbeat.create({ data: { source: 'worker' } });
    await prisma.$disconnect();

    const res = await request(app.getHttpServer()).get('/api/v1/healthz').expect(200);

    expect(res.body).toMatchObject({ lastHeartbeatAt: heartbeat.createdAt.toISOString() });
  });

  it('returns 503 with db down when the database is gone', async () => {
    await db.stop();

    const res = await request(app.getHttpServer()).get('/api/v1/healthz').expect(503);

    expect(res.body).toMatchObject({ status: 'degraded', db: 'down', lastHeartbeatAt: null });
  });
});
