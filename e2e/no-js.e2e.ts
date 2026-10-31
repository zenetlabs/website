import { expect, test } from '@playwright/test';
import { formatPrice, formatPriceSummary } from '../src/lib/money';
import { faqPairs, jsonLdBlocks } from '../test/json-ld';
import { SERVICES } from '../test/page-content';
import { LOCALES, normalise, PAIRS } from './helpers';

test.use({ javaScriptEnabled: false });

const HOMES = LOCALES.map((locale) => ({ locale, path: PAIRS[0][locale] }));
const PRICING = LOCALES.map((locale) => ({ locale, path: PAIRS[1][locale] }));

const TAX_NOTE = { en: 'exclude GST', es: 'no incluyen el IVA' } as const;

for (const { path } of [...HOMES, ...PRICING]) {
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
