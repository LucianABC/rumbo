import {
  type ArgumentMetadata,
  Injectable,
  type Paramtype,
  type PipeTransform,
} from '@nestjs/common';
import {
  type ValidationDetails,
  type ValidationIssue,
  ValidationIssueCode,
} from '@rumbo/contracts';
import { createZodValidationPipe } from 'nestjs-zod';
import { z } from 'zod';

import { ApiException } from '../errors/api-exception.js';

const STRING_KEYS = ['origin', 'expected', 'format'] as const;
const BOUND_KEYS = ['minimum', 'maximum'] as const;

type RawIssue = z.core.$ZodIssue;

/**
 * Copies only schema-derived fields of each Zod issue (ADR 0006, #24). The message, `input`,
 * `pattern`, `keys` and `values` are never read: messages can embed the input, and the rest is
 * either input or library internals. Anything but a ZodError is a bug and throws, so a change in
 * what nestjs-zod passes here surfaces as a 500 in tests instead of an empty 400.
 */
export function toValidationDetails(error: unknown): ValidationDetails {
  if (!(error instanceof z.core.$ZodError)) {
    throw new TypeError('Expected a ZodError from the validation pipe');
  }
  return { issues: error.issues.flatMap((issue) => toIssues(issue, [])) };
}

function toIssues(raw: RawIssue, prefix: PropertyKey[], branch?: number): ValidationIssue[] {
  const path = [...prefix, ...raw.path];
  const issue = toIssue(raw, path, branch);
  if (raw.code !== 'invalid_union') return [issue];
  // A plain union keeps each option's issues nested, with paths relative to the union; without
  // them the client only learns that the whole value failed (#24).
  const nested = raw.errors.flatMap((issues, index) =>
    issues.flatMap((inner) => toIssues(inner, path, index)),
  );
  return [issue, ...nested];
}

function toIssue(raw: RawIssue, path: PropertyKey[], branch: number | undefined): ValidationIssue {
  const source = raw as unknown as Record<string, unknown>;
  const issue: Record<string, unknown> = {
    path: path.map((key) => (typeof key === 'number' ? key : String(key))),
    // An unknown code (a Zod upgrade) throws here, so tests catch it before clients do (#24).
    code: ValidationIssueCode.parse(raw.code),
  };
  for (const key of STRING_KEYS) {
    if (typeof source[key] === 'string') issue[key] = source[key];
  }
  for (const key of BOUND_KEYS) {
    const bound = source[key];
    // JSON cannot serialize bigint (#24).
    if (typeof bound === 'number') issue[key] = bound;
    else if (typeof bound === 'bigint') issue[key] = bound.toString();
  }
  if (typeof source.inclusive === 'boolean') issue.inclusive = source.inclusive;
  if (branch !== undefined) issue.branch = branch;
  return issue as ValidationIssue;
}

const createValidationException = (error: unknown): Error =>
  new ApiException('BAD_REQUEST', 'Invalid request', toValidationDetails(error));

const StrictZodPipe = createZodValidationPipe({
  strictSchemaDeclaration: true,
  createValidationException,
});
const LenientZodPipe = createZodValidationPipe({ createValidationException });

/** Request input that must always be declared with a DTO (ADR 0006). */
const DECLARED_INPUT: ReadonlySet<Paramtype> = new Set(['body', 'query', 'param']);

/**
 * Global pipe (ADR 0006). Nest also runs global pipes on custom param decorators (a future
 * @CurrentUser()), uploaded files and cookies, which are not request input to describe with a
 * schema; strict mode there would answer every such request with 500 (#24). So @Body, @Query and
 * @Param must be DTOs, and anything else is validated only when it is typed with one.
 */
@Injectable()
export class ValidationPipe implements PipeTransform {
  private readonly strict = new StrictZodPipe();
  private readonly lenient = new LenientZodPipe();

  transform(value: unknown, metadata: ArgumentMetadata): unknown {
    const pipe = DECLARED_INPUT.has(metadata.type) ? this.strict : this.lenient;
    return pipe.transform(value, metadata) as unknown;
  }
}
