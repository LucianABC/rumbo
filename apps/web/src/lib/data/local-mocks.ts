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
export type LocalMockName = 'roadmap' | 'roadmap-layout';

const envSchema = z.object({ LOCAL_MOCKS_DIR: z.string().min(1).optional() });

/**
 * The parsed local file, or undefined when no override is configured or the file does not exist.
 * The caller validates it with the same schema as the bundled mock.
 */
export async function readLocalMock(name: LocalMockName, env: Env = process.env): Promise<unknown> {
  const dir = parseEnv(envSchema, env).LOCAL_MOCKS_DIR;
  if (dir === undefined) return undefined;

  let text: string;
  try {
    text = await readFile(path.resolve(dir, `${name}.json`), 'utf8');
  } catch (err) {
    if (isMissing(err)) return undefined;
    throw err;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    // JSON.parse quotes the text around the error, which here is personal data: drop its message.
    throw new Error(`Invalid local mock ${name}.json: not valid JSON`);
  }
}

function isMissing(err: unknown): boolean {
  return err instanceof Error && 'code' in err && err.code === 'ENOENT';
}
