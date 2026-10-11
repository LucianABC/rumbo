/**
 * Errors are logged through safe fields only (#26): type, a short code and stack frames.
 * The message is dropped on purpose: any code can build it from job data or user input (a name, a
 * CV line), and no redaction pattern can recognize a name. For debugging, the type, code and frames
 * locate the failure; payload details belong in traces, which F1 exports with PII stripped.
 */

// Error codes are constants (ECONNREFUSED, P2002); anything longer or freer is not kept.
const SAFE_CODE = /^[A-Za-z0-9_.-]{1,64}$/;
const MAX_CAUSE_DEPTH = 3;

export interface SerializedError {
  readonly type: string;
  readonly code?: string | number;
  readonly stack?: string;
  readonly cause?: SerializedError;
}

export function serializeError(error: unknown, depth = 0): SerializedError {
  // pino-http always runs pino's standard err serializer first; its output keeps the original in `raw`.
  const raw = (error as { raw?: unknown } | null)?.raw;
  if (!(error instanceof Error) && raw instanceof Error) return serializeError(raw, depth);
  if (!(error instanceof Error)) return { type: typeof error };

  const code = (error as { code?: unknown }).code;
  const safeCode =
    typeof code === 'number' || (typeof code === 'string' && SAFE_CODE.test(code))
      ? code
      : undefined;
  const stack = stackFrames(error.stack);

  return {
    type: error.constructor.name || 'Error',
    ...(safeCode !== undefined ? { code: safeCode } : {}),
    ...(stack ? { stack } : {}),
    ...(error.cause instanceof Error && depth < MAX_CAUSE_DEPTH
      ? { cause: serializeError(error.cause, depth + 1) }
      : {}),
  };
}

/** Keeps only the "at …" lines: the first line of a stack repeats the message. */
function stackFrames(stack: string | undefined): string | undefined {
  const frames = stack
    ?.split('\n')
    .filter((line) => /^\s+at /.test(line))
    .map((line) => line.trim());
  return frames && frames.length > 0 ? frames.join('\n') : undefined;
}
