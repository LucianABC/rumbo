import * as dns from 'node:dns';
import { constants } from 'node:os';

/**
 * Error messages, stacks, arbitrary types and codes can contain user data (#26). Keep only values
 * from fixed lists; unknown values are omitted rather than guessed safe.
 */
const KNOWN_ERROR_TYPES: ReadonlySet<string> = new Set([
  'Error',
  'TypeError',
  'RangeError',
  'ReferenceError',
  'SyntaxError',
  'URIError',
  'EvalError',
  'AggregateError',
]);

const KNOWN_ERROR_CODES: ReadonlySet<string> = new Set([
  ...Object.keys(constants.errno),
  ...Object.values(dns as Record<string, unknown>).filter(
    (value): value is string => typeof value === 'string',
  ),
  'ERR_INVALID_ARG_TYPE',
  'P2002',
  '23505',
  '57P01',
]);
const MAX_CAUSE_DEPTH = 3;

export interface SerializedError {
  readonly type: string;
  readonly code?: string;
  readonly cause?: SerializedError;
}

export function serializeError(error: unknown, depth = 0): SerializedError {
  // pino-http's standard serializer leaves the original Error in `raw` (#26).
  const raw = (error as { raw?: unknown } | null)?.raw;
  if (!(error instanceof Error) && raw instanceof Error) return serializeError(raw, depth);
  if (!(error instanceof Error)) return errorLike(error) ?? { type: typeof error };

  const code = knownCode((error as { code?: unknown }).code);
  return {
    type: knownType(error.constructor.name),
    ...(code ? { code } : {}),
    ...(error.cause instanceof Error && depth < MAX_CAUSE_DEPTH
      ? { cause: serializeError(error.cause, depth + 1) }
      : {}),
  };
}

/** An Error, or a plain object copied from one (it carries a stack with "at" frames). */
export function isErrorLike(value: unknown): boolean {
  if (value instanceof Error) return true;
  if (typeof value !== 'object' || value === null) return false;
  const stack = (value as { stack?: unknown }).stack;
  return typeof stack === 'string' && /\n\s+at /.test(stack);
}

/** pg-boss may emit a plain object copied from an Error; its stack is used only to identify it. */
function errorLike(value: unknown): SerializedError | undefined {
  if (typeof value !== 'object' || value === null) return undefined;
  const { stack, code: rawCode } = value as { stack?: unknown; code?: unknown };
  if (typeof stack !== 'string') return undefined;

  const type = knownType(/^([A-Za-z_$][\w$]*)(?::|$)/.exec(stack)?.[1]);
  const code = knownCode(rawCode);
  return { type, ...(code ? { code } : {}) };
}

function knownType(type: string | undefined): string {
  return type && KNOWN_ERROR_TYPES.has(type) ? type : 'Error';
}

function knownCode(code: unknown): string | undefined {
  return typeof code === 'string' && KNOWN_ERROR_CODES.has(code) ? code : undefined;
}
