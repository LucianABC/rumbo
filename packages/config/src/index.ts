import { z } from 'zod';

export type Env = Readonly<Record<string, string | undefined>>;

export const databaseUrl = () => z.url({ protocol: /^postgres(ql)?$/ });

export const httpUrl = () => z.url({ protocol: /^https?$/ });

/**
 * An http(s) origin, normalized the way browsers send it in the Origin header: lowercase host,
 * default port and trailing slash dropped, IDN hosts in punycode (#22). Only a path, query or
 * fragment is rejected, since those are never part of an origin.
 */
export const httpOrigin = () =>
  httpUrl()
    // Zod runs refinements even after httpUrl() failed, so unparsable values must not reach new URL() (#22).
    .refine((value) => !URL.canParse(value) || isBareOrigin(new URL(value)), {
      params: { reason: 'not_an_origin' },
    })
    .transform((value) => new URL(value).origin);

function isBareOrigin(url: URL): boolean {
  return url.pathname === '/' && url.search === '' && url.hash === '' && url.username === '';
}

/**
 * Validates environment variables against a Zod schema at boot (#21).
 *
 * - Empty values count as unset, so `FOO=` in a .env file falls back to the default.
 * - On failure it throws listing every invalid variable by name and problem, never the value:
 *   DATABASE_URL and future API keys carry secrets, and boot errors end up in container logs.
 */
export function parseEnv<T extends z.ZodType>(schema: T, env: Env = process.env): z.output<T> {
  const present = Object.fromEntries(Object.entries(env).filter(([, value]) => value !== ''));
  const result = schema.safeParse(present);
  if (!result.success) {
    const lines = result.error.issues.map(
      (issue) =>
        `- ${issue.path.join('.')}: ${String(issue.path[0]) in present ? describe(issue) : 'missing'}`,
    );
    throw new Error(`Invalid environment configuration:\n${lines.join('\n')}`);
  }
  return result.data;
}

// Built from issue metadata only, never issue.message: custom messages may interpolate the input (#21).
function describe(issue: z.core.$ZodIssue): string {
  switch (issue.code) {
    case 'invalid_type':
      return `expected ${issue.expected}`;
    case 'invalid_format':
      return `invalid ${issue.format}`;
    case 'too_small':
    case 'too_big':
      return 'out of range';
    default:
      return issue.code.replaceAll('_', ' ');
  }
}
