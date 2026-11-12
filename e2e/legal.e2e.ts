import { expect, test } from '@playwright/test';
import { gotoHydrated, settleAnimations } from './helpers';

const PAGES = [
  { url: '/privacy', label: 'On this page', md: '/privacy.md' },
  { url: '/cookies', label: 'On this page', md: '/cookies.md' },
  { url: '/es/privacidad', label: 'En esta página', md: '/es/privacidad.md' },
  { url: '/es/cookies', label: 'En esta página', md: '/es/cookies.md' },
  { url: '/es/aviso-legal', label: 'En esta página', md: '/es/aviso-legal.md' },
] as const;

test.describe('desktop', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  for (const { url, label } of PAGES) {
    test(`${url} has a sticky contents column whose jumps clear the header`, async ({
      page,
    }) => {
      await gotoHydrated(page, url);
      const nav = page.getByRole('navigation', { name: label });
      await expect(nav.locator('details')).toBeHidden();
      const links = nav.getByRole('link');
      expect(await links.count()).toBeGreaterThan(2);
      expect(
        await nav.evaluate((node) => getComputedStyle(node).position),
      ).toBe('sticky');

      const middle = links.nth(Math.floor((await links.count()) / 2));
      const id = (await middle.getAttribute('href'))?.slice(1) ?? '';
      await middle.click();
      await page.waitForFunction(() => window.scrollY > 0);
      await settleAnimations(page);
      const top = await page.evaluate(
        (target) =>
          document.getElementById(target)?.getBoundingClientRect().top,
        id,
      );
      const header = await page.evaluate(
        () => document.querySelector('header')?.getBoundingClientRect().bottom,
      );
      const padding = await page.evaluate(() =>
        Number.parseFloat(
          getComputedStyle(document.documentElement).scrollPaddingTop,
        ),
      );
      expect(top).toBeGreaterThanOrEqual(header ?? 0);
      expect(top).toBeLessThanOrEqual(padding + 2);
    });
  }
});

test.describe('phone', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  for (const { url, label } of PAGES) {
    test(`${url} folds the contents list under the updated line`, async ({
      page,
    }) => {
      await gotoHydrated(page, url);
      const details = page
        .getByRole('navigation', { name: label })
        .locator('details');
      await expect(details).toBeVisible();
      await expect(details).not.toHaveAttribute('open', '');
      await details.getByText(label).click();
      const first = details.getByRole('link').first();
      await expect(first).toBeVisible();
      expect((await first.boundingBox())?.height).toBeGreaterThanOrEqual(44);
    });
  }
});

for (const { md, label } of PAGES) {
  test(`${md} does not carry the contents list`, async ({ request }) => {
    const text = await (await request.get(md)).text();
    expect(text).not.toContain(label);
  });
}
