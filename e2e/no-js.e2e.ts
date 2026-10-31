import { expect, test } from '@playwright/test';
import { verifactuDates } from '../src/content/es/verifactu';
import { formatPrice, formatPriceSummary } from '../src/lib/money';
import { faqPairs, jsonLdBlocks } from '../test/json-ld';
import { SERVICES } from '../test/page-content';
import {
  CASE_PAIR,
  HOLDED_PAGES,
  LOCALES,
  normalise,
  PAIRS,
  SERVICE_PAIRS,
  SERVICES_HUB,
  VERIFACTU_PAGE,
} from './helpers';

test.use({ javaScriptEnabled: false });

const HOMES = LOCALES.map((locale) => ({ locale, path: PAIRS[0][locale] }));
const PRICING = LOCALES.map((locale) => ({ locale, path: PAIRS[1][locale] }));

const TAX_NOTE = { en: 'exclude GST', es: 'no incluyen el IVA' } as const;

const SERVICE_PAGES = LOCALES.map((locale) => ({
  locale,
  path: SERVICE_PAIRS.automation[locale],
  service: SERVICE_PAIRS.automation.service,
}));

for (const { path } of [...HOMES, ...PRICING, ...SERVICE_PAGES]) {
  test(`${path} renders without JavaScript`, async ({ page }) => {
    await page.goto(path);
    await expect(page.locator('body[data-hydrated]')).toHaveCount(0);
    await expect(page.locator('h1')).toHaveCount(1);
  });
}

for (const { path, locale } of HOMES) {
  test(`${path} shows prices, FAQ and contact in the server HTML`, async ({
    page,
    request,
  }) => {
    const html = await (await request.get(path)).text();
    const pairs = faqPairs(jsonLdBlocks(html));
    expect(pairs.length).toBeGreaterThan(10);

    await page.goto(path);
    const services = normalise(await page.locator('#services').innerText());
    for (const service of Object.values(SERVICES[locale])) {
      expect(services).toContain(
        normalise(formatPriceSummary(locale, service.prices)),
      );
    }

    const summaries = (await page.locator('#faq summary').allInnerTexts()).map(
      (text) => normalise(text).replace(/ \+$/, ''),
    );
    expect(summaries).toEqual(pairs.map(([question]) => normalise(question)));

    const items = page.locator('#faq details');
    await expect(items).toHaveCount(pairs.length);
    for (const [index, [question, answer]] of pairs.entries()) {
      const item = items.nth(index);
      await item.locator('summary').click();
      await expect(item).toHaveAttribute('open', '');
      const text = normalise(await item.innerText());
      expect(text).toContain(normalise(question));
      expect(text).toContain(normalise(answer));
    }

    const contact = page.locator('#contact');
    await expect(
      contact.locator('a[href="mailto:hello@zenetlabs.com"]'),
    ).toBeVisible();
    await expect(contact.locator('input[name="name"]')).toBeVisible();
    await expect(contact.locator('input[name="email"]')).toBeVisible();
  });
}

for (const { path, locale, service } of SERVICE_PAGES) {
  test(`${path} shows its price, opens a question and lists the email without JavaScript`, async ({
    page,
  }) => {
    await page.goto(path);
    const prices = SERVICES[locale][service].prices;
    const facts = normalise(await page.locator('dl').first().innerText());
    expect(facts).toContain(normalise(formatPriceSummary(locale, prices)));

    const item = page.locator('#faq details').first();
    await item.locator('summary').click();
    await expect(item).toHaveAttribute('open', '');
    await expect(item.locator('p')).toBeVisible();

    await expect(
      page.locator('main a[href="mailto:hello@zenetlabs.com"]'),
    ).toBeVisible();
  });
}

for (const { locale, path } of LOCALES.map((locale) => ({
  locale,
  path: SERVICES_HUB[locale],
}))) {
  test(`${path} shows the price of every service without JavaScript`, async ({
    page,
  }) => {
    await page.goto(path);
    const text = normalise(await page.locator('main').innerText());
    for (const service of Object.values(SERVICES[locale])) {
      expect(text).toContain(
        normalise(formatPriceSummary(locale, service.prices)),
      );
    }
  });
}

for (const { path, locale } of PRICING) {
  test(`${path} shows every price row and the tax note in the server HTML`, async ({
    page,
  }) => {
    await page.goto(path);
    for (const service of Object.values(SERVICES[locale])) {
      const card = page.locator(`article#${service.id}`);
      await expect(card).toBeVisible();
      const text = normalise(await card.innerText());
      for (const price of service.prices) {
        expect(text).toContain(normalise(formatPrice(locale, price)));
      }
    }
    await expect(page.getByText(TAX_NOTE[locale])).toBeVisible();
  });
}

test('the Verifactu page shows both dates, the check date and the price without JavaScript', async ({
  page,
}) => {
  await page.goto(VERIFACTU_PAGE);
  const text = normalise(await page.locator('main').innerText());
  for (const expected of [
    verifactuDates.companies,
    verifactuDates.others,
    `Fechas revisadas el ${verifactuDates.checkedOn}.`,
    normalise(formatPriceSummary('es', SERVICES.es.integration.prices)),
  ]) {
    expect(text).toContain(expected);
  }
});

test('a Holded pair opens a question natively and lists the email without JavaScript', async ({
  page,
}) => {
  const [path = ''] = HOLDED_PAGES;
  await page.goto(path);
  const item = page.locator('#faq details').first();
  await item.locator('summary').click();
  await expect(item).toHaveAttribute('open', '');
  await expect(item.locator('p')).toBeVisible();
  await expect(
    page.locator('main a[href="mailto:hello@zenetlabs.com"]'),
  ).toBeVisible();
  await expect(page.locator('#sync tbody tr')).toHaveCount(6);
});

for (const locale of LOCALES) {
  test(`the ${locale} case page shows the lead and the date without JavaScript`, async ({
    page,
  }) => {
    await page.goto(CASE_PAIR[locale]);
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('header time').first()).toBeVisible();
    await expect(page.locator('main')).toContainText('Viatsy');
  });
}
