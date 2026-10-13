import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const root = fileURLToPath(new URL('../../..', import.meta.url));

/** Every workspace package under apps/ and packages/ that has a `test` script. */
function testedPackages(): string[] {
  return ['apps', 'packages'].flatMap((group) =>
    readdirSync(join(root, group), { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => join(group, entry.name))
      .filter((dir) => {
        const manifest = join(root, dir, 'package.json');
        if (!existsSync(manifest)) return false;
        const { scripts } = JSON.parse(readFileSync(manifest, 'utf8')) as {
          scripts?: Record<string, string>;
        };
        return scripts?.test !== undefined;
      }),
  );
}

/**
 * A package that adds tests without the shared coverage preset would run in CI with no threshold,
 * and nothing else would notice (#28).
 */
describe('coverage gate', () => {
  const packages = testedPackages();

  it('finds the workspace packages', () => {
    expect(packages).toContain(join('apps', 'api'));
    expect(packages).toContain(join('packages', 'vitest-config'));
  });

  it.each(packages)('%s runs its tests with coverage', (dir) => {
    const { scripts } = JSON.parse(readFileSync(join(root, dir, 'package.json'), 'utf8')) as {
      scripts: Record<string, string>;
    };

    expect(scripts.test).toMatch(/\bvitest run\b.*--coverage\b/);
  });

  it.each(packages)('%s takes its thresholds from the shared preset', (dir) => {
    const config = readFileSync(join(root, dir, 'vitest.config.ts'), 'utf8');

    expect(config).toMatch(/coverage: coverage\('(package|app)'/);
  });
});
