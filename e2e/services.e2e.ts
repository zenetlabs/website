import { expect } from '@playwright/test';
import { formatPriceSummary } from '../src/lib/money';
import { jsonLdBlocks } from '../test/json-ld';
import { SERVICES } from '../test/page-content';
import { test } from './fixtures';
import {
  CONTACT_PAIR,
  CTA,
  gotoHydrated,
  HOLDED_PAGES,
  LOCALES,
  navLinks,
  SECTOR_PAGE,
  SERVICE_PAIRS,
  SERVICES_HUB,
  typesOf,
  VERIFACTU_PAGE,
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
        const ticket = page
          .locator('main section')
          .first()
          .locator('[data-service]');
        const price = formatPriceSummary(
          locale,
          SERVICES[locale][service].prices,
        );
        await expect(ticket).toContainText(price);
        await expect(ticket.locator('.ticket-stub')).not.toBeEmpty();
      });

      test('links the breadcrumb, the CTA and the pricing page', async ({
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
          PRICING[locale],
        );
      });

      test('closes with the desk: the write door and the first two questions as chips', async ({
        page,
      }) => {
        await gotoHydrated(page, path);
        const close = page.locator('#contact');
        await expect(
          close.locator('a[data-cta="close_contact"]'),
        ).toHaveAttribute('href', CONTACT_PAIR[locale]);
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
              `${CONTACT_PAIR[locale]}?${new URLSearchParams({ message: question })}`,
          ),
        );
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
        await expect(links).toHaveCount(
          service === 'diagnostic' || service === 'maintenance' ? 3 : 4,
        );
        if (service !== 'diagnostic' && service !== 'maintenance') {
          await expect(links.first()).toHaveAttribute(
            'href',
            SERVICE_PAIRS.diagnostic[locale],
          );
        }
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
    test('shows the ladder, then the five services in order, then the desk', async ({
      page,
    }) => {
      await page.setViewportSize({ width: 1280, height: 900 });
      await gotoHydrated(page, path);
      await expect(page.locator('h1')).toHaveCount(1);
      await expect(page.locator('main img')).toHaveCount(0);
      const start = await page
        .locator('main [data-service="diagnostic"] a')
        .evaluateAll((links) => links.map((a) => a.getAttribute('href')));
      const { diagnostic, maintenance: _care, ...listed } = SERVICE_PAIRS;
      expect(start).toEqual([diagnostic[locale], CTA[locale]]);
      const rows = await page
        .locator('#hub-services h3 a')
        .evaluateAll((links) => links.map((a) => a.getAttribute('href')));
      expect(rows).toEqual(Object.values(listed).map((pair) => pair[locale]));
      await expect(
        page.locator(`main a[href="${PRICING[locale]}"]`),
      ).not.toHaveCount(0);
      const hrefs = await page
        .locator('#contact .desk-chip')
        .evaluateAll((links) => links.map((a) => a.getAttribute('href')));
      expect(hrefs).toHaveLength(2);
      await expect(
        page.locator('#contact a[data-cta="close_contact"]'),
      ).toHaveAttribute('href', CONTACT_PAIR[locale]);
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
    .getByRole('link', { name: 'Español' })
    .click();
  await expect(page).toHaveURL(agents.es);
  await expect(page.locator('html')).toHaveAttribute('lang', 'es');
});

const BANNER = '[data-consent-banner]';
const FIRST_VISIT = { cookies: [], origins: [] };
const ALL_PAGES: readonly string[] = [
  ...Object.values(SERVICE_PAIRS).flatMap((pair) => [pair.en, pair.es]),
  ...HOLDED_PAGES,
  VERIFACTU_PAGE,
  SECTOR_PAGE,
  '/about',
  '/es/sobre-nosotros',
];

test.describe('the hero button clears the consent banner', () => {
  test.use({ storageState: FIRST_VISIT });

  for (const path of ALL_PAGES) {
    for (const viewport of [
      { width: 1280, height: 800 },
      { width: 1024, height: 768 },
    ]) {
      test(`${path} at ${viewport.width}x${viewport.height}`, async ({
        page,
      }) => {
        await page.setViewportSize(viewport);
        await gotoHydrated(page, path);
        await expect(page.locator(BANNER)).toBeVisible();
        const edges = await page.evaluate(() => {
          const cta = document.querySelector('[data-cta="page_hero"]');
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
