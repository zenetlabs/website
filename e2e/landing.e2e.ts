import { expect, test } from '@playwright/test';
import { verifactuDates } from '../src/content/es/verifactu';
import { formatPriceSummary } from '../src/lib/money';
import { jsonLdBlocks } from '../test/json-ld';
import { SERVICES } from '../test/page-content';
import {
  CASE_PAIR,
  CTA,
  gotoHydrated,
  HOLDED_PAGES,
  navLinks,
  SECTOR_PAGE,
  typesOf,
  VERIFACTU_PAGE,
  waitForHydration,
} from './helpers';

const ENTITY = expect.stringMatching(/^(Organization|ProfessionalService)$/);
const LAYOUT = [ENTITY, 'WebSite', 'Person'];

const ES_PAGES = [...HOLDED_PAGES, VERIFACTU_PAGE, SECTOR_PAGE];

const INTEGRATION_PRICE = formatPriceSummary(
  'es',
  SERVICES.es.integration.prices,
);

for (const path of ES_PAGES) {
  test.describe(path, () => {
    test('answers first: one h1, the facts and the integration price', async ({
      page,
    }) => {
      await page.setViewportSize({ width: 1280, height: 900 });
      await gotoHydrated(page, path);
      await expect(page.locator('h1')).toHaveCount(1);
      await expect(page.locator('h1')).toBeVisible();
      await expect(page.locator('main img')).toHaveCount(0);
      const facts = page.locator('main dl').first();
      await expect(facts.locator('dt')).toHaveCount(4);
      await expect(facts.locator('dd').nth(1)).toContainText(INTEGRATION_PRICE);
      await expect(facts.locator('dd').nth(1)).toContainText('IVA no incluido');
    });

    test('sends the call to action to the contact form and the price to pricing', async ({
      page,
    }) => {
      await gotoHydrated(page, path);
      const hero = page.locator('main section').first();
      await expect(hero.getByRole('link').nth(-2)).toHaveAttribute(
        'href',
        CTA.es,
      );
      await expect(hero.getByRole('link').last()).toHaveAttribute(
        'href',
        '/es/precios#integration',
      );
      await expect(page.locator('#cta-title ~ div a').first()).toHaveAttribute(
        'href',
        CTA.es,
      );
    });

    test('opens a question by keyboard and from its deep link', async ({
      page,
    }) => {
      await gotoHydrated(page, path);
      const items = page.locator('#faq details');
      await expect(page.locator('#faq details[open]')).toHaveCount(0);
      await items.first().locator('summary').focus();
      await page.keyboard.press('Enter');
      await expect(items.first()).toHaveAttribute('open', '');
      await expect(items.first().locator('p')).toBeVisible();
      await page.keyboard.press('Space');
      await expect(items.first()).not.toHaveAttribute('open', '');

      const second = await items.nth(1).getAttribute('id');
      await gotoHydrated(page, `${path}#${second}`);
      await expect(page.locator(`[id="${second}"]`)).toBeInViewport();
    });

    test('switches to the English integrations page or the home page', async ({
      page,
    }) => {
      await gotoHydrated(page, path);
      await page
        .getByRole('navigation', { name: 'Idioma' })
        .first()
        .getByRole('link', { name: 'EN' })
        .click();
      await expect(page).toHaveURL(
        HOLDED_PAGES.some((holded) => holded === path)
          ? '/services/integrations'
          : '/',
      );
      await waitForHydration(page);
    });
  });
}

test.describe('Holded pairs', () => {
  for (const path of HOLDED_PAGES) {
    test(`${path} nests under services and integrations and lists the sync`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: 1280, height: 900 });
      await gotoHydrated(page, path);
      const trail = page.locator('main nav ol a');
      await expect(trail).toHaveCount(3);
      await expect(trail.nth(1)).toHaveAttribute('href', '/es/servicios');
      await expect(trail.nth(2)).toHaveAttribute(
        'href',
        '/es/servicios/integraciones',
      );
      await expect(page.locator('main nav [aria-current="page"]')).toHaveCount(
        1,
      );
      await expect(page.locator('#sync table th[scope="col"]')).toHaveCount(3);
      await expect(page.locator('#sync tbody tr')).toHaveCount(
        path.endsWith('hubspot') ? 5 : 6,
      );
      await expect(page.locator('#edge-cases h3')).toHaveCount(6);
      await expect(page.locator('#faq details')).toHaveCount(4);
    });

    test(`${path} describes a service, a breadcrumb and a FAQ in JSON-LD`, async ({
      request,
    }) => {
      const html = await (await request.get(path)).text();
      expect(typesOf(jsonLdBlocks(html))).toEqual([
        ...LAYOUT,
        'Service',
        'BreadcrumbList',
        'FAQPage',
      ]);
    });
  }

  test('the integrations page links its three pairs', async ({ page }) => {
    await gotoHydrated(page, '/es/servicios/integraciones');
    const hrefs = await page
      .locator('#use-cases h3 a')
      .evaluateAll((links) => links.map((a) => a.getAttribute('href')));
    expect(hrefs).toEqual([...HOLDED_PAGES]);
  });
});

test.describe(VERIFACTU_PAGE, () => {
  test('shows the checked dates, the disclaimer and no breadcrumb', async ({
    page,
  }) => {
    await gotoHydrated(page, VERIFACTU_PAGE);
    const deadlines = page.locator('#deadlines');
    await expect(deadlines).toContainText(
      `antes del ${verifactuDates.companies}`,
    );
    await expect(deadlines).toContainText(`antes del ${verifactuDates.others}`);
    await expect(deadlines).toContainText(
      `Fechas revisadas el ${verifactuDates.checkedOn}.`,
    );
    await expect(page.locator('main')).toContainText(
      'no es asesoramiento fiscal ni jurídico',
    );
    await expect(page.locator('main nav')).toHaveCount(0);
    await expect(page.locator('main')).not.toContainText(/certificad/i);
  });

  test('opens the SII question from its deep link', async ({ page }) => {
    await gotoHydrated(page, `${VERIFACTU_PAGE}#faq-verifactu-sii`);
    await expect(page.locator('[id="faq-verifactu-sii"]')).toBeInViewport();
  });

  test('describes a service, a breadcrumb and a FAQ in JSON-LD', async ({
    request,
  }) => {
    const html = await (await request.get(VERIFACTU_PAGE)).text();
    expect(typesOf(jsonLdBlocks(html))).toEqual([
      ...LAYOUT,
      'Service',
      'BreadcrumbList',
      'FAQPage',
    ]);
  });

  test('is linked from the Spanish home strip', async ({ page }) => {
    await gotoHydrated(page, '/es');
    await expect(
      page.locator('#verifactu').getByRole('link', { name: /Verifactu →$/ }),
    ).toHaveAttribute('href', VERIFACTU_PAGE);
  });
});

test.describe(SECTOR_PAGE, () => {
  test('lists six tasks and links the case and the platform', async ({
    page,
  }) => {
    await gotoHydrated(page, SECTOR_PAGE);
    await expect(page.locator('#work li')).toHaveCount(6);
    await expect(
      page.locator('#case').getByRole('link', { name: /→$/ }),
    ).toHaveAttribute('href', CASE_PAIR.es);
    await expect(
      page.getByRole('link', { name: /Taplany →$/ }),
    ).toHaveAttribute('href', 'https://taplany.com');
  });

  test('describes a service, a breadcrumb and a FAQ in JSON-LD', async ({
    request,
  }) => {
    const html = await (await request.get(SECTOR_PAGE)).text();
    expect(typesOf(jsonLdBlocks(html))).toEqual([
      ...LAYOUT,
      'Service',
      'BreadcrumbList',
      'FAQPage',
    ]);
  });
});

for (const [locale, path, switchTo, label, nav] of [
  ['en', CASE_PAIR.en, CASE_PAIR.es, 'ES', 'Language'],
  ['es', CASE_PAIR.es, CASE_PAIR.en, 'EN', 'Idioma'],
] as const) {
  test.describe(path, () => {
    test('shows the story with a dated header and no figures', async ({
      page,
    }) => {
      await gotoHydrated(page, path);
      await expect(page.locator('h1')).toHaveCount(1);
      await expect(page.locator('main img')).toHaveCount(0);
      await expect(page.locator('header time')).toHaveCount(1);
      await expect(page.locator('header time')).toHaveAttribute(
        'datetime',
        /^\d{4}-\d{2}-\d{2}$/,
      );
      await expect(page.locator('#built h3')).toHaveCount(6);
      await expect(page.locator('#operations .timeline > li')).toHaveCount(4);
      await expect(page.locator('#results dl')).toHaveCount(0);
      await expect(page.locator('main')).not.toContainText('[X]');
    });

    test('sends the call to action to the contact form', async ({ page }) => {
      await gotoHydrated(page, path);
      await expect(page.locator('#cta-title ~ div a').first()).toHaveAttribute(
        'href',
        locale === 'en' ? CTA.en : CTA.es,
      );
    });

    test('switches to its twin', async ({ page }) => {
      await gotoHydrated(page, path);
      await page
        .getByRole('navigation', { name: nav })
        .first()
        .getByRole('link', { name: label })
        .click();
      await expect(page).toHaveURL(switchTo);
      await expect(page.locator('html')).toHaveAttribute(
        'lang',
        locale === 'en' ? 'es' : 'en',
      );
    });

    test('describes a breadcrumb and an article in JSON-LD', async ({
      request,
    }) => {
      const html = await (await request.get(path)).text();
      expect(typesOf(jsonLdBlocks(html))).toEqual([
        ...LAYOUT,
        'BreadcrumbList',
        'Article',
      ]);
    });

    test('keeps the header cases link on the home section', async ({
      page,
    }) => {
      await page.setViewportSize({ width: 1280, height: 900 });
      await gotoHydrated(page, path);
      await expect(navLinks(page).nth(2)).toHaveAttribute(
        'href',
        locale === 'en' ? '/#cases' : '/es#cases',
      );
    });
  });
}

test('the automation and agents pages link the case in both languages', async ({
  page,
}) => {
  for (const [path, href] of [
    ['/services/ai-automation', CASE_PAIR.en],
    ['/services/ai-agents', CASE_PAIR.en],
    ['/es/servicios/automatizacion-de-procesos', CASE_PAIR.es],
    ['/es/servicios/agentes-de-ia', CASE_PAIR.es],
  ] as const) {
    await gotoHydrated(page, path);
    await expect(
      page.locator('#case').getByRole('link', { name: /→$/ }),
    ).toHaveAttribute('href', href);
  }
});
