import {
  Body,
  Controller,
  Get,
  type INestApplication,
  NotFoundException,
  Param,
  Post,
} from '@nestjs/common';
import { ErrorEnvelope } from '@rumbo/contracts';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { ApiException } from '../src/errors/api-exception.js';
import { captureLogs } from './log-capture.js';
import { createTestApp, UUID } from './test-app.js';

@Controller('errors')
class ErrorsTestController {
  @Get('unknown/:name')
  unknown(@Param('name') name: string): never {
    throw new Error(`could not load ${name}`);
  }

  @Get('not-found/:name')
  notFound(@Param('name') name: string): never {
    throw new NotFoundException(`no profile for ${name}`);
  }

  @Get('conflict')
  conflict(): never {
    throw new ApiException('CONFLICT', 'Target already chosen', { field: 'role' });
  }

  @Post('echo')
  echo(@Body() body: unknown): unknown {
    return body;
  }
}

/** Parses the body as the shared contract, so a drift between API and contract fails here. */
function envelope(body: unknown): ErrorEnvelope['error'] {
  return ErrorEnvelope.parse(body).error;
}

// No database needed: these requests never reach a handler that queries it.
describe('error envelope', () => {
  let app: INestApplication<App>;
  const logs = captureLogs();

  beforeAll(async () => {
    app = await createTestApp({ logs, controllers: [ErrorsTestController] });
    await app.init();
  });

  beforeEach(() => {
    logs.lines.length = 0;
  });

  afterAll(async () => {
    await app.close();
  });

  it('answers unmatched routes with NOT_FOUND and the request id, without echoing the path', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/missing/Ana%20Perez').expect(404);

    expect(envelope(res.body)).toEqual({
      code: 'NOT_FOUND',
      message: 'Not found',
      requestId: res.headers['x-request-id'],
    });
    expect(res.text).not.toMatch(/Ana|Perez|missing/);
  });

  it('answers unknown errors with INTERNAL and no message or stack', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/errors/unknown/Ana').expect(500);

    expect(envelope(res.body)).toEqual({
      code: 'INTERNAL',
      message: 'Internal error',
      requestId: res.headers['x-request-id'],
    });
    expect(res.text).not.toMatch(/Ana|could not load|\bat\b|\.ts/);
  });

  it('logs unknown errors once, with the request id and without their message', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/errors/unknown/Ana').expect(500);

    const failed = logs.lines.filter((line) => line.msg === 'request failed');
    expect(failed).toEqual([
      expect.objectContaining({
        level: 'error',
        reqId: res.headers['x-request-id'],
        err: { type: 'Error' },
        code: 'INTERNAL',
        status: 500,
      }),
    ]);
    expect(JSON.stringify(logs.lines)).not.toContain('Ana');
  });

  it('replaces messages of Nest exceptions, which may echo client input', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/errors/not-found/Ana').expect(404);

    expect(envelope(res.body)).toMatchObject({ code: 'NOT_FOUND', message: 'Not found' });
    expect(res.text).not.toContain('Ana');
  });

  it('keeps the status, code, message and details of an ApiException', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/errors/conflict').expect(409);

    expect(envelope(res.body)).toEqual({
      code: 'CONFLICT',
      message: 'Target already chosen',
      details: { field: 'role' },
      requestId: res.headers['x-request-id'],
    });
  });

  it('answers malformed JSON with BAD_REQUEST, without the parser message', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/errors/echo')
      .set('content-type', 'application/json')
      .send('{"name": "Ana", oops}')
      .expect(400);

    expect(envelope(res.body)).toEqual({
      code: 'BAD_REQUEST',
      message: 'Bad request',
      requestId: res.headers['x-request-id'],
    });
    expect(res.headers['x-request-id']).toMatch(UUID);
    expect(res.text).not.toMatch(/Ana|oops|JSON|position/);
  });

  it('logs requests the body parser rejects, with the request id sent to the client', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/errors/echo')
      .set('content-type', 'application/json')
      .send('{oops')
      .expect(400);

    expect(logs.lines.filter((line) => 'res' in line)).toEqual([
      expect.objectContaining({
        level: 'warn',
        reqId: res.headers['x-request-id'],
        res: { statusCode: 400 },
      }),
    ]);
  });

  it('answers bodies over the size limit with PAYLOAD_TOO_LARGE, not as a server error', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/errors/echo')
      .set('content-type', 'application/json')
      .send(JSON.stringify({ text: 'x'.repeat(200_000) }))
      .expect(413);

    expect(envelope(res.body)).toMatchObject({
      code: 'PAYLOAD_TOO_LARGE',
      message: 'Payload too large',
    });
    expect(logs.lines.filter((line) => line.msg === 'request failed')).toEqual([]);
  });
});
