import { expect, test } from '@playwright/test';
import { formatPriceSummary } from '../src/lib/money';
import { jsonLdBlocks } from '../test/json-ld';
import { SERVICES } from '../test/page-content';
import {
  CTA,
  gotoHydrated,
  LOCALES,
  navLinks,
  SERVICE_PAIRS,
  SERVICES_HUB,
  typesOf,
} from './helpers';

const HOME = { en: '/', es: '/es' } as const;
const PRICING = { en: '/pricing', es: '/es/precios' } as const;

for (const pair of Object.values(SERVICE_PAIRS)) {
  const { service } = pair;
  for (const locale of LOCALES) {
    const path = pair[locale];

    test.describe(path, () => {
      test('answers first: one h1, the facts and the price', async ({
        page,
      }) => {
        await page.setViewportSize({ width: 1280, height: 900 });
        await gotoHydrated(page, path);
        await expect(page.locator('h1')).toHaveCount(1);
        await expect(page.locator('h1')).toBeVisible();
        await expect(page.locator('main img')).toHaveCount(0);
        const facts = page.locator('main dl').first();
        await expect(facts.locator('dt')).toHaveCount(4);
        const price = formatPriceSummary(
          locale,
          SERVICES[locale][service].prices,
        );
        await expect(facts.locator('dd').nth(1)).toContainText(price);
      });

      test('links the breadcrumb, the CTA and the pricing card', async ({
        page,
      }) => {
        await gotoHydrated(page, path);
        const trail = page.locator('main nav ol a');
        await expect(trail).toHaveCount(2);
        await expect(trail.nth(0)).toHaveAttribute('href', HOME[locale]);
        await expect(trail.nth(1)).toHaveAttribute(
          'href',
          SERVICES_HUB[locale],
        );
        await expect(
          page.locator('main nav [aria-current="page"]'),
        ).toHaveCount(1);

        const hero = page.locator('main section').first();
        await expect(hero.getByRole('link').nth(-2)).toHaveAttribute(
          'href',
          CTA[locale],
        );
        await expect(hero.getByRole('link').last()).toHaveAttribute(
          'href',
          `${PRICING[locale]}#${service}`,
        );
        await gotoHydrated(page, `${PRICING[locale]}#${service}`);
        await expect(page.locator(`article#${service}`)).toBeInViewport();
      });

      test('opens a question by keyboard and from its deep link', async ({
        page,
      }) => {
        await gotoHydrated(page, path);
        const items = page.locator('#faq details');
        await expect(items).toHaveCount(4);
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

      test('describes a service, a breadcrumb and a FAQ in JSON-LD', async ({
        request,
      }) => {
        const html = await (await request.get(path)).text();
        expect(typesOf(jsonLdBlocks(html))).toEqual([
          expect.stringMatching(/^(Organization|ProfessionalService)$/),
          'WebSite',
          'Person',
          'Service',
          'BreadcrumbList',
          'FAQPage',
        ]);
      });

      test('links the related pages and the hub', async ({ page }) => {
        await gotoHydrated(page, path);
        const links = page.locator('#related-title ~ ul a');
        await expect(links).toHaveCount(3);
        await expect(links.last()).toHaveAttribute(
          'href',
          SERVICES_HUB[locale],
        );
      });

      test('links the hub in the header without marking it current', async ({
        page,
      }) => {
        await page.setViewportSize({ width: 1280, height: 900 });
        await gotoHydrated(page, path);
        await expect(navLinks(page).first()).toHaveAttribute(
          'href',
          SERVICES_HUB[locale],
        );
        await expect(
          navLinks(page).first(),
          'a child page is not the current page',
        ).not.toHaveAttribute('aria-current', 'page');
      });
    });
  }
}

for (const locale of LOCALES) {
  const path = SERVICES_HUB[locale];

  test.describe(path, () => {
    test('lists the five services in order and the other three', async ({
      page,
    }) => {
      await page.setViewportSize({ width: 1280, height: 900 });
      await gotoHydrated(page, path);
      await expect(page.locator('h1')).toHaveCount(1);
      await expect(page.locator('main img')).toHaveCount(0);
      const rows = await page
        .locator('main ul a')
        .evaluateAll((links) => links.map((a) => a.getAttribute('href')));
      expect(rows).toEqual([
        ...Object.values(SERVICE_PAIRS).map((pair) => pair[locale]),
        `${PRICING[locale]}#diagnostic`,
        `${PRICING[locale]}#maintenance`,
        `${PRICING[locale]}#growth`,
      ]);
      await expect(
        page.locator('main section').last().getByRole('link').first(),
      ).toHaveAttribute('href', CTA[locale]);
    });

    test('marks the hub as current in the header', async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 900 });
      await gotoHydrated(page, path);
      await expect(navLinks(page).first()).toHaveAttribute(
        'aria-current',
        'page',
      );
    });

    test('describes the breadcrumb only', async ({ request }) => {
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

test('the language switch goes between the twins of one service page', async ({
  page,
}) => {
  const agents = SERVICE_PAIRS.agents;
  await gotoHydrated(page, agents.en);
  await page
    .getByRole('navigation', { name: 'Language' })
    .first()
    .getByRole('link', { name: 'ES' })
    .click();
  await expect(page).toHaveURL(agents.es);
  await expect(page.locator('html')).toHaveAttribute('lang', 'es');
});
