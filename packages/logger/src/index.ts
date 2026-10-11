import { type DestinationStream, type LogFn, type Logger, pino } from 'pino';

import { serializeError } from './errors.js';
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
 * - Errors under `err` keep only safe fields (see errors.ts), never their message.
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
      formatters: { level: (label) => ({ level: label }) },
      serializers: { err: serializeError },
      hooks: { logMethod: errorTypeAsDefaultMessage, streamWrite: redactLine },
    },
    destination,
  );
}

/**
 * Without a message, pino copies `err.message` into `msg`, bypassing the err serializer. That is how
 * `logger.error(err)` and Nest's unhandled-exception logs call it, so the error's type is used instead.
 */
function errorTypeAsDefaultMessage(this: Logger, args: Parameters<LogFn>, method: LogFn): void {
  const [first, ...rest] = args as unknown[];
  const err = first instanceof Error ? first : errorUnder(first);
  if (err && typeof rest[0] !== 'string') {
    const merged = first instanceof Error ? { err: first } : first;
    method.apply(this, [merged, serializeError(err).type, ...rest] as Parameters<LogFn>);
    return;
  }
  method.apply(this, args);
}

function errorUnder(value: unknown): Error | undefined {
  if (typeof value !== 'object' || value === null) return undefined;
  const err = (value as { err?: unknown }).err;
  return err instanceof Error ? err : undefined;
}

export function redactLine(line: string): string {
  const newline = line.endsWith('\n') ? '\n' : '';
  try {
    return JSON.stringify(redact(JSON.parse(line))) + newline;
  } catch {
    return redactString(line);
  }
}
