import { Controller, Get, type INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { captureLogs } from './log-capture.js';
import { createTestApp } from './test-app.js';

const ALLOWED = 'https://app.example';
const EVIL = 'https://evil.example';

// Stands in for a future JSON endpoint.
@Controller('ping')
class PingTestController {
  @Get()
  get(): { ok: true } {
    return { ok: true };
  }
}

function expectSecurityHeaders(headers: Record<string, string | undefined>): void {
  expect(headers['content-security-policy']).toContain("default-src 'self'");
  expect(headers['strict-transport-security']).toMatch(/max-age=\d+/);
  expect(headers['x-content-type-options']).toBe('nosniff');
  expect(headers['x-frame-options']).toBe('SAMEORIGIN');
  expect(headers['referrer-policy']).toBe('no-referrer');
  expect(headers['x-powered-by']).toBeUndefined();
}

// No database needed: these requests never reach a handler that queries it.
describe('security headers', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    app = await createTestApp({ logs: captureLogs(), controllers: [PingTestController] });
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it.each([
    ['a JSON response', '/api/v1/ping', 200],
    ['an error envelope', '/api/v1/missing', 404],
    ['the API docs', '/api/docs', 200],
  ])('are set on %s', async (_name, path, status) => {
    const res = await request(app.getHttpServer()).get(path).expect(status);

    expectSecurityHeaders(res.headers);
  });
});

describe('CORS', () => {
  describe('with no allowed origins (the default)', () => {
    let app: INestApplication<App>;

    beforeAll(async () => {
      app = await createTestApp({ logs: captureLogs(), controllers: [PingTestController] });
      await app.init();
    });

    afterAll(async () => {
      await app.close();
    });

    it('gives a cross-origin request no permission to read the response', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/ping').set('origin', EVIL);

      expect(res.headers['access-control-allow-origin']).toBeUndefined();
    });

    it('answers a preflight without allowing the origin', async () => {
      const res = await request(app.getHttpServer())
        .options('/api/v1/ping')
        .set('origin', EVIL)
        .set('access-control-request-method', 'POST');

      expect(res.headers['access-control-allow-origin']).toBeUndefined();
      expect(res.headers['access-control-allow-credentials']).toBeUndefined();
    });
  });

  describe('with an allowlist', () => {
    let app: INestApplication<App>;

    beforeAll(async () => {
      app = await createTestApp({
        logs: captureLogs(),
        controllers: [PingTestController],
        config: { corsOrigins: [ALLOWED] },
      });
      await app.init();
    });

    afterAll(async () => {
      await app.close();
    });

    it('allows a listed origin on requests and preflights', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/ping').set('origin', ALLOWED);
      expect(res.headers['access-control-allow-origin']).toBe(ALLOWED);

      const preflight = await request(app.getHttpServer())
        .options('/api/v1/ping')
        .set('origin', ALLOWED)
        .set('access-control-request-method', 'POST')
        .expect(204);
      expect(preflight.headers['access-control-allow-origin']).toBe(ALLOWED);
    });

    it('still rejects an origin that is not listed', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/ping').set('origin', EVIL);

      expect(res.headers['access-control-allow-origin']).toBeUndefined();
    });
  });
});
