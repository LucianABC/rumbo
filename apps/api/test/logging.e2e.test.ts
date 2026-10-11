import { Controller, Get, type INestApplication, Param } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { AppModule, configureApp } from '../src/app.module.js';
import { captureLogs } from './log-capture.js';

// Stands in for future endpoints whose path carries client data.
@Controller('people')
class PeopleTestController {
  @Get(':name')
  greet(@Param('name') name: string): { length: number } {
    return { length: name.length };
  }
}

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
      controllers: [PeopleTestController],
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
        req: { method: 'GET' },
        route: null,
        res: { statusCode: 404 },
      }),
    ]);
  });

  it('keeps an incoming request id that is a UUID', async () => {
    const incoming = '3f2c9a1e-7b4d-4c8e-9a6f-1d2e3f4a5b6c';

    const res = await request(app.getHttpServer())
      .get('/api/v1/missing')
      .set('x-request-id', incoming)
      .expect(404);

    expect(res.headers['x-request-id']).toBe(incoming);
    expect(requestLines()[0]).toMatchObject({ reqId: incoming });
  });

  it.each(['AnaPerez', 'web-abc.123_x', 'has spaces', 'ana@example.com', 'x'.repeat(129)])(
    'replaces any other incoming request id, which could carry a name (%s)',
    async (incoming) => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/missing')
        .set('x-request-id', incoming)
        .expect(404);

      expect(res.headers['x-request-id']).toMatch(UUID);
      expect(JSON.stringify(logs.lines)).not.toContain(incoming);
    },
  );

  it('logs the route pattern, never path segments or query sent by the client', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/people/Ana%20Perez?email=ana@example.com&Juan=1')
      .expect(200);

    expect(requestLines()).toEqual([
      expect.objectContaining({
        level: 'info',
        req: { method: 'GET' },
        route: '/api/v1/people/:name',
        res: { statusCode: 200 },
      }),
    ]);
    const output = JSON.stringify(logs.lines);
    for (const leaked of ['Ana', 'Perez', 'ana@example.com', 'Juan']) {
      expect(output).not.toContain(leaked);
    }
  });

  it('logs unmatched routes without their path', async () => {
    await request(app.getHttpServer()).get('/api/v1/missing/Ana%20Perez').expect(404);

    expect(requestLines()[0]).toMatchObject({ req: { method: 'GET' }, route: null });
    expect(JSON.stringify(logs.lines)).not.toContain('Ana');
  });

  it('logs server errors at error level with their route', async () => {
    // The database in this test is unreachable, so healthz answers 503.
    await request(app.getHttpServer()).get('/api/v1/healthz').expect(503);

    expect(requestLines()[0]).toMatchObject({
      level: 'error',
      route: '/api/v1/healthz',
      res: { statusCode: 503 },
    });
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
