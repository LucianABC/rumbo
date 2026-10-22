import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { type Env, parseEnv } from '@rumbo/config';
import { z } from 'zod';

/**
 * Owner-only override of the bundled mocks (#137). JSON files in `LOCAL_MOCKS_DIR` (by convention
 * the gitignored `.local/mocks/` at the repo root) replace the fictional mocks on that machine only.
 * The repo is public and spec 01 keeps every committed mock fictional, so personal data lives only
 * there, and the folder goes away when the API serves real data.
 */

/** One file per mock, named after its file in `src/mocks/`. */
export type LocalMockName = 'roadmap' | 'roadmap-layout' | 'profile' | 'market';

const envSchema = z.object({ LOCAL_MOCKS_DIR: z.string().min(1).optional() });

/**
 * A local file found, with whatever it parsed to (`null` included), or none. Kept apart so a file
 * holding `null` fails validation instead of passing for a missing one (#137).
 */
export type LocalMock =
  { readonly found: true; readonly data: unknown } | { readonly found: false };

const NONE: LocalMock = { found: false };

/**
 * The parsed local file, or none when no override is configured or the file does not exist.
 * The caller validates it with the same schema as the bundled mock.
 */
export async function readLocalMock(
  name: LocalMockName,
  env: Env = process.env,
): Promise<LocalMock> {
  const dir = parseEnv(envSchema, env).LOCAL_MOCKS_DIR;
  if (dir === undefined) return NONE;

  let text: string;
  try {
    text = await readFile(path.resolve(dir, `${name}.json`), 'utf8');
  } catch (err) {
    if (isMissing(err)) return NONE;
    throw err;
  }

  try {
    return { found: true, data: JSON.parse(text) as unknown };
  } catch {
    // JSON.parse quotes the text around the error, which here is personal data: drop its message.
    throw new Error(`Invalid local mock ${name}.json: not valid JSON`);
  }
}

function isMissing(err: unknown): boolean {
  return err instanceof Error && 'code' in err && err.code === 'ENOENT';
}
