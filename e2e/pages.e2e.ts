import { expect } from '@playwright/test';
import { PORTFOLIO } from '../src/lib/portfolio';
import { INCLUDES } from '../test/inner-content';
import { jsonLdBlocks } from '../test/json-ld';
import { test } from './fixtures';
import {
  BOOKING_PUBLISHED,
  CALCULATOR_PUBLISHED,
  CASE_PAIR,
  CASES_HUB,
  CONTACT_PAIR,
  CTA,
  gotoHydrated,
  markdownPathOf,
  typesOf,
} from './helpers';

// The ladder, left to right: the diagnostic, the three builds as on the home
// offer (integration, web, agent), care and growth, then the training line.
const SERVICE_IDS = [
  'diagnostic',
  'integration',
  'web',
  'agent',
  'maintenance',
  'growth',
  'training',
];

const PRICING = [
  {
    path: '/pricing',
    tax: 'exclude GST',
    locale: 'en',
    contact: CONTACT_PAIR.en,
  },
  {
    path: '/es/precios',
    tax: 'no incluyen el IVA',
    locale: 'es',
    contact: CONTACT_PAIR.es,
  },
] as const;

const ABOUT = [
  {
    path: '/about',
    cta: CTA.en,
    cases: CASES_HUB.en,
    contact: CONTACT_PAIR.en,
  },
  {
    path: '/es/sobre-nosotros',
    cta: CTA.es,
    cases: CASES_HUB.es,
    contact: CONTACT_PAIR.es,
  },
] as const;

// The diagnostic ticket links the booking CTA, then every block lists the
// pages about it (the names are plain text: the links sit beside them).
const CARD_LINKS: Record<string, (string | null)[][]> = {
  '/pricing': [
    [CTA.en, '/services/automation-diagnostic'],
    ['/services/ai-automation', '/services/integrations'],
    ['/services/custom-software'],
    ['/services/ai-agents'],
    ['/services/maintenance'],
    [],
    ['/services/ai-training'],
  ],
  '/es/precios': [
    [CTA.es, '/es/servicios/diagnostico-de-automatizacion'],
    ['/es/servicios/automatizacion-de-procesos', '/es/servicios/integraciones'],
    ['/es/servicios/desarrollo-de-software-a-medida'],
    ['/es/servicios/agentes-de-ia'],
    ['/es/servicios/mantenimiento'],
    [],
    ['/es/servicios/formacion-ia-equipos'],
  ],
};

for (const { path, tax, locale, contact } of PRICING) {
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
      await expect(page.locator('.ladder')).toHaveCount(1);
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

    test('answers the pricing questions inline and closes with the desk', async ({
      page,
    }) => {
      await gotoHydrated(page, path);
      await expect(page.locator('#faq details')).not.toHaveCount(0);
      const close = page.locator('#contact');
      await expect(
        close.locator('a[data-cta="close_contact"]'),
      ).toHaveAttribute('href', contact);
      const questions = await page
        .locator('#faq summary')
        .evaluateAll((items) =>
          items.slice(0, 2).map((item) => item.textContent?.trim() ?? ''),
        );
      const hrefs = await close
        .locator('.desk-chip')
        .evaluateAll((links) => links.map((a) => a.getAttribute('href')));
      expect(hrefs).toEqual(
        questions.map(
          (question) =>
            `${contact}?${new URLSearchParams({ message: question })}`,
        ),
      );
    });

    test('keeps the includes lists on the service pages', async ({ page }) => {
      await gotoHydrated(page, path);
      const [agentFirst] = INCLUDES[locale].agent;
      await expect(page.locator('main')).not.toContainText(agentFirst ?? '');
      const [growthFirst] = INCLUDES[locale].growth;
      await expect(page.locator('main [data-service="growth"]')).toContainText(
        growthFirst ?? '',
      );
      await expect(
        page.locator('main [data-service="diagnostic"] li'),
      ).toHaveCount(4);
    });

    test('titles the pricing rules and hides the calculator while it is dark', async ({
      page,
    }) => {
      await gotoHydrated(page, path);
      await expect(page.locator('#how-title ~ div li h3')).toHaveCount(4);
      if (!CALCULATOR_PUBLISHED) {
        await expect(page.locator('main a[href*="calculator"]')).toHaveCount(0);
      }
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

for (const { path, cta, cases, contact } of ABOUT) {
  test.describe(path, () => {
    test('shows the founder, the principles and the companies', async ({
      page,
    }) => {
      await gotoHydrated(page, path);
      await expect(page.locator('h1')).toHaveCount(1);
      await expect(page.locator('main img')).toHaveCount(0);
      await expect(page.locator('#founder .monogram')).toHaveText('AS');
      await expect(
        page.getByRole('link', { name: 'Brisa', exact: true }),
      ).toHaveCount(1);
      const hrefs = await page
        .locator('#companies-title ~ ul a')
        .evaluateAll((links) => links.map((a) => a.getAttribute('href')));
      expect(hrefs).toEqual(PORTFOLIO.map(({ href }) => href));
      const hero = page.locator('main section').first().getByRole('link');
      await expect(hero.nth(0)).toHaveAttribute('href', cta);
      await expect(hero.nth(1)).toHaveAttribute('href', cases);
    });

    test('closes with the desk and the default suggestions', async ({
      page,
    }) => {
      await gotoHydrated(page, path);
      const close = page.locator('#contact');
      await expect(
        close.locator('a[data-cta="close_contact"]'),
      ).toHaveAttribute('href', contact);
      await expect(close.locator('.desk-chip')).toHaveCount(2);
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

    test(`${path} puts the desk and its times in the hero, and the diagnostic as the stub`, async ({
      page,
    }) => {
      await gotoHydrated(page, path);
      if (BOOKING_PUBLISHED) {
        await expect(
          page.locator('[data-contact-desk] .contact-book'),
        ).toHaveCount(1);
      }
      await expect(page.locator('[data-contact-desk]')).toHaveCount(1);
      await expect(page.locator('#next .rail > li')).toHaveCount(3);
      await expect(page.locator('#next [data-stub]')).toHaveText(
        locale === 'en' ? /The diagnostic/ : /El diagnóstico/,
      );
      await expect(page.locator('#next .rail > li').nth(1)).toHaveAttribute(
        'data-stub',
        '',
      );
    });

    test(`${path} shows no desk when it arrives with a message`, async ({
      page,
    }) => {
      await gotoHydrated(page, `${path}?message=Hello%20there`);
      await expect(page.locator('[data-contact-desk]')).toHaveCount(0);
      await expect(page.locator('#contact textarea')).toHaveValue(
        'Hello there',
      );
      if (BOOKING_PUBLISHED) {
        await expect(
          page.locator('#contact a[data-cta="contact_book"]'),
        ).toHaveAttribute('href', CTA[locale]);
      }
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
      await expect(page.locator('#cases [data-flow-board]')).toHaveCount(1);
      await expect(
        page
          .locator('#cases li.case-item')
          .first()
          .locator('[data-flow-board]'),
      ).toHaveCount(1);
      const hrefs = await page
        .locator('#companies-title ~ ul a')
        .evaluateAll((links) => links.map((a) => a.getAttribute('href')));
      expect(hrefs).toEqual(PORTFOLIO.map(({ href }) => href));
    });

    test(`${path} shows the two approved figures and no other`, async ({
      page,
    }) => {
      await gotoHydrated(page, path);
      const [viatsyFigure, taplanyFigure] = [
        page.locator('#cases li.case-item').nth(0).locator('dd'),
        page.locator('#cases li.case-item').nth(1).locator('dd'),
      ];
      await expect(viatsyFigure).toHaveCount(1);
      await expect(taplanyFigure).toHaveCount(1);
      await expect(taplanyFigure).toHaveText(
        path === CASES_HUB.en ? 'about 40' : 'unos 40',
      );
      await expect(viatsyFigure).toHaveText(
        path === CASES_HUB.en ? '8 h estimated' : '8 h estimación',
      );
    });

    test(`${path} closes with the desk and its write door`, async ({
      page,
    }) => {
      await gotoHydrated(page, path);
      await expect(
        page.locator('#contact a[data-cta="close_contact"]'),
      ).toHaveAttribute(
        'href',
        path === CASES_HUB.en ? '/contact' : '/es/contacto',
      );
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
