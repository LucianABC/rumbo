import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { AppModule, configureApp } from '../src/app.module.js';
import { captureLogs } from './log-capture.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

// No database needed: these requests never reach a handler that queries it.
describe('request logging', () => {
  let app: INestApplication<App>;
  const logs = captureLogs();

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        AppModule.forRoot(
          {
            port: 0,
            databaseUrl: 'postgresql://unused@127.0.0.1:1/unused',
            version: 'test',
            commit: 'test',
            logLevel: 'info',
          },
          { logDestination: logs.destination },
        ),
      ],
    }).compile();
    app = configureApp(moduleRef.createNestApplication<INestApplication<App>>());
    await app.init();
  });

  beforeEach(() => {
    logs.lines.length = 0;
  });

  afterAll(async () => {
    await app.close();
  });

  function requestLines() {
    return logs.lines.filter((line) => 'res' in line);
  }

  it('generates a request id, returns it and logs it as JSON', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/missing').expect(404);

    const id = res.headers['x-request-id'];
    expect(id).toMatch(UUID);
    expect(requestLines()).toEqual([
      expect.objectContaining({
        service: 'api',
        level: 'warn',
        reqId: id,
        req: { method: 'GET', url: '/api/v1/missing' },
        res: { statusCode: 404 },
      }),
    ]);
  });

  it('keeps a valid incoming request id', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/missing')
      .set('x-request-id', 'web-abc.123_x')
      .expect(404);

    expect(res.headers['x-request-id']).toBe('web-abc.123_x');
    expect(requestLines()[0]).toMatchObject({ reqId: 'web-abc.123_x' });
  });

  it.each(['has spaces', 'x'.repeat(129), 'ana@example.com'])(
    'replaces an unsafe incoming request id (%s)',
    async (incoming) => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/missing')
        .set('x-request-id', incoming)
        .expect(404);

      expect(res.headers['x-request-id']).toMatch(UUID);
    },
  );

  it('logs query keys but never query values', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/missing?email=ana@example.com&token=abc')
      .expect(404);

    expect(requestLines()[0]).toMatchObject({
      req: { url: '/api/v1/missing?email=[REDACTED]&token=[REDACTED]' },
    });
    expect(JSON.stringify(logs.lines)).not.toContain('ana@example.com');
  });

  it('does not log request headers such as cookies or authorization', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/missing')
      .set('authorization', 'Bearer secret-token')
      .set('cookie', 'sid=secret-cookie')
      .expect(404);

    const output = JSON.stringify(logs.lines);
    expect(output).not.toContain('secret-token');
    expect(output).not.toContain('secret-cookie');
  });
});
