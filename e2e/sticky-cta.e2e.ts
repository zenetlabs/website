import { expect, type Page, test } from '@playwright/test';
import { siteConfig } from '../site.config';
import { ASSISTANT_PUBLISHED, CTA, gotoHydrated } from './helpers';

const BAR = '[data-sticky-cta]';
const GA_ID = siteConfig(undefined).ga4Id;

async function box(page: Page, selector: string) {
  const found = await page.locator(selector).first().boundingBox();
  if (!found) throw new Error(`${selector} has no box`);
  return found;
}

test.describe('mobile', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('stays below the hero, docks mid-page and ends above the contact form', async ({
    page,
  }) => {
    await gotoHydrated(page, '/');
    await expect(page.locator(BAR)).not.toBeInViewport();

    await page.locator('#services').scrollIntoViewIfNeeded();
    await page.evaluate(() => window.scrollBy(0, 300));
    await expect(page.locator(BAR)).toBeInViewport({ ratio: 1 });
    const mid = await box(page, BAR);
    expect(Math.round(mid.y + mid.height)).toBe(844);
    const link = page.locator(`${BAR} a`);
    await expect(link).toHaveAttribute('href', CTA.en);
    await expect(link).toHaveAttribute('data-cta', 'sticky');

    await page.evaluate(() =>
      document.querySelector('#contact')?.scrollIntoView({ block: 'start' }),
    );
    const end = await box(page, BAR);
    const contact = await box(page, '#contact');
    expect(end.y + end.height).toBeLessThanOrEqual(contact.y + 1);
  });

  test('never covers the focused question', async ({ page }) => {
    await gotoHydrated(page, '/');
    const summaries = page.locator('#faq summary');
    await summaries.first().focus();
    const count = await summaries.count();
    for (let index = 0; index < count; index++) {
      await expect(summaries.nth(index)).toBeFocused();
      const focused = await box(page, ':focus');
      const bar = await box(page, BAR);
      if (bar.y < 844)
        expect(focused.y + focused.height).toBeLessThanOrEqual(bar.y + 1);
      await page.keyboard.press('Tab');
    }
  });

  test('is hidden while the header menu is open', async ({ page }) => {
    await gotoHydrated(page, '/');
    await page.locator('#services').scrollIntoViewIfNeeded();
    await page.evaluate(() => window.scrollBy(0, 300));
    await expect(page.locator(BAR)).toBeInViewport({ ratio: 1 });
    await page.locator('header details summary').click();
    await expect(page.locator(BAR)).toBeHidden();
    await page.locator('header details summary').click();
    await expect(page.locator(BAR)).toBeVisible();
  });

  test('leaves room for the assistant launcher', async ({ page }) => {
    test.skip(!ASSISTANT_PUBLISHED, 'the assistant is not published here');
    await gotoHydrated(page, '/');
    await expect(page.locator('[data-chat-launcher]')).toHaveCount(1);
    await page.locator('#faq').scrollIntoViewIfNeeded();
    const launcher = await box(page, '[data-chat-launcher]');
    const link = await box(page, `${BAR} a`);
    expect(link.x + link.width).toBeLessThanOrEqual(launcher.x);
  });
});

const ZONE_PAGES = ['/pricing', '/services', '/about', '/es/precios'] as const;

test.describe('mobile page zones', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  for (const path of ZONE_PAGES) {
    test(`${path} docks above the closing band`, async ({ page }) => {
      await gotoHydrated(page, path);
      await page.evaluate(() => window.scrollBy(0, 900));
      await expect(page.locator(BAR)).toBeInViewport({ ratio: 1 });
      const mid = await box(page, BAR);
      expect(Math.round(mid.y + mid.height)).toBe(844);

      await page.evaluate(() =>
        document
          .querySelector('[data-ground="band"]')
          ?.scrollIntoView({ block: 'start' }),
      );
      const end = await box(page, BAR);
      const band = await box(page, '[data-ground="band"]');
      expect(end.y + end.height).toBeLessThanOrEqual(band.y + 1);
    });

    test(`${path} never covers the focused link`, async ({ page }) => {
      await gotoHydrated(page, path);
      const links = page.locator('main a');
      const count = await links.count();
      await links.first().focus();
      for (let index = 0; index < count; index++) {
        const inMain = await page.evaluate(
          (bar) =>
            Boolean(document.activeElement?.closest('main')) &&
            !document.activeElement?.closest(bar),
          BAR,
        );
        if (inMain) {
          const focused = await box(page, ':focus');
          const bar = await box(page, BAR);
          const overlaps =
            focused.y < bar.y + bar.height &&
            focused.y + focused.height > bar.y;
          expect(overlaps).toBe(false);
        }
        await page.keyboard.press('Tab');
      }
    });
  }
});

test.describe('desktop', () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test('has no bar', async ({ page }) => {
    await gotoHydrated(page, '/');
    await expect(page.locator(BAR)).toBeHidden();
  });
});

test.describe('with the consent banner', () => {
  test.skip(GA_ID === null, 'no analytics build, so no banner');
  test.use({
    viewport: { width: 390, height: 844 },
    storageState: { cookies: [], origins: [] },
  });

  test('is hidden while the banner shows', async ({ page }) => {
    await gotoHydrated(page, '/');
    await expect(page.locator('[data-consent-banner]')).toBeVisible();
    await page.locator('#services').scrollIntoViewIfNeeded();
    await expect(page.locator(BAR)).toBeHidden();
  });
});
