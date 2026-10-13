import { Controller, Get, type INestApplication } from '@nestjs/common';
import { ErrorCode, HealthReport } from '@rumbo/contracts';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { z } from 'zod';

import { captureLogs } from './log-capture.js';
import { createTestApp } from './test-app.js';

// Stands in for a future endpoint written without any OpenAPI decorators.
@Controller('plain')
class PlainTestController {
  @Get()
  get(): { ok: true } {
    return { ok: true };
  }
}

interface Schema {
  readonly $ref?: string;
  readonly type?: string;
  readonly enum?: unknown[];
  readonly required?: string[];
  readonly properties?: Record<string, Schema>;
  readonly anyOf?: Schema[];
}
interface Operation {
  readonly responses: Record<string, { content?: { 'application/json'?: { schema: Schema } } }>;
}
interface Document {
  readonly paths: Record<string, Record<string, Operation>>;
  readonly components: { schemas: Record<string, Schema> };
}

function responseRef(operation: Operation | undefined, status: string): string | undefined {
  return operation?.responses[status]?.content?.['application/json']?.schema.$ref;
}

// No database needed: these requests never reach a handler that queries it.
describe('OpenAPI docs', () => {
  let app: INestApplication<App>;
  let doc: Document;

  beforeAll(async () => {
    app = await createTestApp({ logs: captureLogs(), controllers: [PlainTestController] });
    await app.init();
    const res = await request(app.getHttpServer()).get('/api/docs/openapi.json').expect(200);
    doc = res.body as Document;
  });

  afterAll(async () => {
    await app.close();
  });

  it('documents healthz with the contract schema for both 200 and 503', () => {
    const healthz = doc.paths['/api/v1/healthz']?.get;

    expect(responseRef(healthz, '200')).toBe('#/components/schemas/HealthReportDto');
    expect(responseRef(healthz, '503')).toBe('#/components/schemas/HealthReportDto');
  });

  it('generates the health schema from the contract', () => {
    const generated = doc.components.schemas.HealthReportDto;
    const contract = z.toJSONSchema(HealthReport) as Schema;

    expect(Object.keys(generated?.properties ?? {}).sort()).toEqual(
      Object.keys(contract.properties ?? {}).sort(),
    );
    expect([...(generated?.required ?? [])].sort()).toEqual([...(contract.required ?? [])].sort());
    expect(generated?.properties?.status?.enum).toEqual(['ok', 'degraded']);
    expect(generated?.properties?.db?.enum).toEqual(['up', 'down']);
  });

  it('documents the error envelope as the default response of every operation', () => {
    const operations = Object.values(doc.paths).flatMap((item) => Object.values(item));

    expect(operations.length).toBeGreaterThanOrEqual(2);
    for (const operation of operations) {
      expect(responseRef(operation, 'default')).toBe('#/components/schemas/ErrorEnvelopeDto');
    }
    expect(doc.paths['/api/v1/plain']?.get).toBeDefined();
  });

  it('generates the error envelope schema from the contract', () => {
    const envelope = doc.components.schemas.ErrorEnvelopeDto;
    const error = envelope?.properties?.error;

    expect(error?.properties?.code?.enum).toEqual(ErrorCode.options);
    expect([...(error?.required ?? [])].sort()).toEqual(['code', 'message', 'requestId']);
  });

  it('serves Swagger UI at /api/docs', async () => {
    const res = await request(app.getHttpServer()).get('/api/docs').expect(200);

    expect(res.headers['content-type']).toMatch(/text\/html/);
    expect(res.text).toContain('swagger-ui');
  });
});
