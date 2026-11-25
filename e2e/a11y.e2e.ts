import AxeBuilder from '@axe-core/playwright';
import { expect, type Page } from '@playwright/test';
import { test } from './fixtures';
import {
  CALCULATOR_RESULTS,
  CASE_PAIR,
  gotoHydrated,
  HOLDED_PAGES,
  PAGES,
  PAIRS,
  SECTOR_PAGE,
  SERVICE_PAIRS,
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

  for (const url of ['/', '/es', '/services/ai-agents', HOLDED_PAGES[1]]) {
    test(`${url} runs no animations`, async ({ page }) => {
      await gotoHydrated(page, url);
      expect(await page.evaluate(() => document.getAnimations().length)).toBe(
        0,
      );
      if (url === '/' || url === '/es') {
        await expect(page.locator('[data-desk]')).toBeVisible();
      } else {
        await expect(page.locator('[data-flow-board]')).toBeVisible();
      }
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

async function overflowing(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const limit = window.innerWidth + 0.5;
    const clips = (el: Element) => {
      const style = getComputedStyle(el);
      return (
        style.overflowX !== 'visible' ||
        /paint|content|strict/.test(style.contain)
      );
    };
    const fixed = (el: Element) => {
      for (let node: Element | null = el; node; node = node.parentElement) {
        if (getComputedStyle(node).position === 'fixed') return true;
      }
      return false;
    };
    const contained = (el: Element) => {
      let node: Element | null =
        getComputedStyle(el).position === 'absolute' &&
        el instanceof HTMLElement
          ? el.offsetParent
          : el.parentElement;
      while (
        node &&
        node !== document.body &&
        node !== document.documentElement
      ) {
        if (clips(node) && node.getBoundingClientRect().right <= limit)
          return true;
        node = node.parentElement;
      }
      return false;
    };
    const name = (el: Element) => {
      const attributes = el
        .getAttributeNames()
        .filter((attribute) => attribute.startsWith('data-'))
        .map((attribute) => `[${attribute}]`)
        .join('');
      const classes = [...el.classList].map((item) => `.${item}`).join('');
      return `${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ''}${classes}${attributes}`;
    };
    const path = (el: Element) => {
      const chain: string[] = [];
      for (
        let node: Element | null = el;
        node && node !== document.body && chain.length < 3;
        node = node.parentElement
      ) {
        chain.unshift(name(node));
      }
      return chain.join(' > ');
    };
    const flagged: Element[] = [];
    for (const el of document.body.querySelectorAll('*')) {
      const box = el.getBoundingClientRect();
      if (
        (box.width === 0 && box.height === 0) ||
        (box.right <= limit &&
          (clips(el) || box.left + el.scrollWidth <= limit)) ||
        fixed(el) ||
        contained(el)
      ) {
        continue;
      }
      flagged.push(el);
    }
    const reported = flagged.filter(
      (el) => !flagged.some((other) => other !== el && el.contains(other)),
    );
    return reported
      .slice(0, 5)
      .map(
        (el) =>
          `${path(el)} ends at ${Math.round(Math.max(el.getBoundingClientRect().right, el.getBoundingClientRect().left + el.scrollWidth))}px of ${window.innerWidth}`,
      );
  });
}

async function sideways(page: Page): Promise<number> {
  await page.addStyleTag({
    content: 'html, body { overflow-x: visible !important }',
  });
  return page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
}

const PR1_URLS = [
  ...Object.values(SERVICE_PAIRS).flatMap((pair) => [pair.en, pair.es]),
  ...HOLDED_PAGES,
  VERIFACTU_PAGE,
  SECTOR_PAGE,
];

for (const url of PR1_URLS) {
  test(`${url} has no horizontal scroll at 360`, async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 780 });
    await gotoHydrated(page, url);
    const named = await overflowing(page);
    expect(await sideways(page), named.join('\n')).toBeLessThanOrEqual(0);
  });
}

for (const url of OVERFLOW_URLS) {
  test(`${url} has no horizontal scroll on mobile`, async ({ page }) => {
    await page.setViewportSize({ width: 412, height: 915 });
    await gotoHydrated(page, url);
    const named = await overflowing(page);
    expect(await sideways(page), named.join('\n')).toBeLessThanOrEqual(0);
  });
}

test("the overflow walk can't go blind", async ({ page }) => {
  await page.setViewportSize({ width: 412, height: 915 });
  await gotoHydrated(page, '/');
  const probe = (html: string) =>
    page.evaluate((markup) => {
      document.querySelector('[data-probe-host]')?.remove();
      const host = document.createElement('div');
      host.setAttribute('data-probe-host', '');
      host.innerHTML = markup;
      document.querySelector('main')?.appendChild(host);
    }, html);
  const cases = [
    '<div data-overflow-probe style="width:150vw;height:1px"></div>',
    '<p data-overflow-probe style="width:200px;white-space:nowrap">Supercalifragilisticexpialidocious_and_a_very_long_unbreakable_word_that_runs_on</p>',
    '<style>[data-overflow-probe]::after{content:"";position:absolute;left:0;top:0;width:150vw;height:1px}</style><div data-overflow-probe style="position:relative;height:1px"></div>',
  ];
  for (const markup of cases) {
    await probe(markup);
    const found = await overflowing(page);
    expect(found.length, markup).toBeGreaterThan(0);
    expect(found.join(' ')).toContain('data-overflow-probe');
  }
  await probe(
    '<div style="overflow-x:auto"><div style="width:150vw;height:1px"></div></div>',
  );
  expect(await overflowing(page)).toEqual([]);
});
