import { expect, test } from '@playwright/test';

/**
 * The single-line roadmap (#108). Locally the stack may serve the owner's own mocks (#137), so
 * nothing here depends on mock content: only on the shape every roadmap has.
 */

test('every milestone is a station named with its status and targets', async ({ page }) => {
  await page.goto('/roadmap');

  const stations = page.getByRole('list', { name: 'Stations' }).getByRole('button');
  expect(await stations.count()).toBeGreaterThan(0);
  for (const name of await stations.evaluateAll((els) => els.map((el) => el.ariaLabel ?? ''))) {
    expect(name).toMatch(/^.+, (done|in progress|pending), serves .+/);
  }
  await expect(page.getByRole('button', { name: /, you are here$/ })).toHaveCount(1);
});

test('the "you are here" marker pulses', async ({ page }) => {
  await page.goto('/roadmap');

  const pulse = page.locator('.animate-here-pulse');
  await expect(pulse).toBeVisible();
  await expect(pulse).not.toHaveCSS('animation-name', 'none');
});

test.describe('with reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });

  test('the marker does not animate', async ({ page }) => {
    await page.goto('/roadmap');

    await expect(page.locator('.animate-here-pulse')).toBeHidden();
    await expect(page.getByText('You are here', { exact: true })).toBeVisible();
  });
});

test.describe('on a wide screen', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('the subway map is shown as decoration over the station list', async ({ page }) => {
    await page.goto('/roadmap');

    const map = page.getByTestId('subway-map');
    await expect(map).toBeVisible();
    await expect(map).toHaveAttribute('aria-hidden', 'true');
    await expect(page.getByRole('button', { name: /, you are here$/ })).toHaveCount(1);
  });
});

test.describe('on a wide screen with reduced motion', () => {
  test.use({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });

  test('the lines appear without drawing in', async ({ page }) => {
    await page.goto('/roadmap');

    const line = page.locator('[data-testid="subway-map"] path').first();
    await expect(line).toHaveCSS('stroke-dashoffset', '0px');
  });
});
