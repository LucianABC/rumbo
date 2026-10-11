import { type Env, httpUrl, parseEnv } from '@rumbo/config';
import { z } from 'zod';

const envSchema = z.object({ API_INTERNAL_URL: httpUrl() });

let cached: URL | undefined;

/**
 * Read at runtime, not at build time, so one image runs in every environment (#15).
 * Validated once and cached: the proxy and the status page call this on every request (#21).
 */
export function getApiInternalUrl(env: Env = process.env): URL {
  if (env !== process.env) return parse(env);
  cached ??= parse(env);
  return cached;
}

function parse(env: Env): URL {
  return new URL(parseEnv(envSchema, env).API_INTERNAL_URL);
}
