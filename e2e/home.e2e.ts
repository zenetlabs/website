import { expect, test } from '@playwright/test';
import { formatPriceSummary } from '../src/lib/money';
import { SERVICES } from '../test/page-content';
import {
  BOOKING_PUBLISHED,
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
  'cases',
  'founder',
  'faq',
  'contact',
];

const HOMES = [
  {
    locale: 'en',
    path: '/',
    sections: COMMON,
    nav: ['/services', '/pricing', '/#cases', '/about'],
    faq: 15,
    pricing: '/pricing',
    cta: CTA.en,
    about: '/about',
    ladder: [
      '/pricing#diagnostic',
      '/services/ai-automation',
      '/services/ai-agents',
      '/services/custom-software',
      '/services/ai-training',
      '/pricing#maintenance',
      '/pricing#growth',
    ],
  },
  {
    locale: 'es',
    path: '/es',
    sections: ['companies', 'problems', 'verifactu', ...COMMON.slice(2)],
    nav: ['/es/servicios', '/es/precios', '/es#cases', '/es/sobre-nosotros'],
    faq: 16,
    pricing: '/es/precios',
    cta: CTA.es,
    about: '/es/sobre-nosotros',
    ladder: [
      '/es/precios#diagnostic',
      '/es/servicios/automatizacion-de-procesos',
      '/es/servicios/agentes-de-ia',
      '/es/servicios/desarrollo-de-software-a-medida',
      '/es/servicios/formacion-ia-equipos',
      '/es/precios#maintenance',
      '/es/precios#growth',
    ],
  },
] as const;

for (const home of HOMES) {
  test.describe(`home ${home.path}`, () => {
    test('lists the sections in order under one h1', async ({ page }) => {
      await gotoHydrated(page, home.path);
      const ids = await page
        .locator('main > section[id]')
        .evaluateAll((sections) => sections.map((section) => section.id));
      expect(ids).toEqual(home.sections);
      await expect(page.locator('h1')).toHaveCount(1);
      await expect(page.locator('main img')).toHaveCount(0);
    });

    test('shows the header nav and every anchor target exists', async ({
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
      expect(anchors.length).toBeGreaterThan(BOOKING_PUBLISHED ? 1 : 3);
      for (const id of anchors) {
        await expect(page.locator(`[id="${id}"]`), id).toHaveCount(1);
      }
    });

    test('sends the hero CTAs to the contact form and the prices', async ({
      page,
    }) => {
      await gotoHydrated(page, home.path);
      const hero = page.locator('main > section').first();
      const links = hero.getByRole('link');
      await expect(links.first()).toHaveAttribute('href', home.cta);
      await expect(links.nth(1)).toHaveAttribute('href', home.pricing);
    });

    test('links the ladder rows to the service pages and the pricing cards', async ({
      page,
    }) => {
      await gotoHydrated(page, home.path);
      const hrefs = await page
        .locator('#services ul a')
        .evaluateAll((links) => links.map((a) => a.getAttribute('href')));
      expect(hrefs).toEqual(home.ladder);
    });

    test('shows every price summary in the ladder', async ({ page }) => {
      await gotoHydrated(page, home.path);
      const text = (await page.locator('#services').innerText()).replace(
        /\s+/g,
        ' ',
      );
      for (const service of Object.values(SERVICES[home.locale])) {
        const summary = formatPriceSummary(home.locale, service.prices);
        expect(text).toContain(summary.replace(/\s+/g, ' '));
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

    test('shows the founder without an image and cases without figures', async ({
      page,
    }) => {
      await gotoHydrated(page, home.path);
      await expect(page.locator('#founder img')).toHaveCount(0);
      await expect(
        page.locator('#founder [aria-hidden="true"]').first(),
      ).toHaveText('AS');
      await expect(
        page.locator('#founder').getByRole('link', { name: /→$/ }),
      ).toHaveAttribute('href', home.about);
      await expect(page.locator('#cases dl')).toHaveCount(0);
    });

    test('links only the Viatsy card to its case page', async ({ page }) => {
      await gotoHydrated(page, home.path);
      const links = page.locator('#cases li a');
      await expect(links).toHaveCount(1);
      await expect(links).toHaveAttribute(
        'href',
        home.path === '/' ? '/case-studies/viatsy' : '/es/casos/viatsy',
      );
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
      menu.getByRole('link', { name: 'Book a diagnostic' }),
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
