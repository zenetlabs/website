import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import {
  CASE_PAIR,
  gotoHydrated,
  HOLDED_PAGES,
  PAGES,
  PAIRS,
  SECTOR_PAGE,
  settleAnimations,
  VERIFACTU_PAGE,
} from './helpers';

const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];
const VIEWPORTS = [
  { width: 412, height: 915 },
  { width: 1280, height: 900 },
];
const URLS = [...PAGES, '/nope', '/es/nope'];

for (const viewport of VIEWPORTS) {
  for (const colorScheme of ['light', 'dark'] as const) {
    test.describe(`${viewport.width}px ${colorScheme}`, () => {
      test.use({ viewport, colorScheme });

      for (const url of URLS) {
        test(`${url} has no axe violations`, async ({ page }) => {
          await gotoHydrated(page, url);
          await settleAnimations(page);
          const results = await new AxeBuilder({ page })
            .withTags(TAGS)
            .exclude('iframe[src*="challenges.cloudflare.com"]')
            .analyze();
          expect(results.violations).toEqual([]);
        });
      }
    });
  }
}

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });

  for (const url of ['/', '/es']) {
    test(`${url} runs no animations`, async ({ page }) => {
      await gotoHydrated(page, url);
      expect(await page.evaluate(() => document.getAnimations().length)).toBe(
        0,
      );
      await expect(page.locator('.runlog-line').last()).toBeVisible();
    });
  }
});

const OVERFLOW_URLS = [
  ...PAIRS.slice(0, 3).flatMap(({ en, es }) => [en, es]),
  '/services',
  '/es/servicios',
  '/services/ai-automation',
  '/es/servicios/desarrollo-de-software-a-medida',
  ...HOLDED_PAGES,
  VERIFACTU_PAGE,
  SECTOR_PAGE,
  CASE_PAIR.en,
  CASE_PAIR.es,
];

for (const url of OVERFLOW_URLS) {
  test(`${url} has no horizontal scroll on mobile`, async ({ page }) => {
    await page.setViewportSize({ width: 412, height: 915 });
    await gotoHydrated(page, url);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
}
