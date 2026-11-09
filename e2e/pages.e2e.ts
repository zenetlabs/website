import { expect, test } from '@playwright/test';
import { jsonLdBlocks } from '../test/json-ld';
import {
  CASE_PAIR,
  CASES_HUB,
  CONTACT_PAIR,
  CTA,
  gotoHydrated,
  markdownPathOf,
  typesOf,
} from './helpers';

// The catalogue order: the diagnostic ticket, the three builds as on the home
// offer (integration, web, agent), then training, care and growth.
const SERVICE_IDS = [
  'diagnostic',
  'integration',
  'web',
  'agent',
  'training',
  'maintenance',
  'growth',
];

const PRICING = [
  {
    path: '/pricing',
    tax: 'exclude GST',
    cta: CTA.en,
  },
  {
    path: '/es/precios',
    tax: 'no incluyen el IVA',
    cta: CTA.es,
  },
] as const;

const ABOUT = [
  { path: '/about', cta: CTA.en },
  { path: '/es/sobre-nosotros', cta: CTA.es },
] as const;

// The diagnostic ticket links the booking CTA, then every block lists the
// pages about it (the names are plain text: the links sit beside them).
const CARD_LINKS: Record<string, (string | null)[][]> = {
  '/pricing': [
    [CTA.en, '/services/automation-diagnostic'],
    ['/services/ai-automation', '/services/integrations'],
    ['/services/custom-software'],
    ['/services/ai-agents'],
    ['/services/ai-training'],
    ['/services/maintenance'],
    [],
  ],
  '/es/precios': [
    [CTA.es, '/es/servicios/diagnostico-de-automatizacion'],
    ['/es/servicios/automatizacion-de-procesos', '/es/servicios/integraciones'],
    ['/es/servicios/desarrollo-de-software-a-medida'],
    ['/es/servicios/agentes-de-ia'],
    ['/es/servicios/formacion-ia-equipos'],
    ['/es/servicios/mantenimiento'],
    [],
  ],
};

for (const { path, tax, cta } of PRICING) {
  test.describe(path, () => {
    test('lists the seven services with their cards', async ({ page }) => {
      await gotoHydrated(page, path);
      const ids = await page
        .locator('main [data-service]')
        .evaluateAll((cards) =>
          cards.map((card) => card.getAttribute('data-service')),
        );
      expect(ids).toEqual(SERVICE_IDS);
      await expect(page.locator('main [data-service] h2')).toHaveCount(7);
      await expect(page.locator('h1')).toHaveCount(1);
      await expect(page.locator('main')).toContainText(tax);
    });

    test('links each card to its service pages', async ({ page }) => {
      await gotoHydrated(page, path);
      const hrefs = await page
        .locator('main [data-service]')
        .evaluateAll((cards) =>
          cards.map((card) =>
            [...card.querySelectorAll('a')].map((a) => a.getAttribute('href')),
          ),
        );
      expect(hrefs).toEqual(CARD_LINKS[path]);
    });

    test('links the CTA and answers the pricing questions inline', async ({
      page,
    }) => {
      await gotoHydrated(page, path);
      const links = page.locator('main section').last().getByRole('link');
      await expect(links).toHaveCount(1);
      await expect(links.first()).toHaveAttribute('href', cta);
      await expect(page.locator('#faq details')).not.toHaveCount(0);
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

test.describe('the contact page', () => {
  for (const [locale, path] of [
    ['en', CONTACT_PAIR.en],
    ['es', CONTACT_PAIR.es],
  ] as const) {
    test(`${path} puts the form and the address on a page of its own`, async ({
      page,
    }) => {
      await gotoHydrated(page, path);
      await expect(page.locator('h1')).toHaveCount(1);
      await expect(page.locator('#contact form')).toHaveCount(1);
      await expect(
        page.locator('#contact a[href="mailto:hello@zenetlabs.com"]'),
      ).toHaveCount(1);
      await expect(page.locator('html')).toHaveAttribute('lang', locale);
    });

    test(`${path} describes a contact page and a breadcrumb`, async ({
      request,
    }) => {
      const html = await (await request.get(path)).text();
      expect(typesOf(jsonLdBlocks(html))).toEqual([
        expect.stringMatching(/^(Organization|ProfessionalService)$/),
        'WebSite',
        'Person',
        'ContactPage',
        'BreadcrumbList',
      ]);
    });

    test(`${path} answers in markdown with the form copy`, async ({
      request,
    }) => {
      const body = await (await request.get(markdownPathOf(path))).text();
      expect(body).toContain('hello@zenetlabs.com');
    });
  }
});

test.describe('the cases hub', () => {
  for (const [path, viatsy] of [
    [CASES_HUB.en, CASE_PAIR.en],
    [CASES_HUB.es, CASE_PAIR.es],
  ] as const) {
    test(`${path} lists the cases and links the Viatsy page`, async ({
      page,
    }) => {
      await gotoHydrated(page, path);
      await expect(page.locator('h1')).toHaveCount(1);
      await expect(page.locator('#cases li.case-item')).toHaveCount(2);
      await expect(page.locator(`#cases a[href="${viatsy}"]`)).toHaveCount(1);
    });

    test(`${path} describes a collection and a breadcrumb`, async ({
      request,
    }) => {
      const html = await (await request.get(path)).text();
      expect(typesOf(jsonLdBlocks(html))).toEqual([
        expect.stringMatching(/^(Organization|ProfessionalService)$/),
        'WebSite',
        'Person',
        'CollectionPage',
        'BreadcrumbList',
      ]);
    });
  }
});
