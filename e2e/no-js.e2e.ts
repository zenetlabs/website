import { expect, test } from '@playwright/test';
import { home as enHome } from '../src/content/en/home';
import { home as esHome } from '../src/content/es/home';
import { verifactuDates } from '../src/content/es/verifactu';
import { formatPrice, formatPriceSummary, priceParts } from '../src/lib/money';
import { faqPairs, jsonLdBlocks } from '../test/json-ld';
import { SERVICES } from '../test/page-content';
import {
  agentHeaders,
  confirmLinkFor,
  googleEvents,
  startVoiceSession,
  uniqueEmail,
} from './fakes';
import {
  BOOKING_PUBLISHED,
  CASE_PAIR,
  CONTACT_PAIR,
  HOLDED_PAGES,
  LOCALES,
  lateSlot,
  normalise,
  PAIRS,
  SERVICE_PAIRS,
  SERVICES_HUB,
  VERIFACTU_PAGE,
} from './helpers';

test.use({ javaScriptEnabled: false });

const HOMES = LOCALES.map((locale) => ({ locale, path: PAIRS[0][locale] }));
const PRICING = LOCALES.map((locale) => ({ locale, path: PAIRS[1][locale] }));

const HOME_COPY = { en: enHome, es: esHome } as const;

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
      if (service.id === 'growth') continue;
      for (const price of service.prices) {
        expect(services).toContain(normalise(priceParts(locale, price).amount));
      }
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
    await expect(
      contact.locator(
        `a[href="${CONTACT_PAIR[locale]}"][data-cta="close_contact"]`,
      ),
    ).toBeVisible();
  });

  test(`${path} desk sends the question to the contact form without JavaScript`, async ({
    page,
  }) => {
    const { desk } = HOME_COPY[locale];
    await page.goto(path);
    for (const hidden of await page.locator('[data-needs-js]').all()) {
      await expect(hidden).toBeHidden();
    }
    const question =
      locale === 'en'
        ? 'Can you read our supplier PDFs?'
        : '¿Podéis leer los PDF de proveedores?';
    await page.getByLabel(desk.label).fill(question);
    await page.getByRole('button', { name: desk.intro.send }).click();
    await expect(page).toHaveURL(
      `${CONTACT_PAIR[locale]}?${new URLSearchParams({ message: question })}`,
    );
    await expect(page.locator('textarea[name="message"]')).toHaveValue(
      question,
    );
  });

  test(`${path} desk chips open the contact form with the question`, async ({
    page,
  }) => {
    const { desk } = HOME_COPY[locale];
    await page.goto(path);
    await page.getByRole('link', { name: desk.intro.suggestions[0] }).click();
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('textarea[name="message"]')).toHaveValue(
      desk.intro.suggestions[0],
    );
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
      for (const price of service.prices) {
        expect(text).toContain(normalise(formatPrice(locale, price)));
      }
    }
  });
}

for (const { path, locale } of PRICING) {
  test(`${path} shows every price row and the tax note in the server HTML`, async ({
    page,
  }) => {
    await page.goto(path);
    for (const service of Object.values(SERVICES[locale])) {
      const card = page.locator(`main [data-service="${service.id}"]`);
      await expect(card).toBeVisible();
      const text = normalise(await card.innerText());
      for (const price of service.prices) {
        expect(text).toContain(normalise(formatPrice(locale, price)));
      }
    }
    await expect(page.getByText(TAX_NOTE[locale]).first()).toBeVisible();
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

test.describe('the emailed confirm link', () => {
  test.skip(!BOOKING_PUBLISHED, 'booking is not published in this build');

  test('confirms with a plain form post, no script needed', async ({
    page,
    request,
  }) => {
    const slot = await lateSlot(async (name, input) =>
      (await request.post(`/api/tools/${name}`, { data: input })).json(),
    );
    const email = uniqueEmail('nojs');
    const held = await request.post('/api/tools/book_meeting', {
      headers: agentHeaders(await startVoiceSession(request)),
      data: {
        confirmed: true,
        slot,
        name: '[TEST] No Script',
        email,
        topic: 'Automate our inbox triage please.',
      },
    });
    expect((await held.json()).result.status).toBe('pending');
    const link = await confirmLinkFor(email);
    await page.goto(link.replace(/^https?:\/\/[^/]+/, ''));
    await expect(page.locator('body[data-hydrated]')).toHaveCount(0);
    await expect(
      page.getByRole('heading', { name: 'Confirm your call' }),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Confirm the call' }).click();
    await expect(
      page.getByRole('heading', { name: 'Your call is booked' }),
    ).toBeVisible({ timeout: 30_000 });
    expect(
      (await googleEvents()).filter(
        (event) => Date.parse(event.start.dateTime) === Date.parse(slot),
      ),
    ).toHaveLength(1);
  });
});
