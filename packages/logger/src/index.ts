import { type DestinationStream, type Logger, pino } from 'pino';

import { redact, redactString } from './redact.js';

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
 * Redaction runs on the final JSON, just before it is written: that single point sees messages,
 * child bindings, errors and serializer output alike, so nothing reaches stdout unredacted.
 * Earlier pino hooks each miss something (formatters skip bindings and run before serializers).
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
      hooks: { streamWrite: redactLine },
    },
    destination,
  );
}

export function redactLine(line: string): string {
  const newline = line.endsWith('\n') ? '\n' : '';
  try {
    return JSON.stringify(redact(JSON.parse(line))) + newline;
  } catch {
    return redactString(line);
  }
}
