import AxeBuilder from '@axe-core/playwright';
import { expect, type Page, test } from '@playwright/test';
import {
  CALCULATOR_RESULTS,
  CASE_PAIR,
  gotoHydrated,
  HOLDED_PAGES,
  PAGES,
  PAIRS,
  SECTOR_PAGE,
  settleAnimations,
  VERIFACTU_PAGE,
} from './helpers';

const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];
const VIEWPORTS = [
  { width: 390, height: 844 },
  { width: 412, height: 915 },
  { width: 1280, height: 900 },
];
const URLS = [...PAGES, ...CALCULATOR_RESULTS, '/nope', '/es/nope'];

function axe(page: Page) {
  return new AxeBuilder({ page })
    .withTags(TAGS)
    .exclude('iframe[src*="challenges.cloudflare.com"]')
    .analyze();
}

// Light only: the site ships one scheme, so a dark emulation would test the same page twice.
for (const viewport of VIEWPORTS) {
  test.describe(`${viewport.width}px`, () => {
    test.use({ viewport });

    for (const url of URLS) {
      test(`${url} has no axe violations`, async ({ page }) => {
        await gotoHydrated(page, url);
        await settleAnimations(page);
        const results = await axe(page);
        expect(results.violations).toEqual([]);
        if (url === '/') {
          const ran = [...results.passes, ...results.incomplete].map(
            (rule) => rule.id,
          );
          expect(ran, 'the WCAG 2.2 target-size rule must run').toContain(
            'target-size',
          );
        }
      });
    }
  });
}

test.describe('mobile menu', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('opens with Enter, has no axe violations and closes with Escape', async ({
    page,
  }) => {
    await gotoHydrated(page, '/');
    const summary = page.locator('header details summary');
    await summary.focus();
    await page.keyboard.press('Enter');
    const menu = page.locator('header details .menu-panel');
    await expect(menu).toBeVisible();
    expect((await axe(page)).violations).toEqual([]);
    await page.keyboard.press('Tab');
    await page.keyboard.press('Escape');
    await expect(menu).toBeHidden();
    await expect(summary).toBeFocused();
  });

  test('closes when Tab leaves it, so focus never lands behind it', async ({
    page,
  }) => {
    await gotoHydrated(page, '/');
    await page.locator('header details summary').click();
    const menu = page.locator('header details .menu-panel');
    await expect(menu).toBeVisible();
    await menu.getByRole('link').last().focus();
    await page.keyboard.press('Tab');
    await expect(menu).toBeHidden();
    expect(
      await page.evaluate(
        () => document.activeElement?.closest('header details') ?? null,
      ),
    ).toBeNull();
  });
});

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });

  for (const url of ['/', '/es']) {
    test(`${url} runs no animations`, async ({ page }) => {
      await gotoHydrated(page, url);
      expect(await page.evaluate(() => document.getAnimations().length)).toBe(
        0,
      );
      await expect(page.locator('[data-desk]')).toBeVisible();
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
  ...CALCULATOR_RESULTS,
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
