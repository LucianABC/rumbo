/**
 * PII and secret redaction for logs (#26, CLAUDE.md AI rule 5).
 *
 * Two layers, because neither alone is enough:
 * - Keys: values under personal or secret keys (email, name, token, password…) are replaced whole.
 *   Names cannot be detected reliably in free text, so the rule is to log them only under such keys
 *   (or not at all).
 * - Patterns: emails, bearer tokens, JWTs, API keys and URL credentials are masked inside any
 *   string, including error messages and stacks.
 */

export const REDACTED = '[REDACTED]';

const SENSITIVE_KEYS = new Set([
  'password',
  'passwd',
  'secret',
  'token',
  'accesstoken',
  'refreshtoken',
  'idtoken',
  'apikey',
  'authorization',
  'cookie',
  'setcookie',
  'email',
  'name',
  'firstname',
  'lastname',
  'fullname',
  'displayname',
  'givenname',
  'familyname',
  'phone',
  'phonenumber',
  'address',
  'birthdate',
  'dateofbirth',
]);

const SENSITIVE_SUFFIXES = ['password', 'secret', 'token', 'apikey', 'email', 'cookie'];

function normalizeKey(key: string): string {
  return key.toLowerCase().replace(/[^a-z0-9]/g, '');
}

export function isSensitiveKey(key: string): boolean {
  const k = normalizeKey(key);
  return SENSITIVE_KEYS.has(k) || SENSITIVE_SUFFIXES.some((suffix) => k.endsWith(suffix));
}

const PATTERNS: readonly (readonly [RegExp, string])[] = [
  // scheme://user:password@host → keep scheme and host, drop the credentials.
  [/\b([a-z][a-z0-9+.-]*:\/\/)[^\s/:@]+:[^\s/@]+@/gi, `$1${REDACTED}@`],
  [/\bBearer\s+[A-Za-z0-9._~+/=-]+/gi, `Bearer ${REDACTED}`],
  // JWT: three base64url segments, the first one a JSON header.
  [/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, REDACTED],
  // Anthropic / OpenAI-style, GitHub and AWS access keys.
  [/\bsk-[A-Za-z0-9_-]{16,}/g, REDACTED],
  [/\b(?:gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,})/g, REDACTED],
  [/\bAKIA[0-9A-Z]{16}\b/g, REDACTED],
  [/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, '[EMAIL]'],
];

export function redactString(value: string): string {
  return PATTERNS.reduce((out, [pattern, replacement]) => out.replace(pattern, replacement), value);
}

const MAX_DEPTH = 8;

/** Returns a redacted deep copy; never mutates the input. Errors become plain objects. */
export function redact(value: unknown): unknown {
  return walk(value, 0, new WeakSet());
}

function walk(value: unknown, depth: number, seen: WeakSet<object>): unknown {
  if (typeof value === 'string') return redactString(value);
  if (value === null || typeof value !== 'object') return value;
  if (seen.has(value)) return '[Circular]';
  if (depth >= MAX_DEPTH) return '[Truncated]';
  seen.add(value);

  if (Array.isArray(value)) return value.map((item) => walk(item, depth + 1, seen));
  if (value instanceof Date) return value;

  // An error's name ("TypeError") is not personal data, so it moves to `type`, out of the `name` key rule.
  const source: Record<string, unknown> =
    value instanceof Error
      ? {
          ...(value as unknown as Record<string, unknown>),
          type: value.name,
          message: value.message,
          stack: value.stack,
        }
      : (value as Record<string, unknown>);

  const out: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(source)) {
    out[key] = isSensitiveKey(key) && item !== undefined ? REDACTED : walk(item, depth + 1, seen);
  }
  return out;
}
