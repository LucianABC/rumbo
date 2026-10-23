import { expect, type Page, test } from '@playwright/test';

import { gotoRoadmapWithBand } from './summary-band.js';

/**
 * The Roadmap summary band and the mocked Change targets explainer (#112). Like the other roadmap
 * specs, nothing depends on mock content: locally the stack may serve the owner's mocks (#137).
 */

const SIZES = [
  ['narrow phone', { width: 360, height: 780 }],
  ['wide screen', { width: 1440, height: 900 }],
] as const;

const targets = (page: Page) =>
  page.getByRole('region', { name: 'Your targets' }).getByRole('listitem');
const changeTargets = (page: Page) => page.getByRole('button', { name: 'Change targets' });

for (const [size, viewport] of SIZES) {
  test.describe(`on a ${size}`, () => {
    test.use({ viewport });

    test('every target shows its coverage, linked to Skills & gaps', async ({ page }) => {
      await gotoRoadmapWithBand(page);

      const rows = targets(page);
      expect(await rows.count()).toBeGreaterThan(0);
      for (const row of await rows.all()) {
        // Coverage, or "see Skills & gaps" when the target has too little market data.
        await expect(row.getByRole('link')).toHaveAttribute('href', /^\/skills\?target=.+/);
        await expect(row).toContainText(/\d+\/\d+ top skills|Not enough market data/);
      }
      await expect(page.getByRole('link', { name: /open profile$/ })).toHaveAttribute(
        'href',
        '/profile',
      );
    });

    test('the page never scrolls sideways', async ({ page }) => {
      await page.goto('/roadmap');

      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow).toBeLessThanOrEqual(0);
    });

    test('Change targets opens a read-only preview and gives focus back', async ({ page }) => {
      await gotoRoadmapWithBand(page);

      await changeTargets(page).focus();
      await page.keyboard.press('Enter');
      const dialog = page.getByRole('dialog', { name: 'Change targets' });

      await expect(dialog).toBeVisible();
      await expect(dialog).toHaveAccessibleDescription(/Nothing here is edited or recalculated/);
      await expect(dialog.getByText(/^Preview/)).toBeVisible();
      await expect(dialog.getByText('Sample preview')).toBeVisible();
      // Read-only: the only control applies nothing.
      await expect(dialog.getByRole('button', { name: /apply|save|confirm/i })).toHaveCount(0);

      await page.keyboard.press('Escape');
      await expect(dialog).toBeHidden();
      await expect(changeTargets(page)).toBeFocused();
    });
  });
}
