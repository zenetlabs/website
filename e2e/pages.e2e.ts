import { expect, test } from '@playwright/test';
import { jsonLdBlocks } from '../test/json-ld';
import { gotoHydrated, typesOf } from './helpers';

const SERVICE_IDS = [
  'diagnostic',
  'integration',
  'agent',
  'web',
  'training',
  'maintenance',
  'growth',
];

const PRICING = [
  {
    path: '/pricing',
    tax: 'exclude GST',
    cta: '/#contact',
    faq: '/#faq',
  },
  {
    path: '/es/precios',
    tax: 'no incluyen el IVA',
    cta: '/es#contact',
    faq: '/es#faq',
  },
] as const;

const ABOUT = [
  { path: '/about', cta: '/#contact' },
  { path: '/es/sobre-nosotros', cta: '/es#contact' },
] as const;

const CARD_LINKS: Record<string, (string | null)[][]> = {
  '/pricing': [
    [],
    ['/services/ai-automation', '/services/integrations'],
    ['/services/ai-agents'],
    ['/services/custom-software'],
    ['/services/ai-training'],
    [],
    [],
  ],
  '/es/precios': [
    [],
    ['/es/servicios/automatizacion-de-procesos', '/es/servicios/integraciones'],
    ['/es/servicios/agentes-de-ia'],
    ['/es/servicios/desarrollo-de-software-a-medida'],
    ['/es/servicios/formacion-ia-equipos'],
    [],
    [],
  ],
};

for (const { path, tax, cta, faq } of PRICING) {
  test.describe(path, () => {
    test('lists the seven services with their cards', async ({ page }) => {
      await gotoHydrated(page, path);
      const ids = await page
        .locator('main article[id]')
        .evaluateAll((cards) => cards.map((card) => card.id));
      expect(ids).toEqual(SERVICE_IDS);
      await expect(page.locator('main article > div h2')).toHaveCount(7);
      await expect(page.locator('h1')).toHaveCount(1);
      await expect(page.locator('main')).toContainText(tax);
    });

    test('links each card to its service pages', async ({ page }) => {
      await gotoHydrated(page, path);
      const hrefs = await page
        .locator('main article')
        .evaluateAll((cards) =>
          cards.map((card) =>
            [...card.querySelectorAll('a')].map((a) => a.getAttribute('href')),
          ),
        );
      expect(hrefs).toEqual(CARD_LINKS[path]);
    });

    test('links the CTA and the FAQ', async ({ page }) => {
      await gotoHydrated(page, path);
      const links = page.locator('main section').last().getByRole('link');
      await expect(links.first()).toHaveAttribute('href', cta);
      await expect(links.nth(1)).toHaveAttribute('href', faq);
    });

    test('describes the ladder in JSON-LD', async ({ request }) => {
      const html = await (await request.get(path)).text();
      expect(typesOf(jsonLdBlocks(html))).toEqual([
        expect.stringMatching(/^(Organization|ProfessionalService)$/),
        'WebSite',
        'Person',
        'OfferCatalog',
        'BreadcrumbList',
      ]);
    });
  });
}

for (const { path, cta } of ABOUT) {
  test.describe(path, () => {
    test('shows the founder, the principles and the companies', async ({
      page,
    }) => {
      await gotoHydrated(page, path);
      await expect(page.locator('h1')).toHaveCount(1);
      await expect(page.locator('main img')).toHaveCount(0);
      await expect(
        page.locator('main [aria-hidden="true"]').first(),
      ).toHaveText('AS');
      await expect(
        page.getByRole('link', { name: 'Brisa', exact: true }),
      ).toHaveCount(1);
      await expect(page.locator('#companies-title + p + ul a')).toHaveCount(5);
      await expect(
        page.locator('main section').last().getByRole('link'),
      ).toHaveAttribute('href', cta);
    });

    test('describes the founder and the breadcrumb in JSON-LD', async ({
      request,
    }) => {
      const html = await (await request.get(path)).text();
      expect(typesOf(jsonLdBlocks(html))).toEqual([
        expect.stringMatching(/^(Organization|ProfessionalService)$/),
        'WebSite',
        'Person',
        'BreadcrumbList',
      ]);
    });
  });
}
