import { expect, type Page, test } from '@playwright/test';

/** The tab shell (#107): routes, keyboard reach, aria-current and phone widths. */

const TABS = [
  { name: 'Roadmap', path: '/roadmap' },
  { name: 'Profile', path: '/profile' },
  { name: 'Skills & gaps', path: '/skills' },
  { name: 'Projects', path: '/projects' },
  { name: 'Sources', path: '/sources' },
];

function tab(page: Page, name: string) {
  // The accessible name also carries the badge sentence ("Projects, 4 open tasks").
  return page
    .getByRole('navigation', { name: 'Tabs' })
    .getByRole('link', { name: new RegExp(`^${name.replace('&', '\\&')}\\b`) });
}

test('the app opens on the roadmap', async ({ page }) => {
  await page.goto('/');

  await expect(page).toHaveURL(/\/roadmap$/);
  await expect(tab(page, 'Roadmap')).toHaveAttribute('aria-current', 'page');
});

test('every tab is reachable by keyboard, with visible focus', async ({ page }) => {
  await page.goto('/roadmap');

  const reached = new Set<string>();
  for (let i = 0; i < 12 && reached.size < TABS.length; i++) {
    await page.keyboard.press('Tab');
    const focused = page.locator(':focus');
    const href = await focused.getAttribute('href');
    if (!href || !TABS.some((t) => t.path === href)) continue;
    if (!(await focused.evaluate((el) => el.closest('nav') !== null))) continue;

    // The ring is a box-shadow from Tailwind's ring utilities: none means no visible focus.
    await expect(focused).not.toHaveCSS('box-shadow', 'none');
    reached.add(href);
  }

  expect([...reached].sort()).toEqual(TABS.map((t) => t.path).sort());
});

test('the skip link jumps past the navigation to the page', async ({ page }) => {
  await page.goto('/roadmap');

  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Skip to content' })).toBeFocused();
  await page.keyboard.press('Enter');

  await expect(page.locator('main')).toBeFocused();
});

for (const { name, path } of TABS) {
  test(`${name} opens from the tab bar and is marked current`, async ({ page }) => {
    await page.goto(path === '/roadmap' ? '/sources' : '/roadmap');

    await tab(page, name).focus();
    await page.keyboard.press('Enter');

    await expect(page).toHaveURL(new RegExp(`${path}$`));
    await expect(page.getByRole('heading', { level: 1, name })).toBeVisible();
    await expect(tab(page, name)).toHaveAttribute('aria-current', 'page');
    await expect(page.locator('nav [aria-current="page"]')).toHaveCount(1);
  });
}

test.describe('at 360px', () => {
  test.use({ viewport: { width: 360, height: 740 } });

  for (const { name, path } of TABS) {
    test(`${name} has no horizontal scroll and a bottom tab bar`, async ({ page }) => {
      await page.goto(path);

      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow).toBe(0);

      const bar = await page.getByRole('navigation', { name: 'Tabs' }).boundingBox();
      expect(bar && Math.round(bar.y + bar.height)).toBe(740);
      for (const t of TABS) await expect(tab(page, t.name)).toBeInViewport();
    });
  }
});
