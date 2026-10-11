import { z } from 'zod';

export type Env = Readonly<Record<string, string | undefined>>;

/** Postgres connection string, as Prisma and pg-boss expect it. */
export const databaseUrl = () => z.url({ protocol: /^postgres(ql)?$/ });

/** http(s) base URL, e.g. where one service reaches another. */
export const httpUrl = () => z.url({ protocol: /^https?$/ });

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
    throw new Error(`Invalid environment configuration:\n${z.prettifyError(result.error)}`);
  }
  return result.data;
}
