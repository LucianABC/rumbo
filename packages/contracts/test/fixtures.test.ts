import { describe, expect, it } from 'vitest';
import type { z } from 'zod';

import degraded from '../fixtures/health.degraded.json' with { type: 'json' };
import ok from '../fixtures/health.ok.json' with { type: 'json' };
import notFound from '../fixtures/error.not-found.json' with { type: 'json' };
import validation from '../fixtures/error.validation.json' with { type: 'json' };
import { ErrorEnvelope, HealthReport, ValidationDetails } from '../src/index.js';

/**
 * Payloads clients already receive must keep parsing: a schema change that rejects one is a
 * breaking change and fails here (#27).
 */
const cases: [string, z.ZodType, unknown][] = [
  ['health.ok', HealthReport, ok],
  ['health.degraded', HealthReport, degraded],
  ['error.not-found', ErrorEnvelope, notFound],
  ['error.validation', ErrorEnvelope, validation],
  ['error.validation details', ValidationDetails, validation.error.details],
];

describe('recorded payloads', () => {
  it.each(cases)('%s still parses with its schema', (_name, schema, payload) => {
    const result = schema.safeParse(payload);

    expect(result.error?.issues).toBeUndefined();
  });
});
