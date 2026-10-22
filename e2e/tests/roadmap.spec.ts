import { expect, type Page, test } from '@playwright/test';

/**
 * The roadmap: single line (#108) and subway map (#117). Locally the stack may serve the owner's
 * own mocks (#137), so nothing here depends on mock content: only on the shape every roadmap has.
 *
 * The map and the list each draw a "you are here" pulse, and both are always in the DOM (CSS shows
 * one per breakpoint), so every pulse locator is scoped to the map or to the list.
 */

const PHONE = { width: 375, height: 812 };
const WIDE = { width: 1440, height: 900 };

const listPulse = (page: Page) =>
  page.getByRole('list', { name: 'Stations' }).locator('.animate-here-pulse');
const mapPulse = (page: Page) => page.getByTestId('subway-map').locator('.animate-here-pulse');

test('every milestone is a station named with its status and targets', async ({ page }) => {
  await page.goto('/roadmap');

  const stations = page.getByRole('list', { name: 'Stations' }).getByRole('button');
  expect(await stations.count()).toBeGreaterThan(0);
  for (const name of await stations.evaluateAll((els) => els.map((el) => el.ariaLabel ?? ''))) {
    expect(name).toMatch(/^.+, (done|in progress|pending), serves .+/);
  }
  await expect(page.getByRole('button', { name: /, you are here$/ })).toHaveCount(1);
});

test.describe('on a phone', () => {
  test.use({ viewport: PHONE });

  test('the list shows the "you are here" pulse and no map', async ({ page }) => {
    await page.goto('/roadmap');

    await expect(listPulse(page)).toBeVisible();
    await expect(listPulse(page)).not.toHaveCSS('animation-name', 'none');
    await expect(page.getByTestId('subway-map')).toBeHidden();
  });
});

test.describe('on a phone with reduced motion', () => {
  test.use({ viewport: PHONE, reducedMotion: 'reduce' });

  test('the marker does not animate', async ({ page }) => {
    await page.goto('/roadmap');

    await expect(listPulse(page)).toBeHidden();
    await expect(page.getByText('You are here', { exact: true })).toBeVisible();
  });
});

test.describe('on a wide screen', () => {
  test.use({ viewport: WIDE });

  test('the subway map is shown as decoration over the station list', async ({ page }) => {
    await page.goto('/roadmap');

    const map = page.getByTestId('subway-map');
    await expect(map).toBeVisible();
    await expect(map).toHaveAttribute('aria-hidden', 'true');
    await expect(page.getByRole('button', { name: /, you are here$/ })).toHaveCount(1);
  });

  test('the map, not the list, shows the "you are here" pulse', async ({ page }) => {
    await page.goto('/roadmap');

    await expect(mapPulse(page)).toBeVisible();
    await expect(mapPulse(page)).not.toHaveCSS('animation-name', 'none');
    await expect(listPulse(page)).toBeHidden();
  });
});

test.describe('on a wide screen with reduced motion', () => {
  test.use({ viewport: WIDE, reducedMotion: 'reduce' });

  test('lines appear without drawing in and the marker does not animate', async ({ page }) => {
    await page.goto('/roadmap');

    const line = page.getByTestId('subway-map').locator('path').first();
    await expect(line).toHaveCSS('stroke-dashoffset', '0px');
    await expect(mapPulse(page)).toBeHidden();
  });
});
