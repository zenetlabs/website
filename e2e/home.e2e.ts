import { expect, type Page } from '@playwright/test';
import { home as enHome } from '../src/content/en/home';
import { priceParts } from '../src/lib/money';
import { SERVICES } from '../test/page-content';
import { test } from './fixtures';
import {
  ASSISTANT_PUBLISHED,
  BOOKING_PUBLISHED,
  CASES_HUB,
  CTA,
  gotoHydrated,
  navLinks,
  settleAnimations,
  VOICE_PUBLISHED,
  waitForHydration,
} from './helpers';

const COMMON = [
  'companies',
  'problems',
  'services',
  'process',
  'faq',
  'contact',
];

const HOMES = [
  {
    locale: 'en',
    path: '/',
    sections: COMMON,
    nav: ['/services', '/pricing', '/case-studies', '/about'],
    faq: 15,
    pricing: '/pricing',
    cta: CTA.en,
    about: '/about',
    offer: [
      '/services/automation-diagnostic',
      '/services/ai-automation',
      '/services/custom-software',
      '/services/ai-agents',
      '/services/ai-training',
      '/services/maintenance',
    ],
  },
  {
    locale: 'es',
    path: '/es',
    sections: [...COMMON.slice(0, 4), 'verifactu', ...COMMON.slice(4)],
    nav: ['/es/servicios', '/es/precios', '/es/casos', '/es/sobre-nosotros'],
    faq: 16,
    pricing: '/es/precios',
    cta: CTA.es,
    about: '/es/sobre-nosotros',
    offer: [
      '/es/servicios/diagnostico-de-automatizacion',
      '/es/servicios/automatizacion-de-procesos',
      '/es/servicios/desarrollo-de-software-a-medida',
      '/es/servicios/agentes-de-ia',
      '/es/servicios/formacion-ia-equipos',
      '/es/servicios/mantenimiento',
    ],
  },
] as const;

for (const home of HOMES) {
  test.describe(`home ${home.path}`, () => {
    test('lists the sections in order under one h1', async ({ page }) => {
      await gotoHydrated(page, home.path);
      const ids = await page
        .locator('main section[id]')
        .evaluateAll((sections) => sections.map((section) => section.id));
      expect(ids).toEqual(home.sections);
      await expect(page.locator('h1')).toHaveCount(1);
      await expect(page.locator('main img')).toHaveCount(0);
    });

    test('shows the header nav and every in-page anchor target exists', async ({
      page,
    }) => {
      await page.setViewportSize({ width: 1280, height: 900 });
      await gotoHydrated(page, home.path);
      const hrefs = await navLinks(page).evaluateAll((links) =>
        links.map((link) => link.getAttribute('href')),
      );
      expect(hrefs).toEqual(home.nav);
      const anchors = await page
        .locator('main a[href*="#"], header a[href*="#"]')
        .evaluateAll((links) =>
          links.flatMap((link) => {
            const url = new URL(link.getAttribute('href') ?? '', location.href);
            return url.pathname === location.pathname && url.hash
              ? [url.hash.slice(1)]
              : [];
          }),
        );
      for (const id of anchors) {
        await expect(page.locator(`[id="${id}"]`), id).toHaveCount(1);
      }
    });

    test("the hero's only action is Book a call", async ({ page }) => {
      await gotoHydrated(page, home.path);
      const hero = page.locator('main > section').first();
      await expect(hero.getByRole('link').first()).toHaveAttribute(
        'href',
        home.cta,
      );
      await expect(hero.locator('.hero-actions a')).toHaveCount(1);
      await expect(hero.locator(`a[href="${home.pricing}"]`)).toHaveCount(0);
    });

    test('fits the heading, the button and the whole desk in the first screen', async ({
      page,
    }) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      await gotoHydrated(page, home.path);
      const box = async (selector: string) => {
        const found = await page.locator(selector).first().boundingBox();
        if (!found) throw new Error(`${selector} has no box`);
        return found;
      };
      const button = await box('.hero-actions a');
      const desk = await box('[data-desk]');
      expect(desk.y + desk.height).toBeLessThanOrEqual(900);
      expect(desk.y).toBeGreaterThan(button.y + button.height);
      expect(Math.abs(desk.x + desk.width / 2 - 720)).toBeLessThanOrEqual(2);
      await page.setViewportSize({ width: 390, height: 844 });
      await expect(
        page.locator('main > section:first-child a').first(),
      ).toBeInViewport({ ratio: 1 });
    });

    test('links the offer to the service pages, diagnostic first', async ({
      page,
    }) => {
      await gotoHydrated(page, home.path);
      const hrefs = await page
        .locator('#services h3 a')
        .evaluateAll((links) => links.map((a) => a.getAttribute('href')));
      expect(hrefs).toEqual(home.offer);
    });

    test('shows every price of the offer, growth aside', async ({ page }) => {
      await gotoHydrated(page, home.path);
      const text = (await page.locator('#services').innerText()).replace(
        /\s+/g,
        ' ',
      );
      for (const service of Object.values(SERVICES[home.locale])) {
        if (service.id === 'growth') continue;
        for (const price of service.prices) {
          const { amount } = priceParts(home.locale, price);
          expect(text).toContain(amount.replace(/\s+/g, ' '));
        }
      }
    });

    test('keeps the FAQ native, collapsed and keyboard friendly', async ({
      page,
    }) => {
      await gotoHydrated(page, home.path);
      const items = page.locator('#faq details');
      await expect(items).toHaveCount(home.faq);
      await expect(page.locator('#faq details[open]')).toHaveCount(0);

      const first = items.first().locator('summary');
      await first.focus();
      await page.keyboard.press('Enter');
      await expect(items.first()).toHaveAttribute('open', '');
      await expect(items.first().locator('p')).toBeVisible();
      await page.keyboard.press('Space');
      await expect(items.first()).not.toHaveAttribute('open', '');
      await page.keyboard.press('Tab');
      await expect(items.nth(1).locator('summary')).toBeFocused();
    });

    test('scrolls to a question from its deep link', async ({ page }) => {
      await gotoHydrated(page, `${home.path}#faq-prices`);
      await expect(page.locator('#faq-prices')).toBeInViewport();
    });

    test('hands over to the founder in the hero, without an image', async ({
      page,
    }) => {
      await gotoHydrated(page, home.path);
      const handoff = page.locator(
        'main > section:first-child .hero-pitch .handoff',
      );
      await expect(handoff.locator('img')).toHaveCount(0);
      await expect(handoff.locator('[aria-hidden="true"]')).toHaveText('AS');
      await expect(handoff).toHaveAttribute('href', home.about);
    });
  });
}

test('the Verifactu strip is Spanish only and dated', async ({ page }) => {
  await gotoHydrated(page, '/');
  await expect(page.locator('#verifactu')).toHaveCount(0);
  await gotoHydrated(page, '/es');
  const strip = page.locator('#verifactu');
  for (const text of [
    '1 de enero de 2027',
    '1 de julio de 2027',
    'SII',
    'País Vasco',
    'Fechas revisadas el',
  ]) {
    await expect(strip).toContainText(text);
  }
  await expect(strip.getByRole('link', { name: 'Verifactu' })).toHaveAttribute(
    'href',
    '/es/verifactu-integracion',
  );
});

test('marks the current page in the header', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await gotoHydrated(page, '/pricing');
  await expect(navLinks(page).nth(1)).toHaveAttribute('aria-current', 'page');
  await expect(
    page.locator('header nav[aria-label="Main"] [aria-current="page"]'),
  ).toHaveCount(2);
  await gotoHydrated(page, '/es/sobre-nosotros');
  await expect(navLinks(page).nth(3)).toHaveAttribute('aria-current', 'page');
});

test.describe('mobile menu', () => {
  test.use({ viewport: { width: 412, height: 915 } });

  test('opens, navigates, closes and carries the CTA', async ({ page }) => {
    await gotoHydrated(page, '/');
    const menu = page.locator('header details');
    await menu.locator('summary').click();
    await expect(menu).toHaveAttribute('open', '');
    await expect(
      menu.getByRole('link', { name: 'Book a call' }),
    ).toHaveAttribute('href', CTA.en);
    await menu.getByRole('link', { name: 'Services' }).click();
    await expect(page).toHaveURL(/\/services$/);
    await waitForHydration(page);
    await expect(page.locator('header details')).not.toHaveAttribute(
      'open',
      '',
    );
  });
});

test.describe('case bullets fold on mobile only', () => {
  test('are collapsed at 390 until the summary is opened', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await gotoHydrated(page, CASES_HUB.en);
    const first = page.locator('#cases li').first();
    const bullets = first.locator('ul li').first();
    await expect(bullets).toBeHidden();
    await first.locator('summary').click();
    await expect(bullets).toBeVisible();
  });

  test('are open with no toggle at 1280', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await gotoHydrated(page, CASES_HUB.en);
    const first = page.locator('#cases li').first();
    await expect(first.locator('ul li').first()).toBeVisible();
    await expect(first.locator('summary')).toBeHidden();
  });
});

const BANNER = '[data-consent-banner]';
const PATHS = ['/', '/es'] as const;
const DESKTOP = { width: 1280, height: 800 };
const SHORT = { width: 1280, height: 720 };
const VIEWPORTS = [DESKTOP, SHORT, { width: 1024, height: 768 }];
const NO_CONSENT = { cookies: [], origins: [] };

test.describe('the hero button clears the consent banner', () => {
  test.use({ storageState: NO_CONSENT });

  for (const path of PATHS) {
    for (const viewport of VIEWPORTS) {
      test(`${path} at ${viewport.width}x${viewport.height}`, async ({
        page,
      }) => {
        await page.setViewportSize(viewport);
        await gotoHydrated(page, path);
        await expect(page.locator(BANNER)).toBeVisible();
        const edges = await page.evaluate(() => {
          const cta = document.querySelector('.hero-actions a');
          const banner = document.querySelector('[data-consent-banner]');
          return {
            cta: cta?.getBoundingClientRect().bottom ?? Number.NaN,
            banner: banner?.getBoundingClientRect().top ?? Number.NaN,
          };
        });
        expect(edges.cta).toBeLessThanOrEqual(edges.banner - 8);
      });
    }
  }
});

test.describe('the desk is one surface, its call in the head', () => {
  test.use({ viewport: DESKTOP });

  test('keeps no rule, tint or call row, and the call beside the badge', async ({
    page,
  }) => {
    await gotoHydrated(page, '/');
    const style = await page.evaluate(() => {
      const read = (selector: string) => {
        const element = document.querySelector(selector);
        if (!element) return null;
        const css = getComputedStyle(element);
        return {
          bottom: css.borderBottomWidth,
          top: css.borderTopWidth,
          background: css.backgroundColor,
        };
      };
      return {
        head: read('[data-desk] .desk-head'),
        rail: read('[data-desk] [data-slot-rail]'),
      };
    });
    expect(style.head?.bottom).toBe('0px');
    expect(style.rail?.top).toBe('0px');
    expect(style.rail?.background).toBe('rgba(0, 0, 0, 0)');
    await expect(page.locator('[data-desk] .desk-call')).toHaveCount(0);
    const door = page.locator('[data-desk] .desk-head [data-voice-button]');
    if (ASSISTANT_PUBLISHED && VOICE_PUBLISHED) {
      await expect(door).toBeVisible();
      await expect(door).toHaveAttribute(
        'aria-label',
        enHome.desk.call?.label ?? '',
      );
    } else {
      await expect(door).toHaveCount(0);
    }
  });
});

async function launcherHits(page: Page): Promise<string[]> {
  await expect(page.locator('[data-desk] .slot-chip').first()).toBeVisible();
  return page.evaluate(() => {
    const launcher = document
      .querySelector('[data-chat-launcher]')
      ?.getBoundingClientRect();
    if (!launcher) return ['no launcher'];
    return [
      ...document.querySelectorAll(
        '[data-desk] a, [data-desk] [data-slot-meta], .handoff',
      ),
    ]
      .filter((element) => {
        const box = element.getBoundingClientRect();
        return (
          box.width > 0 &&
          box.left < launcher.right &&
          box.right > launcher.left &&
          box.top < launcher.bottom &&
          box.bottom > launcher.top
        );
      })
      .map((element) => element.textContent?.trim() ?? '');
  });
}

test.describe('the launcher covers nothing in the desk', () => {
  test.skip(
    !(ASSISTANT_PUBLISHED && BOOKING_PUBLISHED),
    'needs the assistant and booking published',
  );

  test.describe('with the banner', () => {
    test.use({ storageState: NO_CONSENT });

    for (const path of PATHS) {
      test(`${path} at ${DESKTOP.width}x${DESKTOP.height} with the banner`, async ({
        page,
      }) => {
        await page.setViewportSize(DESKTOP);
        await gotoHydrated(page, path);
        await expect(page.locator(BANNER)).toBeVisible();
        expect(await launcherHits(page)).toEqual([]);
      });
    }
  });

  test.describe('without the banner', () => {
    for (const path of PATHS) {
      for (const viewport of [...VIEWPORTS, { width: 1366, height: 768 }]) {
        test(`${path} at ${viewport.width}x${viewport.height}`, async ({
          page,
        }) => {
          await page.setViewportSize(viewport);
          await gotoHydrated(page, path);
          expect(await launcherHits(page)).toEqual([]);
        });
      }
    }
  });
});

test.describe('the launcher on a phone', () => {
  test.skip(!ASSISTANT_PUBLISHED, 'needs the assistant published');
  test.use({ viewport: { width: 390, height: 844 } });

  test('gives way while the hero desk is in view and returns past it', async ({
    page,
  }) => {
    await gotoHydrated(page, '/');
    const launcher = page.locator('[data-chat-launcher]');
    await expect(page.locator('[data-desk]')).toBeInViewport();
    await expect(launcher).toBeHidden();
    await page.locator('#problems').scrollIntoViewIfNeeded();
    await expect(page.locator('[data-desk]')).not.toBeInViewport();
    await expect(launcher).toBeVisible();
  });
});

test.describe('the home height at 390', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  for (const [path, budget] of [
    ['/', 8500],
    ['/es', 9500],
  ] as const) {
    test(`${path} stays within ${budget}`, async ({ page }) => {
      await gotoHydrated(page, path);
      await page.evaluate(() => document.fonts.ready);
      await settleAnimations(page);
      await expect(
        page
          .locator('[data-desk] [data-slot-rail]')
          .locator('.slot-chip, [data-slot-fallback]')
          .first(),
      ).toBeVisible();
      const height = await page.evaluate(
        () => document.documentElement.scrollHeight,
      );
      expect(height).toBeLessThanOrEqual(budget);
    });
  }
});
