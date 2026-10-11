import { type DestinationStream, type LogFn, type Logger, pino } from 'pino';

import { isErrorLike, serializeError } from './errors.js';
import { redact, redactString } from './redact.js';

export { type SerializedError, serializeError } from './errors.js';
export { isSensitiveKey, redact, REDACTED, redactString } from './redact.js';
export type { Logger } from 'pino';

export const LOG_LEVELS = ['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'] as const;
export type LogLevel = (typeof LOG_LEVELS)[number];

export interface CreateLoggerOptions {
  /** Which process wrote the line: api, worker… */
  readonly service: string;
  readonly level?: LogLevel;
  /** Defaults to stdout; tests pass a stream to read the output. */
  readonly destination?: DestinationStream;
}

/**
 * JSON logger with PII redaction applied to every line (#26).
 *
 * - Errors, under any key and at any depth, keep only safe fields (errors.ts), never their message
 *   or payload.
 * - Redaction runs on the final JSON, just before it is written: that single point sees messages,
 *   child bindings and serializer output alike. Earlier pino hooks each miss something
 *   (formatters skip bindings and run before serializers).
 */
export function createLogger({
  service,
  level = 'info',
  destination,
}: CreateLoggerOptions): Logger {
  return pino(
    {
      level,
      base: { service },
      timestamp: pino.stdTimeFunctions.isoTime,
      formatters: { level: (label) => ({ level: label }), log: errorsToSafeFields },
      serializers: { err: serializeError },
      hooks: { logMethod: errorTypeAsDefaultMessage, streamWrite: redactLine },
    },
    destination,
  );
}

/**
 * Without a message, pino copies `err.message` into `msg`, bypassing the err serializer. That is how
 * `logger.error(err)` and Nest's unhandled-exception logs call it, so the error's type is used instead.
 * Errors logged directly, including plain copies of one (pg-boss emits those), are moved under `err`
 * so their fields go through the err serializer instead of becoming the log line itself (#26).
 */
function errorTypeAsDefaultMessage(this: Logger, args: Parameters<LogFn>, method: LogFn): void {
  const [first, ...rest] = args as unknown[];
  const direct = isErrorLike(first);
  const err = direct ? first : errorUnder(first);
  if (err === undefined) {
    method.apply(this, args);
    return;
  }
  const merged = direct ? { err: first } : first;
  const message = typeof rest[0] === 'string' ? rest : [serializeError(err).type, ...rest];
  method.apply(this, [merged, ...message] as Parameters<LogFn>);
}

// pino copies `err.message` for any object with one, not only Errors (e.g. an error that went
// through JSON), so any such object counts here (#26).
function errorUnder(value: unknown): unknown {
  if (typeof value !== 'object' || value === null) return undefined;
  const err = (value as { err?: unknown }).err;
  const hasMessage = typeof err === 'object' && err !== null && 'message' in err;
  return isErrorLike(err) || hasMessage ? err : undefined;
}

const MAX_DEPTH = 8;

/**
 * Replaces errors anywhere in the log object (`{ error }`, `{ job: { lastError } }`) with their safe
 * fields before serialization: JSON.stringify would otherwise dump their enumerable properties,
 * where payloads live (#26). Only plain objects and arrays are walked; pino-http's raw req/res and
 * other class instances are left to their serializers. Top-level `err` is left to the err serializer.
 */
function errorsToSafeFields(object: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(object)) {
    out[key] = key === 'err' ? value : replaceErrors(value, 0, new WeakSet());
  }
  return out;
}

function replaceErrors(value: unknown, depth: number, seen: WeakSet<object>): unknown {
  if (isErrorLike(value)) return serializeError(value);
  if (typeof value !== 'object' || value === null || depth >= MAX_DEPTH || seen.has(value)) {
    return value;
  }
  seen.add(value);
  if (Array.isArray(value)) return value.map((item) => replaceErrors(item, depth + 1, seen));
  const proto: unknown = Object.getPrototypeOf(value);
  if (proto !== Object.prototype && proto !== null) return value;
  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [key, replaceErrors(item, depth + 1, seen)]),
  );
}

export function redactLine(line: string): string {
  const newline = line.endsWith('\n') ? '\n' : '';
  try {
    return JSON.stringify(redact(errorFieldsUnderErr(JSON.parse(line) as unknown))) + newline;
  } catch {
    return redactString(line);
  }
}

/**
 * A line whose own fields look like an error (an error's fields spread into the log object) would
 * be reduced whole by redact(), losing level, time and msg. Its error fields move under `err`
 * instead, as safe fields, and the rest of the line is kept (#26).
 */
function errorFieldsUnderErr(line: unknown): unknown {
  if (!isErrorLike(line)) return line;
  const { message: _message, stack, code, ...rest } = line as Record<string, unknown>;
  return { ...rest, err: rest.err ?? serializeError({ stack, code }) };
}
