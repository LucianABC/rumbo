import type { ViteUserConfig } from 'vitest/config';

type CoverageOptions = NonNullable<NonNullable<ViteUserConfig['test']>['coverage']>;

/** Line thresholds per kind of workspace package (#28). */
export const LINE_THRESHOLDS = { package: 80, app: 70 } as const;

export interface Exclusion {
  readonly glob: string;
  /** Why this code is not measured; kept next to the glob so every exclusion is justified. */
  readonly reason: string;
}

/**
 * Coverage settings shared by every workspace package (#28). Collection is turned on by
 * `vitest run --coverage` in each package's `test` script, not here, so a focused run of one file
 * is not measured against the whole package.
 */
export function coverage(
  kind: keyof typeof LINE_THRESHOLDS,
  exclude: readonly Exclusion[] = [],
): CoverageOptions {
  return {
    provider: 'v8',
    include: ['src/**'],
    exclude: exclude.map((item) => item.glob),
    thresholds: { lines: LINE_THRESHOLDS[kind] },
    reporter: ['text-summary'],
  };
}
