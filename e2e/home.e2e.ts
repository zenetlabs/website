import { expect, test } from '@playwright/test';
import { priceParts } from '../src/lib/money';
import { SERVICES } from '../test/page-content';
import {
  CASES_HUB,
  CTA,
  gotoHydrated,
  navLinks,
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

    test('sends the hero CTAs to the booking target and the prices', async ({
      page,
    }) => {
      await gotoHydrated(page, home.path);
      const hero = page.locator('main > section').first();
      const links = hero.getByRole('link');
      await expect(links.first()).toHaveAttribute('href', home.cta);
      await expect(links.nth(1)).toHaveAttribute('href', home.pricing);
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
      const button = await box('main > section:first-child a');
      const desk = await box('[data-desk]');
      expect(button.y + button.height).toBeLessThanOrEqual(900);
      expect(desk.y + desk.height).toBeLessThanOrEqual(900);
      expect(desk.x).toBeGreaterThan(button.x);
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
      const handoff = page.locator('main > section:first-child .handoff');
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
  await expect(
    strip.getByRole('link', { name: /Verifactu →$/ }),
  ).toHaveAttribute('href', '/es/verifactu-integracion');
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
