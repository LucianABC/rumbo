import AxeBuilder from '@axe-core/playwright';
import { expect, type Page, test } from '@playwright/test';

/**
 * Skills & gaps (#111) on a narrow phone and a wide screen. Nothing depends on mock content:
 * locally the stack may serve the owner's own mocks (#137), so the tests read names and numbers
 * from the page instead of expecting them.
 */

const SIZES = [
  ['narrow phone', { width: 360, height: 780 }],
  ['wide screen', { width: 1440, height: 900 }],
] as const;

/** WCAG 2.1 A and AA, the level the project targets. */
const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

const switcher = (page: Page) => page.getByRole('group', { name: 'Show' });
const gaps = (page: Page) =>
  page.getByRole('list', { name: 'Gaps in priority order' }).locator(':scope > li');

/** Opens /skills and skips when the served market data does not fit the roadmap (#137). */
async function gotoSkillsWithMarket(page: Page, query = ''): Promise<void> {
  await page.goto(`/skills${query}`);
  const ranked = page.getByRole('list', { name: /postings ask for most$/ }).first();
  const unavailable = page.getByText('Market data unavailable');
  const thin = page.getByText(/No skill appears in \d+% of these postings/).first();
  await expect(ranked.or(unavailable).or(thin)).toBeVisible();
  test.skip(await unavailable.isVisible(), 'Market data unavailable for the served mocks');
}

for (const [size, viewport] of SIZES) {
  test.describe(`on a ${size}`, () => {
    test.use({ viewport });

    test('has no horizontal scroll and no WCAG A/AA violations', async ({ page }) => {
      await gotoSkillsWithMarket(page);

      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow).toBe(0);

      const { violations } = await new AxeBuilder({ page }).withTags(WCAG).analyze();
      expect(
        violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`),
      ).toEqual([]);
    });

    test('every gap shows its market numbers as text', async ({ page }) => {
      await gotoSkillsWithMarket(page);

      const all = await gaps(page).all();
      test.skip(all.length === 0, 'The served roadmap has no gaps');
      for (const gap of all) {
        const numbers = gap.getByRole('list', { name: 'Market numbers' });
        await expect(numbers.getByRole('listitem').first()).toHaveText(
          /Asked in \d+% of \d+ .+ postings/,
        );
      }
    });

    test('shows every target by default and narrows to one by keyboard, surviving a reload', async ({
      page,
    }) => {
      await gotoSkillsWithMarket(page);
      const options = switcher(page).getByRole('link');
      await expect(options.first()).toHaveText('All targets');
      await expect(options.first()).toHaveAttribute('aria-current', 'true');
      const targets = (await options.count()) - 1;
      // One snapshot card per target, each headed by its name.
      const markets = page
        .getByRole('region', { name: 'Market' })
        .getByRole('heading', { level: 3 });
      expect(await markets.count()).toBe(targets);
      test.skip(targets < 2, 'Only one target');

      const last = options.last();
      await last.focus();
      await page.keyboard.press('Enter');

      await expect(page).toHaveURL(/\/skills\?target=.+/);
      await expect(last).toHaveAttribute('aria-current', 'true');
      await expect(markets).toHaveCount(1);
      await page.reload();
      await expect(switcher(page).getByRole('link').last()).toHaveAttribute('aria-current', 'true');
      await expect(markets).toHaveCount(1);
    });

    test('the manual market check says it is not available yet', async ({ page }) => {
      await gotoSkillsWithMarket(page);

      await page.getByRole('button', { name: 'Check market again' }).click();

      await expect(page.getByRole('status').filter({ hasText: 'Not available yet' })).toBeVisible();
    });

    test("an item's link opens its station on Roadmap", async ({ page }) => {
      await gotoSkillsWithMarket(page);
      const link = page.getByRole('link', { name: /open its station on Roadmap/ }).first();
      test.skip((await link.count()) === 0, 'No closing items');

      await link.click();

      await expect(page).toHaveURL(/\/roadmap\?(line=[^&]+&)?station=.+/);
      await expect(page.getByRole('dialog')).toBeVisible();
      // Closing leaves the URL, so a reload does not open the panel again.
      await page.keyboard.press('Escape');
      await expect(page.getByRole('dialog')).toBeHidden();
      await expect(page).not.toHaveURL(/station=/);
    });
  });
}
