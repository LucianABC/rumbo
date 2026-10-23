import AxeBuilder from '@axe-core/playwright';
import { expect, type Page, test } from '@playwright/test';

/**
 * Keyboard and accessibility for the roadmap (spec 01, M2, #110), on a phone (single line, bottom
 * sheet) and a wide screen (map over the list, side sheet). Nothing depends on mock content: the
 * local stack may serve the owner's own mocks (#137).
 */

const SIZES = [
  ['phone', { width: 375, height: 812 }],
  ['wide screen', { width: 1440, height: 900 }],
] as const;

/** WCAG 2.1 A and AA, the level the project targets. */
const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

const stations = (page: Page) =>
  page.getByRole('list', { name: 'Stations' }).locator('[data-station-id]');
const focusedStation = (page: Page) =>
  page.evaluate(() => document.activeElement?.getAttribute('data-station-id') ?? null);

/** Tabs from the top of the page until focus lands on a station; fails if it never does. */
async function tabIntoStations(page: Page): Promise<string> {
  // The summary band (#112) adds its links and Change targets before the stations.
  for (let i = 0; i < 40; i++) {
    await page.keyboard.press('Tab');
    const id = await focusedStation(page);
    if (id) return id;
  }
  throw new Error('Tab never reached a station');
}

async function expectNoViolations(page: Page) {
  const { violations } = await new AxeBuilder({ page }).withTags(WCAG).analyze();
  // Ids and targets in the message, so a failure says what to fix.
  expect(
    violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`),
  ).toEqual([]);
}

for (const [size, viewport] of SIZES) {
  test.describe(`on a ${size}`, () => {
    test.use({ viewport });

    test('the station list is one Tab stop, entered at "you are here"', async ({ page }) => {
      await page.goto('/roadmap');
      const ids = await stations(page).evaluateAll((els) =>
        els.map((el) => el.getAttribute('data-station-id')),
      );
      const here = await page
        .getByRole('button', { name: /, you are here$/ })
        .getAttribute('data-station-id');

      expect(await tabIntoStations(page)).toBe(here);

      await page.keyboard.press('Tab');
      expect(await focusedStation(page)).toBeNull();
      await page.keyboard.press('Shift+Tab');
      expect(await focusedStation(page)).toBe(here);
      expect(ids.length).toBeGreaterThan(1);
    });

    test('arrows, Home and End move between stations', async ({ page }) => {
      await page.goto('/roadmap');
      const ids = await stations(page).evaluateAll((els) =>
        els.map((el) => el.getAttribute('data-station-id')),
      );
      const start = await tabIntoStations(page);
      const at = ids.indexOf(start);

      await page.keyboard.press('Home');
      expect(await focusedStation(page)).toBe(ids[0]);
      await page.keyboard.press('ArrowUp');
      expect(await focusedStation(page)).toBe(ids[0]);
      await page.keyboard.press('ArrowDown');
      expect(await focusedStation(page)).toBe(ids[1]);
      await page.keyboard.press('ArrowRight');
      expect(await focusedStation(page)).toBe(ids[2] ?? ids[1]);
      await page.keyboard.press('ArrowLeft');
      expect(await focusedStation(page)).toBe(ids[1]);
      await page.keyboard.press('End');
      expect(await focusedStation(page)).toBe(ids.at(-1));
      expect(at).toBeGreaterThanOrEqual(0);

      // Leaving and coming back lands where the user left off.
      await page.keyboard.press('Tab');
      await page.keyboard.press('Shift+Tab');
      expect(await focusedStation(page)).toBe(ids.at(-1));
    });

    test('leaves modified keys and keys at the ends to the browser', async ({ page }) => {
      await page.goto('/roadmap');
      await tabIntoStations(page);
      // Records, after React handled it, whether each key had its default action blocked.
      await page.evaluate(() => {
        const log: boolean[] = [];
        Object.assign(window, { blocked: log });
        document.addEventListener('keydown', (e) => {
          // Pressing Alt or Control on its own is a keydown too; only the combined key counts.
          if (!['Alt', 'Control', 'Shift', 'Meta'].includes(e.key)) log.push(e.defaultPrevented);
        });
      });
      const blocked = () =>
        page.evaluate(() => (window as unknown as { blocked: boolean[] }).blocked);

      await page.keyboard.press('Home');
      const first = await focusedStation(page);
      await page.keyboard.press('ArrowUp');
      await page.keyboard.press('Alt+ArrowDown');
      await page.keyboard.press('Control+End');

      expect(await focusedStation(page)).toBe(first);
      // Home moves focus (blocked); ArrowUp at the first station, Alt+↓ and Ctrl+End do not.
      expect(await blocked()).toEqual([true, false, false, false]);
    });

    for (const key of ['Enter', 'Space']) {
      test(`${key} opens the station panel and Esc gives focus back`, async ({ page }) => {
        await page.goto('/roadmap');
        const start = await tabIntoStations(page);

        await page.keyboard.press(key);
        await expect(page.getByRole('dialog')).toBeVisible();
        await page.keyboard.press('Escape');

        await expect(page.getByRole('dialog')).toBeHidden();
        expect(await focusedStation(page)).toBe(start);
      });
    }

    test('has no WCAG 2.1 AA violations', async ({ page }) => {
      await page.goto('/roadmap');
      // Let the map finish drawing in, so axe measures the settled page.
      await page.waitForTimeout(1500);

      await expectNoViolations(page);
    });

    test('has no WCAG 2.1 AA violations with a station panel open', async ({ page }) => {
      await page.goto('/roadmap');
      await page.getByRole('button', { name: /, you are here$/ }).click();
      await expect(page.getByRole('dialog')).toBeVisible();
      await page.waitForTimeout(600);

      await expectNoViolations(page);
    });

    test('has no WCAG 2.1 AA violations with Change targets open (#112)', async ({ page }) => {
      await page.goto('/roadmap');
      await page.getByRole('button', { name: 'Change targets' }).click();
      await expect(page.getByRole('dialog', { name: 'Change targets' })).toBeVisible();
      await page.waitForTimeout(600);

      await expectNoViolations(page);
    });
  });
}
