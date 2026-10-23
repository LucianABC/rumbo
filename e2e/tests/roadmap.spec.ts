import { expect, type Locator, type Page, test } from '@playwright/test';

import { openRoadmap } from './roadmap-line.js';

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
  await openRoadmap(page);

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
    await openRoadmap(page);

    await expect(listPulse(page)).toBeVisible();
    await expect(listPulse(page)).not.toHaveCSS('animation-name', 'none');
    await expect(page.getByTestId('subway-map')).toBeHidden();
  });
});

test.describe('on a phone with reduced motion', () => {
  test.use({ viewport: PHONE, reducedMotion: 'reduce' });

  test('the marker does not animate', async ({ page }) => {
    await openRoadmap(page);

    await expect(listPulse(page)).toBeHidden();
    await expect(page.getByText('You are here', { exact: true })).toBeVisible();
  });
});

test.describe('on a wide screen', () => {
  test.use({ viewport: WIDE });

  test('the subway map is shown as decoration over the station list', async ({ page }) => {
    await openRoadmap(page);

    const map = page.getByTestId('subway-map');
    await expect(map).toBeVisible();
    await expect(map).toHaveAttribute('aria-hidden', 'true');
    await expect(page.getByRole('button', { name: /, you are here$/ })).toHaveCount(1);
  });

  test('the map, not the list, shows the "you are here" pulse', async ({ page }) => {
    await openRoadmap(page);

    await expect(mapPulse(page)).toBeVisible();
    await expect(mapPulse(page)).not.toHaveCSS('animation-name', 'none');
    await expect(listPulse(page)).toBeHidden();
  });
});

test.describe('on a wide screen with reduced motion', () => {
  test.use({ viewport: WIDE, reducedMotion: 'reduce' });

  test('lines appear without drawing in and the marker does not animate', async ({ page }) => {
    await openRoadmap(page);

    const line = page.getByTestId('subway-map').locator('path').first();
    await expect(line).toHaveCSS('stroke-dashoffset', '0px');
    await expect(mapPulse(page)).toBeHidden();
  });
});

const here = (page: Page) => page.getByRole('button', { name: /, you are here$/ });

for (const [name, viewport] of [
  ['side sheet on a wide screen', WIDE],
  ['bottom sheet on a phone', PHONE],
] as const) {
  test.describe(`station panel as a ${name}`, () => {
    test.use({ viewport });

    test('is a dialog named after its station and described by its targets', async ({ page }) => {
      await openRoadmap(page);
      const name = (await here(page).getAttribute('aria-label')) ?? '';
      const title = name.split(', ')[0] ?? '';
      const serves = /serves (.+?)(, you are here)?$/.exec(name)?.[1] ?? '';

      await here(page).click();
      const dialog = page.getByRole('dialog', { name: title });

      await expect(dialog).toBeVisible();
      await expect(dialog).toHaveAccessibleDescription(`Moves you toward ${serves}`);
      await expect(dialog.getByRole('heading', { level: 2, name: title })).toBeVisible();
    });

    test('opens from the keyboard, closes with Esc and gives focus back', async ({ page }) => {
      await openRoadmap(page);

      await here(page).focus();
      await page.keyboard.press('Enter');
      const dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible();
      await expect(dialog.getByRole('heading').first()).toBeVisible();
      await expect(dialog.getByText('What closes it')).toBeVisible();

      await page.keyboard.press('Escape');
      await expect(dialog).toBeHidden();
      await expect(here(page)).toBeFocused();
    });

    test('shows the station that opened it, also after closing another', async ({ page }) => {
      await openRoadmap(page);
      const stations = page.getByRole('list', { name: 'Stations' }).getByRole('button');
      const title = async (i: number) =>
        ((await stations.nth(i).getAttribute('aria-label')) ?? '').split(', ')[0] ?? '';

      for (const i of [0, 1]) {
        // Read the name first: an open modal hides the rest of the page from the a11y tree.
        const expected = await title(i);
        await stations.nth(i).click();
        await expect(page.getByRole('dialog')).toContainText(expected);
        await page.keyboard.press('Escape');
        await expect(page.getByRole('dialog')).toBeHidden();
      }
    });

    test('closes from its close button', async ({ page }) => {
      await openRoadmap(page);

      await here(page).click();
      await page.getByRole('dialog').getByRole('button', { name: 'Close' }).click();

      await expect(page.getByRole('dialog')).toBeHidden();
      await expect(here(page)).toBeFocused();
    });
  });
}

test.describe('line switcher (#148)', () => {
  const switcher = (page: Page) => page.getByRole('group', { name: 'Show line' });
  const terminal = (page: Page) =>
    page.getByRole('list', { name: 'Stations' }).locator('[data-kind="terminal"]');
  /** A switcher link's target name, without its "(primary)" note. */
  const nameOf = async (link: Locator) =>
    ((await link.textContent()) ?? '').replace('(primary)', '').trim();

  test.describe('on a phone', () => {
    test.use({ viewport: PHONE });

    test("shows the primary's line until another is chosen", async ({ page }) => {
      await page.goto('/roadmap');
      const links = switcher(page).getByRole('link');
      const selected = switcher(page).locator('[aria-current="true"]');

      await expect(selected).toHaveCount(1);
      await expect(selected).toContainText('(primary)');
      await expect(terminal(page)).toHaveCount(1);
      await expect(terminal(page)).toContainText(await nameOf(selected));

      test.skip((await links.count()) < 2, 'The served roadmap has a single target');
      const other = links.nth(1);
      const name = await nameOf(other);
      await other.click();

      await expect(page).toHaveURL(/[?&]line=/);
      await expect(other).toHaveAttribute('aria-current', 'true');
      await expect(terminal(page)).toContainText(name);
      await expect(page.getByRole('button', { name: /, you are here$/ })).toHaveCount(1);

      // The choice survives a reload.
      await page.reload();
      await expect(terminal(page)).toContainText(name);
    });
  });

  test.describe('on a wide screen', () => {
    test.use({ viewport: WIDE });

    test('sits under the map and hides the stations until a line is chosen', async ({ page }) => {
      await page.goto('/roadmap');
      const map = await page.getByTestId('subway-map').boundingBox();
      const group = await switcher(page).boundingBox();
      expect(group?.y ?? 0).toBeGreaterThan((map?.y ?? 0) + (map?.height ?? 0) - 1);

      await expect(switcher(page).locator('[aria-current="true"]')).toHaveCount(0);
      await expect(page.getByRole('list', { name: 'Stations' })).toBeHidden();
      await expect(page.getByText('Choose a line, here or on the map')).toBeVisible();

      const first = switcher(page).getByRole('link').first();
      const name = await nameOf(first);
      await first.click();

      await expect(page).toHaveURL(/[?&]line=/);
      await expect(first).toHaveAttribute('aria-current', 'true');
      await expect(page.getByRole('list', { name: 'Stations' })).toBeVisible();
      await expect(terminal(page)).toContainText(name);
      await expect(page.getByText('Choose a line, here or on the map')).toBeHidden();
    });

    test('treats an unknown ?line= as no choice', async ({ page }) => {
      await page.goto('/roadmap?line=not-a-target');

      await expect(switcher(page).locator('[aria-current="true"]')).toHaveCount(0);
      await expect(page.getByRole('list', { name: 'Stations' })).toBeHidden();
    });
  });
});

test.describe('choosing a line from the map (#148)', () => {
  test.use({ viewport: WIDE });

  const selected = (page: Page) =>
    page.getByRole('group', { name: 'Show line' }).locator('[aria-current="true"]');

  test('clicking a line or its terminal shows that line in the list', async ({ page }) => {
    await openRoadmap(page);
    const map = page.getByTestId('subway-map');
    const lines = await map
      .locator('path[data-target-id]')
      .evaluateAll((els) => [...new Set(els.map((el) => el.getAttribute('data-target-id') ?? ''))]);
    test.skip(lines.length < 2, 'The served roadmap has a single target');
    const before = await selected(page).getAttribute('href');
    const other = lines.find((id) => `?line=${id}` !== before) ?? '';

    // The map is mouse-only decoration; dispatching the click avoids hitting a crossing line.
    await map.locator(`path[data-target-id="${other}"]`).first().dispatchEvent('click');
    await expect(page).toHaveURL(new RegExp(`[?&]line=${other}`));
    await expect(selected(page)).toHaveAttribute('href', `?line=${other}`);

    const primary = (before ?? '').replace('?line=', '');
    await map.locator(`[data-station="${primary}"]`).dispatchEvent('click');
    await expect(page).toHaveURL(new RegExp(`[?&]line=${primary}`));
    await expect(selected(page)).toHaveAttribute('href', `?line=${primary}`);
  });
});

test.describe('the station panel agrees with the view that opened it (#148)', () => {
  test.use({ viewport: WIDE });

  test('opened from the map, it marks the station the map marks', async ({ page }) => {
    await page.goto('/roadmap');
    const here = page.getByTestId('subway-map').locator('[data-station]:has(.animate-here-pulse)');
    test.skip((await here.count()) === 0, 'Every milestone of the served roadmap is done');

    // The map is mouse-only decoration; dispatching the click avoids hitting a crossing line.
    await here.first().dispatchEvent('click');
    await expect(page.getByRole('dialog')).toContainText('You are here');
  });
});
