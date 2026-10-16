import { readFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';

import tailwind from '@tailwindcss/postcss';
import postcss, { type AcceptedPlugin } from 'postcss';
import { describe, expect, it } from 'vitest';

// The build passes even when Tailwind is not processed (Next imports its CSS raw), so this is the
// only check that the pipeline works (#104).
const globalsPath = fileURLToPath(new URL('../src/app/globals.css', import.meta.url));
const configUrl = pathToFileURL(fileURLToPath(new URL('../postcss.config.mjs', import.meta.url)));

describe('Tailwind pipeline', () => {
  it('the PostCSS config runs Tailwind', async () => {
    const config = (await import(configUrl.href)) as { default: { plugins: object } };

    expect(Object.keys(config.default.plugins)).toEqual(['@tailwindcss/postcss']);
  });

  it('compiles globals.css into real CSS', async () => {
    // @tailwindcss/postcss ships its own copy of the postcss types; the plugin is the same at runtime.
    const plugin = tailwind() as unknown as AcceptedPlugin;
    const result = await postcss([plugin]).process(readFileSync(globalsPath, 'utf8'), {
      from: globalsPath,
    });

    expect(result.css).toContain('box-sizing: border-box');
    expect(result.css).not.toContain('@theme');
    expect(result.css).not.toMatch(/@import\s+['"]tailwindcss['"]/);
  });
});
