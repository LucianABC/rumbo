import {
  Body,
  Controller,
  createParamDecorator,
  Get,
  type INestApplication,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { ErrorEnvelope, ValidationDetails } from '@rumbo/contracts';
import { createZodDto } from 'nestjs-zod';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { z } from 'zod';

import { captureLogs } from './log-capture.js';
import { createTestApp } from './test-app.js';

const SECRET = 'AnaPerez-secret';

class ProfileBody extends createZodDto(
  z.object({
    name: z.string().min(1),
    years: z.int().nonnegative(),
    email: z.email().optional(),
    // A custom message that embeds the input, the case ADR 0006 guards against.
    nickname: z
      .string()
      .refine((value) => !value.includes('-'), {
        error: (iss) => `bad nickname ${String(iss.input)}`,
      })
      .optional(),
  }),
) {}

class ItemParams extends createZodDto(z.object({ id: z.uuid() })) {}

// Query values arrive as strings, so numbers need z.coerce.
class ListQuery extends createZodDto(z.object({ limit: z.coerce.number().int().max(50) })) {}

class EventBody extends createZodDto(
  z.object({
    at: z.coerce.date().min(new Date('2026-01-01T00:00:00Z')),
    item: z.union([z.object({ title: z.string() }), z.object({ year: z.int() })]),
  }),
) {}

// Like a future @CurrentUser(): not request input, so it needs no DTO.
const Owner = createParamDecorator(() => ({ id: 'owner' }));

// Stand-ins for future endpoints with a body and with route params.
@Controller('v')
class ValidationTestController {
  @Post('profiles')
  create(@Body() body: ProfileBody): ProfileBody {
    return body;
  }

  @Get('items/:id')
  item(@Param() { id }: ItemParams): { id: string } {
    return { id };
  }

  @Get('items')
  list(@Query() query: ListQuery): ListQuery {
    return query;
  }

  @Post('events')
  event(@Body() _body: EventBody): { ok: true } {
    return { ok: true };
  }

  @Get('me')
  me(@Owner() owner: { id: string }): { id: string } {
    return owner;
  }

  @Get('raw/:id')
  raw(@Param('id') id: string): { id: string } {
    return { id };
  }
}

function details(body: unknown): ValidationDetails {
  return ValidationDetails.parse(ErrorEnvelope.parse(body).error.details);
}

// No database needed: these requests never reach a handler that queries it.
describe('request validation', () => {
  let app: INestApplication<App>;
  const logs = captureLogs();

  beforeAll(async () => {
    app = await createTestApp({ logs, controllers: [ValidationTestController] });
    await app.init();
  });

  beforeEach(() => {
    logs.lines.length = 0;
  });

  afterAll(async () => {
    await app.close();
  });

  it('answers an invalid body with BAD_REQUEST and one issue per field', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/v/profiles')
      .send({ name: '', years: -1, email: 'nope' })
      .expect(400);

    expect(ErrorEnvelope.parse(res.body).error).toMatchObject({
      code: 'BAD_REQUEST',
      message: 'Invalid request',
      requestId: res.headers['x-request-id'],
    });
    expect(details(res.body).issues).toEqual([
      { path: ['name'], code: 'too_small', origin: 'string', minimum: 1, inclusive: true },
      { path: ['years'], code: 'too_small', origin: 'number', minimum: 0, inclusive: true },
      { path: ['email'], code: 'invalid_format', origin: 'string', format: 'email' },
    ]);
  });

  it('never returns the input, even when a custom message embeds it', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/v/profiles')
      .send({ name: 'x', years: 1, nickname: SECRET })
      .expect(400);

    expect(details(res.body).issues).toEqual([{ path: ['nickname'], code: 'custom' }]);
    expect(res.text).not.toContain(SECRET);
    expect(JSON.stringify(logs.lines)).not.toContain(SECRET);
  });

  it('leaves out library internals such as regex patterns', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/v/profiles')
      .send({ name: 'x', years: 1, email: 'nope' })
      .expect(400);

    for (const issue of details(res.body).issues) {
      expect(Object.keys(issue)).not.toContain('pattern');
      expect(Object.keys(issue)).not.toContain('message');
    }
  });

  it('passes a valid body and strips keys the schema does not declare', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/v/profiles')
      .send({ name: 'x', years: 3, extra: SECRET })
      .expect(201);

    expect(res.body).toEqual({ name: 'x', years: 3 });
  });

  it('validates route params declared with a DTO', async () => {
    const bad = await request(app.getHttpServer()).get('/api/v1/v/items/not-a-uuid').expect(400);
    expect(details(bad.body).issues).toEqual([
      { path: ['id'], code: 'invalid_format', origin: 'string', format: 'uuid' },
    ]);

    const id = '3f2c9a1e-7b4d-4c8e-9a6f-1d2e3f4a5b6c';
    const ok = await request(app.getHttpServer()).get(`/api/v1/v/items/${id}`).expect(200);
    expect(ok.body).toEqual({ id });
  });

  it('fails a param without a DTO instead of passing it unvalidated', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/v/raw/anything').expect(500);

    expect(ErrorEnvelope.parse(res.body).error.code).toBe('INTERNAL');
    expect(logs.lines.filter((line) => line.msg === 'request failed')).toHaveLength(1);
  });

  it('validates query strings declared with a DTO', async () => {
    const ok = await request(app.getHttpServer()).get('/api/v1/v/items?limit=10').expect(200);
    expect(ok.body).toEqual({ limit: 10 });

    const bad = await request(app.getHttpServer()).get('/api/v1/v/items?limit=99').expect(400);
    expect(details(bad.body).issues).toEqual([
      { path: ['limit'], code: 'too_big', origin: 'number', maximum: 50, inclusive: true },
    ]);
  });

  it('reports date bounds as epoch milliseconds with their origin', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/v/events')
      .send({ at: '2020-01-01T00:00:00Z', item: { title: 'x' } })
      .expect(400);

    expect(details(res.body).issues).toEqual([
      {
        path: ['at'],
        code: 'too_small',
        origin: 'date',
        minimum: Date.parse('2026-01-01T00:00:00Z'),
        inclusive: true,
      },
    ]);
  });

  it('keeps the issues of each union option, tagged with the option', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/v/events')
      .send({ at: '2026-06-01T00:00:00Z', item: { title: 1 } })
      .expect(400);

    expect(details(res.body).issues).toEqual([
      { path: ['item'], code: 'invalid_union' },
      { path: ['item', 'title'], code: 'invalid_type', expected: 'string', branch: 0 },
      { path: ['item', 'year'], code: 'invalid_type', expected: 'number', branch: 1 },
    ]);
  });

  it('does not require a DTO on custom param decorators', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/v/me').expect(200);

    expect(res.body).toEqual({ id: 'owner' });
  });

  it('answers a body in an unsupported content type with UNSUPPORTED_MEDIA_TYPE', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/v/profiles')
      .set('content-type', 'text/plain')
      .send('{"name":"x","years":1}')
      .expect(415);

    expect(ErrorEnvelope.parse(res.body).error.code).toBe('UNSUPPORTED_MEDIA_TYPE');
  });

  it('still answers a missing body as a validation error', async () => {
    const res = await request(app.getHttpServer()).post('/api/v1/v/profiles').expect(400);

    expect(details(res.body).issues).toEqual([
      { path: [], code: 'invalid_type', expected: 'object' },
    ]);
  });
});
