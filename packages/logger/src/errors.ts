import * as dns from 'node:dns';
import { constants } from 'node:os';

/**
 * Errors are logged through safe fields only (#26): type, a known code and stack frames with
 * relative paths. Everything else is dropped on purpose:
 * - the message: any code can build it from job data or user input (a name, a CV line), and no
 *   redaction pattern can recognize a name;
 * - other properties: errors often carry the request or job payload;
 * - absolute paths: on a developer machine they include the OS user name.
 * For debugging, type, code and frames locate the failure; payload details belong in traces,
 * which F1 exports with PII stripped.
 */

// Only codes with a known shape are kept (#26): a free-form code could be anything, even a name.
const SYSTEM_ERROR_CODES: ReadonlySet<string> = new Set([
  ...Object.keys(constants.errno), // ECONNREFUSED, ETIMEDOUT…
  // DNS errors (ENOTFOUND…) are not errno codes; node:dns exports them as string constants (#26).
  ...Object.values(dns as Record<string, unknown>).filter(
    (value): value is string => typeof value === 'string',
  ),
]);
const KNOWN_CODE_SHAPES = [
  /^ERR_[A-Z0-9_]+$/, // Node.js internal errors
  /^P\d{4}$/, // Prisma
  /^\d{2}[0-9A-Z]{3}$/, // Postgres SQLSTATE
];
const MAX_CAUSE_DEPTH = 3;

export interface SerializedError {
  readonly type: string;
  readonly code?: string | number;
  readonly stack?: string;
  readonly cause?: SerializedError;
}

export function serializeError(error: unknown, depth = 0): SerializedError {
  // pino-http always runs pino's standard err serializer first; its output keeps the original in
  // `raw` (#26).
  const raw = (error as { raw?: unknown } | null)?.raw;
  if (!(error instanceof Error) && raw instanceof Error) return serializeError(raw, depth);
  if (!(error instanceof Error)) return errorLike(error) ?? { type: typeof error };

  const code = knownCode((error as { code?: unknown }).code);
  const stack = stackFrames(error.stack);

  return {
    type: error.constructor.name || 'Error',
    ...(code !== undefined ? { code } : {}),
    ...(stack ? { stack } : {}),
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

/**
 * Plain objects copied from an error, e.g. pg-boss emits `{ ...error, message, stack, queue }` for
 * worker failures (#26). Same safe fields; the type comes from the stack's first line
 * ("TypeError: …") only when it is a plain identifier.
 */
function errorLike(value: unknown): SerializedError | undefined {
  if (typeof value !== 'object' || value === null) return undefined;
  const { stack: rawStack, code: rawCode } = value as { stack?: unknown; code?: unknown };
  if (typeof rawStack !== 'string') return undefined;

  const type = /^([A-Za-z_$][\w$]*)(?::|$)/.exec(rawStack)?.[1] ?? 'Error';
  const code = knownCode(rawCode);
  const stack = stackFrames(rawStack);
  return {
    type,
    ...(code !== undefined ? { code } : {}),
    ...(stack ? { stack } : {}),
  };
}

function knownCode(code: unknown): string | number | undefined {
  if (typeof code === 'number' && Number.isFinite(code)) return code;
  if (typeof code !== 'string') return undefined;
  return SYSTEM_ERROR_CODES.has(code) || KNOWN_CODE_SHAPES.some((shape) => shape.test(code))
    ? code
    : undefined;
}

/** Keeps only the "at …" lines (the first line repeats the message), with paths made relative. */
function stackFrames(stack: string | undefined): string | undefined {
  const frames = stack
    ?.split('\n')
    .filter((line) => /^\s+at /.test(line))
    .map((line) =>
      line
        .trim()
        .replace(LOCATION, (_match, path: string, position: string) => shortPath(path) + position),
    );
  return frames && frames.length > 0 ? frames.join('\n') : undefined;
}

// A frame location: an absolute path (POSIX, Windows or file:// URL) followed by :line:column.
// Node's own frames (node:internal/…) carry no user path and are left alone (#26).
const LOCATION = /(?<![\w.:])((?:file:\/\/\/?)?(?:[A-Za-z]:)?[\\/][^\s()]*?)(:\d+:\d+)(?=\)|$)/g;

/**
 * Dependencies keep their package path (`node_modules/pg-pool/index.js`), our own files the path
 * relative to the working directory, and anything else only its file name.
 */
export function shortPath(path: string): string {
  const normalized = path
    .replace(/^file:\/\//, '')
    .replace(/\\/g, '/')
    .replace(/^\/([A-Za-z]:)/, '$1');
  const inModules = normalized.lastIndexOf('node_modules/');
  if (inModules !== -1) return normalized.slice(inModules);

  const root = `${process.cwd().replace(/\\/g, '/')}/`;
  if (normalized.toLowerCase().startsWith(root.toLowerCase())) return normalized.slice(root.length);
  return normalized.slice(normalized.lastIndexOf('/') + 1);
}
