import { expect, type Page } from '@playwright/test';

/**
 * Opens /roadmap with a line chosen, so the station list shows at every size. On desktop with a
 * map the list waits until the user picks a line (#148); phones show the primary's meanwhile.
 * Picks the first line, the primary, through the switcher like a user would.
 */
export async function openRoadmap(page: Page): Promise<void> {
  await page.goto('/roadmap');
  const switcher = page.getByRole('group', { name: 'Show line' });
  await expect(switcher).toBeVisible();
  if ((await switcher.locator('[aria-current="true"]').count()) === 0) {
    await switcher.getByRole('link').first().click();
    await expect(page).toHaveURL(/[?&]line=/);
  }
  await expect(page.getByRole('list', { name: 'Stations' })).toBeVisible();
}
