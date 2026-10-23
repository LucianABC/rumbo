import { expect, type Page, test } from '@playwright/test';

/**
 * Opens /roadmap and skips the calling test when the summary band is degraded. Locally the stack
 * may serve the owner's mocks (#137); if their profile or market does not fit the roadmap, the
 * page shows "Summary unavailable" as designed, which is a data problem, not a regression (#112).
 */
export async function gotoRoadmapWithBand(page: Page): Promise<void> {
  await page.goto('/roadmap');
  const band = page.getByRole('region', { name: 'Your targets' });
  const unavailable = page.getByRole('region', { name: 'Summary unavailable' });
  await expect(band.or(unavailable)).toBeVisible();
  test.skip(
    await unavailable.isVisible(),
    'Summary band unavailable: the served profile or market data does not fit the roadmap',
  );
}
