import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { createPrisma } from '@rumbo/db';
import { startTestDatabase, type TestDatabase } from '@rumbo/db/testing';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { AppModule, configureApp } from '../src/app.module.js';

describe('GET /api/v1/healthz', () => {
  let db: TestDatabase;
  let app: INestApplication<App>;

  beforeAll(async () => {
    db = await startTestDatabase();
    const moduleRef = await Test.createTestingModule({
      imports: [
        AppModule.forRoot({ port: 0, databaseUrl: db.url, version: 'test', commit: 'test' }),
      ],
    }).compile();
    app = configureApp(moduleRef.createNestApplication<INestApplication<App>>());
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
