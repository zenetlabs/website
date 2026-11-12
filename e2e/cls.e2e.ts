import { expect, type Page, test } from '@playwright/test';
import { gotoHydrated, OBSERVER, PAGE_TYPE_URLS } from './helpers';

const WIDTHS = [
  { width: 390, height: 844 },
  { width: 1440, height: 900 },
] as const;

async function scrollThrough(page: Page) {
  const height = await page.evaluate(() => document.body.scrollHeight);
  for (let top = 0; top < height; top += 400) {
    await page.evaluate((y) => window.scrollTo(0, y), top);
    await page.waitForTimeout(40);
  }
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
}

for (const viewport of WIDTHS) {
  test.describe(`${viewport.width}px`, () => {
    test.use({ viewport });

    for (const url of PAGE_TYPE_URLS) {
      test(`${url} shifts nothing with fast fonts`, async ({ page }) => {
        await page.addInitScript(OBSERVER);
        await gotoHydrated(page, url);
        await scrollThrough(page);
        await page.waitForTimeout(200);
        expect(await page.evaluate(() => window.__layoutShift)).toBe(0);
      });

      test(`${url} shifts nothing while slow fonts arrive`, async ({
        page,
      }) => {
        await page.addInitScript(OBSERVER);
        await page.route('**/*.woff2', async (route) => {
          await new Promise((resolve) => setTimeout(resolve, 400));
          await route.continue();
        });
        await gotoHydrated(page, url);
        await page.evaluate(() => document.fonts.ready);
        await scrollThrough(page);
        await page.waitForTimeout(300);
        expect(await page.evaluate(() => window.__layoutShift)).toBe(0);
      });
    }
  });
}
