import AxeBuilder from '@axe-core/playwright';
import { expect, type Page, test } from '@playwright/test';

/**
 * Profile (#113) on a narrow phone and a wide screen. Nothing depends on mock content: locally
 * the stack may serve the owner's own mocks (#137), so the tests read what the page shows.
 */

const SIZES = [
  ['narrow phone', { width: 360, height: 780 }],
  ['wide screen', { width: 1440, height: 900 }],
] as const;

/** WCAG 2.1 A and AA, the level the project targets. */
const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

const bell = (page: Page) => page.getByRole('banner').getByRole('button', { name: /^Suggested/ });
const notifications = (page: Page) =>
  page.getByRole('list', { name: 'Notifications' }).locator(':scope > li');

/** Opens the panel and skips when the served drafts do not fit the profile (#137). */
async function openNotifications(page: Page): Promise<void> {
  await page.goto('/profile');
  await bell(page).click();
  const unavailable = page.getByText('Suggested changes unavailable');
  const empty = page.getByText('Nothing to review');
  await expect(notifications(page).first().or(unavailable).or(empty)).toBeVisible();
  test.skip(await unavailable.isVisible(), 'Drafts unavailable for the served mocks');
  test.skip(await empty.isVisible(), 'The served drafts are empty');
}

for (const [size, viewport] of SIZES) {
  test.describe(`on a ${size}`, () => {
    test.use({ viewport });

    test('has no horizontal scroll and no WCAG A/AA violations', async ({ page }) => {
      await page.goto('/profile');
      await expect(page.getByRole('heading', { level: 1, name: 'Profile' })).toBeVisible();

      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow).toBe(0);

      const { violations } = await new AxeBuilder({ page }).withTags(WCAG).analyze();
      expect(
        violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`),
      ).toEqual([]);
    });

    test('has no WCAG A/AA violations with a notification open', async ({ page }) => {
      await openNotifications(page);
      await notifications(page).first().locator('summary').click();

      const { violations } = await new AxeBuilder({ page }).withTags(WCAG).analyze();
      expect(
        violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`),
      ).toEqual([]);
    });

    test('opens with the profile sources, above the CV', async ({ page }) => {
      await page.goto('/profile');
      const sources = page.getByRole('region', { name: 'Profile sources' });
      const experience = page.getByRole('region', { name: 'Experience' });

      await expect(sources.getByRole('button')).toHaveCount(3);
      const sourcesBox = await sources.boundingBox();
      const experienceBox = await experience.boundingBox();
      expect(sourcesBox?.y).toBeLessThan(experienceBox?.y ?? 0);
    });

    test('opening a notification closes the last one', async ({ page }) => {
      await openNotifications(page);
      const all = await notifications(page).all();
      test.skip(all.length < 2, 'Only one notification');
      const [first, second] = all;
      if (!first || !second) return;

      await first.locator('summary').click();
      await expect(first.locator('ins')).toBeVisible();
      await second.locator('summary').click();

      await expect(second.locator('ins')).toBeVisible();
      await expect(first.locator('ins')).toBeHidden();
    });

    test('approving by keyboard unlocks Copy and Open on LinkedIn, and Undo takes it back', async ({
      page,
    }) => {
      await openNotifications(page);
      const row = notifications(page).first();
      const status = page.getByRole('status').filter({ hasText: 'left to review' });
      const before = await status.innerText();

      await row.locator('summary').focus();
      await page.keyboard.press('Enter');
      await row.getByRole('button', { name: /^Approve/ }).focus();
      await page.keyboard.press('Enter');

      await expect(row.getByText('approved', { exact: true })).toBeVisible();
      await expect(row.getByRole('button', { name: /^Reject/ })).toHaveCount(0);
      await expect(row.getByRole('link', { name: /Open on LinkedIn/ })).toBeVisible();
      // The pressed button is gone, so focus moves to the next action.
      await expect(row.getByRole('button', { name: /^Copy/ })).toBeFocused();
      await expect(status).not.toHaveText(before);

      await row.getByRole('button', { name: /^Undo/ }).click();

      await expect(row.getByRole('button', { name: /^Approve/ })).toBeFocused();
      await expect(status).toHaveText(before);
    });

    test('the bar heads the page, and approving a change moves it', async ({ page }) => {
      await openNotifications(page);
      const name = 'Profile completeness';
      const panelBar = page.getByRole('dialog').getByRole('progressbar', { name });
      const row = notifications(page).first();
      const before = await panelBar.getAttribute('aria-valuenow');
      expect(Number(before)).toBeGreaterThan(0);

      await row.locator('summary').click();
      await row.getByRole('button', { name: /^Approve/ }).click();
      await expect(panelBar).not.toHaveAttribute('aria-valuenow', before ?? '');
      const after = await panelBar.getAttribute('aria-valuenow');

      // The page under the panel stays out of reach until it closes.
      await page.keyboard.press('Escape');
      await expect(page.getByRole('main').getByRole('progressbar', { name })).toHaveAttribute(
        'aria-valuenow',
        after ?? '',
      );
    });

    test('the bell is in the app header on every tab', async ({ page }) => {
      await page.goto('/skills');

      await expect(
        page.getByRole('banner').getByRole('button', { name: /^Suggested changes/ }),
      ).toBeVisible();
    });

    test('Copy says so when the browser has no clipboard', async ({ page }) => {
      await page.addInitScript(() => {
        Object.defineProperty(navigator, 'clipboard', { value: undefined });
      });
      await openNotifications(page);
      const row = notifications(page).first();
      await row.locator('summary').click();
      await row.getByRole('button', { name: /^Approve/ }).click();

      await row.getByRole('button', { name: /^Copy/ }).click();

      await expect(row.getByRole('status')).toHaveText(/Could not copy/);
    });

    test('rejecting folds the diff away', async ({ page }) => {
      await openNotifications(page);
      const row = notifications(page).first();
      await row.locator('summary').click();

      await row.getByRole('button', { name: /^Reject/ }).click();

      await expect(row.getByText('rejected', { exact: true })).toBeVisible();
      await expect(row.locator('ins')).toHaveCount(0);
      await expect(row.getByRole('button', { name: /^Undo/ })).toBeFocused();
    });

    test('a decision lowers the bell and the Profile badge, and survives changing tabs', async ({
      page,
    }) => {
      await openNotifications(page);
      const count = await notifications(page).count();
      const nav = page.getByRole('navigation', { name: 'Tabs' });
      const tab = nav.getByRole('link', { name: /^Profile/ });
      const row = notifications(page).first();
      await row.locator('summary').click();
      await row.getByRole('button', { name: /^Approve/ }).click();
      await page.keyboard.press('Escape');

      await expect(bell(page)).not.toHaveAccessibleName(
        `Suggested changes, ${String(count)} to review`,
      );
      await expect(tab).not.toContainText(`${String(count)} suggested changes`);

      await nav.getByRole('link', { name: /^Skills/ }).click();
      await expect(page).toHaveURL(/\/skills/);
      await tab.click();
      await bell(page).click();

      await expect(
        notifications(page).first().getByText('approved', { exact: true }),
      ).toBeVisible();
    });

    test('a source control says it is not available yet', async ({ page }) => {
      await page.goto('/profile');

      await page
        .getByRole('region', { name: 'Profile sources' })
        .getByRole('button')
        .first()
        .click();

      await expect(page.getByRole('status').filter({ hasText: 'Not available yet' })).toBeVisible();
    });
  });
}
