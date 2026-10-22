import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { getRoadmap, getRoadmapLayout } from '../src/lib/data';
import { readLocalMock } from '../src/lib/data/local-mocks';
import { roadmap as bundled } from '../src/mocks/roadmap';

vi.mock('next/server', () => ({ connection: () => Promise.resolve() }));

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(path.join(tmpdir(), 'rumbo-local-mocks-'));
  vi.stubEnv('LOCAL_MOCKS_DIR', dir);
});

afterEach(async () => {
  vi.unstubAllEnvs();
  await rm(dir, { recursive: true, force: true });
});

async function write(name: string, content: unknown): Promise<void> {
  const text = typeof content === 'string' ? content : JSON.stringify(content);
  await writeFile(path.join(dir, name), text, 'utf8');
}

describe('local mocks (#137)', () => {
  it('serves the bundled fictional mocks when no override is configured', async () => {
    vi.stubEnv('LOCAL_MOCKS_DIR', undefined);
    await write('roadmap.json', { ...bundled, from: 'Local role' });

    expect((await getRoadmap()).from).toBe(bundled.from);
  });

  it('serves the bundled mocks when the folder has no file for them', async () => {
    const roadmap = await getRoadmap();

    expect(roadmap.from).toBe(bundled.from);
    expect(await getRoadmapLayout(roadmap)).not.toBeNull();
  });

  it('replaces only the mock that has a local file', async () => {
    await write('roadmap.json', { ...bundled, from: 'Local role' });

    const roadmap = await getRoadmap();

    expect(roadmap.from).toBe('Local role');
    // Same plan, so the bundled layout still fits it.
    expect(await getRoadmapLayout(roadmap)).not.toBeNull();
  });

  it('validates a local file like the bundled mock', async () => {
    await write('roadmap.json', { ...bundled, targets: [] });

    await expect(getRoadmap()).rejects.toThrow(/Invalid roadmap:\ntargets: /);
  });

  it('fails on a local file holding null instead of falling back to the fictional user', async () => {
    await write('roadmap.json', 'null');

    await expect(getRoadmap()).rejects.toThrow(/Invalid roadmap:/);
  });

  it('degrades to no layout when the local layout is null, not to the bundled one', async () => {
    await write('roadmap-layout.json', 'null');

    expect(await getRoadmapLayout(await getRoadmap())).toBeNull();
  });

  it('degrades to no layout when the local layout is malformed', async () => {
    await write('roadmap-layout.json', { lines: 'not an array' });

    expect(await getRoadmapLayout(await getRoadmap())).toBeNull();
  });

  it('rejects malformed JSON without echoing its content', async () => {
    await write('roadmap.json', '{ "from": "Jane Doe, private detail"');

    const error = await getRoadmap().catch((err: unknown) => err);

    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toBe('Invalid local mock roadmap.json: not valid JSON');
  });

  it('resolves a relative folder from the working directory', async () => {
    await write('roadmap.json', { from: 'x' });

    const relative = path.relative(process.cwd(), dir);

    expect(await readLocalMock('roadmap', { LOCAL_MOCKS_DIR: relative })).toEqual({
      found: true,
      data: { from: 'x' },
    });
  });

  it('surfaces read errors other than a missing file', async () => {
    // A directory where the file should be: EISDIR on every platform.
    await rm(dir, { recursive: true, force: true });
    await mkdir(path.join(dir, 'roadmap.json'), { recursive: true });

    await expect(readLocalMock('roadmap', { LOCAL_MOCKS_DIR: dir })).rejects.toThrow();
  });
});
