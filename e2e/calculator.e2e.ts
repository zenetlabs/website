import { expect, type Page, test } from '@playwright/test';
import { calculatorPage as enCopy } from '../src/content/en/calculator';
import { calculatorPage as esCopy } from '../src/content/es/calculator';
import {
  answersQuery,
  type CalculatorAnswers,
} from '../src/lib/calculator-answers';
import { CONSENT_KEY, COOKIE_CONSENT_REVISION } from '../src/lib/consent';
import { estimate, market, rangePrice } from '../src/lib/estimate';
import type { Locale } from '../src/lib/i18n';
import { formatPrice } from '../src/lib/money';
import { titleText } from '../src/lib/title-text';
import { G2, G3 } from '../test/calculator-fixtures';
import { CURRENCY, SERVICES } from '../test/page-content';
import { attemptsFor, NOTIFY_TO, sentFor, uniqueEmail } from './fakes';
import { CALCULATOR_PAIR, gotoHydrated, LOCALES, normalise } from './helpers';

const COPY = { en: enCopy, es: esCopy };

function oracle(locale: Locale, answers: CalculatorAnswers) {
  const result = estimate(answers, market(CURRENCY[locale], SERVICES[locale]));
  return {
    result,
    total: normalise(
      formatPrice(locale, rangePrice(result.total, result.currency)),
    ),
  };
}

async function fill(page: Page, answers: CalculatorAnswers) {
  await page.locator(`input[name="type"][value="${answers.type}"]`).check();
  for (const tool of answers.tools) {
    await page.locator(`input[name="${tool}"]`).check();
  }
  await page.locator(`input[name="volume"][value="${answers.volume}"]`).check();
  if (answers.agent) await page.locator('input[name="agent"]').check();
  if (answers.web) await page.locator('input[name="web"]').check();
  await page
    .locator(`input[name="urgency"][value="${answers.urgency}"]`)
    .check();
  await page
    .locator(`input[name="maintenance"][value="${answers.maintenance}"]`)
    .check();
}

async function totalText(page: Page) {
  return normalise(await page.locator('#estimate dl dd').first().innerText());
}

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  for (const locale of LOCALES) {
    const path = CALCULATOR_PAIR[locale];
    const copy = COPY[locale];

    test(`${path} answers the form with a server-rendered result and no redirect`, async ({
      page,
    }) => {
      await page.goto(path);
      await expect(page.locator('h1')).toHaveCount(1);
      await expect(page.getByText(copy.result.empty)).toBeVisible();
      await expect(
        page.getByText(copy.disclaimer.title, { exact: true }),
      ).toBeVisible();
      await expect(page.locator('fieldset[disabled]')).toHaveCount(0);

      await fill(page, G2);
      const [response] = await Promise.all([
        page.waitForResponse(
          (candidate) =>
            candidate.request().isNavigationRequest() &&
            candidate.url().includes('type='),
        ),
        page.getByRole('button', { name: copy.submit }).click(),
      ]);
      expect(response.status()).toBe(200);
      expect(response.request().redirectedFrom()).toBeNull();
      expect(page.url().endsWith(`${path}?${answersQuery(G2)}#estimate`)).toBe(
        true,
      );

      const expected = oracle(locale, G2);
      expect(await totalText(page)).toContain(expected.total);
      await expect(
        page.getByText(copy.disclaimer.title, { exact: true }),
      ).toBeVisible();
      await expect(page.locator('#estimate-title')).toBeVisible();
      await expect(
        page.getByRole('link', { name: copy.result.change }),
      ).toBeVisible();
      await expect(
        page.locator('main a[href="mailto:hello@zenetlabs.com"]').first(),
      ).toBeVisible();
    });
  }

  test('an incomplete submit is stopped by the browser, not the server', async ({
    page,
  }) => {
    await page.goto(CALCULATOR_PAIR.en);
    await page.getByRole('button', { name: enCopy.submit }).click();
    expect(page.url().endsWith(CALCULATOR_PAIR.en)).toBe(true);
  });
});

test('a bogus query is answered in place and shows the form only', async ({
  request,
  page,
}) => {
  const url = `${CALCULATOR_PAIR.en}?type=bogus&erp=true`;
  const response = await request.get(url, { maxRedirects: 0 });
  expect(response.status()).toBe(200);
  await page.goto(url);
  await expect(page.getByText(enCopy.result.empty)).toBeVisible();
  await expect(page.locator('input[name="erp"]')).toBeChecked();
  await expect(page.locator('input[name="type"]:checked')).toHaveCount(0);
});

test('every result address is served in place, never redirected', async ({
  request,
}) => {
  for (const locale of LOCALES) {
    for (const answers of [G2, G3]) {
      const response = await request.get(
        `${CALCULATOR_PAIR[locale]}?${answersQuery(answers)}`,
        { maxRedirects: 0 },
      );
      expect(response.status()).toBe(200);
      expect(response.headers().location).toBeUndefined();
    }
  }
});

test('the internal path of the other language redirects once', async ({
  request,
}) => {
  const response = await request.get('/es/pricing/calculator?type=web', {
    maxRedirects: 0,
  });
  expect(response.status()).toBe(301);
  const location = new URL(response.headers().location ?? '');
  expect(location.pathname + location.search).toBe(
    '/es/precios/calculadora?type=web',
  );
});

for (const locale of LOCALES) {
  const path = CALCULATOR_PAIR[locale];
  const copy = COPY[locale];

  test(`${path} updates the result in place, moves focus to it and keeps the address shareable`, async ({
    page,
  }) => {
    await gotoHydrated(page, `${path}?utm_source=e2e`);
    await page.evaluate(() => {
      Object.assign(window, { marker: 'same-document' });
    });
    await fill(page, G3);
    await page.getByRole('button', { name: copy.submit }).click();

    await expect(page.locator('#estimate-title')).toBeFocused();
    expect(await totalText(page)).toContain(oracle(locale, G3).total);
    expect(await page.evaluate(() => Reflect.get(window, 'marker'))).toBe(
      'same-document',
    );
    const url = new URL(page.url());
    expect(url.searchParams.get('utm_source')).toBe('e2e');
    expect(url.search).toBe(`?${answersQuery(G3)}&utm_source=e2e`);
    expect(url.hash).toBe('#estimate');

    const more = { ...G3, tools: [...G3.tools, 'erp' as const] };
    await page.locator('input[name="erp"]').check();
    await page.getByRole('button', { name: copy.submit }).click();
    await expect.poll(() => page.url()).toContain(`?${answersQuery(more)}`);
    expect(new URL(page.url()).search).toBe(
      `?${answersQuery(more)}&utm_source=e2e`,
    );
    expect(await totalText(page)).toContain(oracle(locale, more).total);

    await page.locator('input[name="volume"][value="very-high"]').check();
    await page.getByRole('button', { name: copy.submit }).click();
    const changed = oracle(locale, { ...more, volume: 'very-high' });
    await expect(page.locator('#estimate dl dd').first()).toContainText(
      changed.total.split('–')[0] ?? '',
    );
    expect(await totalText(page)).toContain(changed.total);
    expect(await totalText(page)).not.toContain(oracle(locale, more).total);
  });

  test(`${path} keeps the same address as the no-JavaScript form`, async ({
    page,
  }) => {
    await gotoHydrated(page, path);
    await fill(page, G2);
    await page.getByRole('button', { name: copy.submit }).click();
    await expect(page.locator('#estimate-title')).toBeFocused();
    expect(page.url().endsWith(`${path}?${answersQuery(G2)}#estimate`)).toBe(
      true,
    );
    await page.reload();
    expect(await totalText(page)).toContain(oracle(locale, G2).total);
    const more = { ...G2, tools: [...G2.tools, 'documents' as const] };
    await page.locator('input[name="documents"]').check();
    await page.getByRole('button', { name: copy.submit }).click();
    await expect(page.locator('#estimate-title')).toBeFocused();
    expect(page.url().endsWith(`${path}?${answersQuery(more)}#estimate`)).toBe(
      true,
    );
    expect(await totalText(page)).toContain(oracle(locale, more).total);
  });
}

test('the language switch keeps the answers and shows the other currency', async ({
  page,
}) => {
  await gotoHydrated(page, `${CALCULATOR_PAIR.en}?${answersQuery(G2)}`);
  expect(await totalText(page)).toContain(oracle('en', G2).total);
  await page.getByRole('link', { name: 'ES', exact: true }).first().click();
  await page.waitForURL(`**${CALCULATOR_PAIR.es}?${answersQuery(G2)}`);
  await expect(page.locator('#estimate dl dd').first()).toContainText(
    oracle('es', G2).total,
  );
});

test.describe('analytics', () => {
  test('nothing fires before consent', async ({ page }) => {
    await gotoHydrated(page, CALCULATOR_PAIR.en);
    await fill(page, G3);
    await page.getByRole('button', { name: enCopy.submit }).click();
    await expect(page.locator('#estimate-title')).toBeFocused();
    const events = await page.evaluate(() =>
      (window.dataLayer ?? []).map((entry) => JSON.stringify(entry)),
    );
    expect(
      events.filter((entry) => entry.includes('calculator_complete')),
    ).toEqual([]);
  });

  test.describe('after consent', () => {
    test.use({
      storageState: {
        cookies: [],
        origins: [
          {
            origin: 'http://localhost:4173',
            localStorage: [
              {
                name: CONSENT_KEY,
                value: JSON.stringify({
                  analytics: true,
                  marketing: false,
                  revision: COOKIE_CONSENT_REVISION,
                  at: Date.now(),
                }),
              },
            ],
          },
        ],
      },
    });

    test('completing the form fires one calculator_complete with the project type', async ({
      page,
    }) => {
      await page.route(/googletagmanager|google-analytics/, (route) =>
        route.fulfill({
          status: 200,
          contentType: 'application/javascript',
          body: '',
        }),
      );
      await gotoHydrated(page, CALCULATOR_PAIR.es);
      await fill(page, G3);
      await page.getByRole('button', { name: esCopy.submit }).click();
      await expect(page.locator('#estimate-title')).toBeFocused();
      await expect
        .poll(() =>
          page.evaluate(() =>
            (window.dataLayer ?? [])
              .map((entry) =>
                JSON.stringify(Array.from(entry as ArrayLike<unknown>)),
              )
              .filter((entry) => entry.includes('calculator_complete')),
          ),
        )
        .toEqual(['["event","calculator_complete",{"project_type":"agent"}]']);
    });

    test('opening a result link is not a completion', async ({ page }) => {
      await page.route(/googletagmanager|google-analytics/, (route) =>
        route.fulfill({
          status: 200,
          contentType: 'application/javascript',
          body: '',
        }),
      );
      await gotoHydrated(page, `${CALCULATOR_PAIR.en}?${answersQuery(G3)}`);
      await page.waitForLoadState('networkidle');
      const events = await page.evaluate(() =>
        (window.dataLayer ?? []).map((entry) => JSON.stringify(entry)),
      );
      expect(
        events.some((entry) => entry.includes('calculator_complete')),
      ).toBe(false);
    });
  });
});

const LEAD = {
  en: {
    name: 'Name',
    email: 'Email',
    company: 'Company (optional)',
    message: 'What should we look at?',
    submit: 'Send message',
    sent: 'Message sent',
    lead: 'EN',
  },
  es: {
    name: 'Nombre',
    email: 'Correo electrónico',
    company: 'Empresa (opcional)',
    message: '¿Qué deberíamos mirar?',
    submit: 'Enviar mensaje',
    sent: 'Mensaje enviado',
    lead: 'ES',
  },
} as const;

for (const locale of LOCALES) {
  const path = CALCULATOR_PAIR[locale];
  const labels = LEAD[locale];
  const copy = COPY[locale];

  test(`${path} sends the answers and the estimate through the contact form`, async ({
    page,
  }) => {
    const email = uniqueEmail(`calc-${locale}`);
    await gotoHydrated(page, `${path}?${answersQuery(G2)}`);
    const contact = page.getByRole('region', {
      name: titleText(copy.contact.title),
    });
    const message = contact.getByLabel(labels.message);
    const expected = oracle(locale, G2);
    await expect(message).toHaveValue(
      new RegExp(
        expected.total
          .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
          .replace(/\s/g, '\\s'),
      ),
    );
    await contact.getByLabel(labels.name).focus();
    await contact.getByLabel(labels.name).fill('Ada Lovelace');
    await contact.getByLabel(labels.email).fill(email);
    await contact.getByLabel(labels.company).fill('Analytical Engines');
    await message.press('Control+End');
    await message.pressSequentially('Friday deadline.');
    await contact.getByRole('checkbox').check();
    const button = contact.getByRole('button', { name: labels.submit });
    await expect(button).toBeEnabled({ timeout: 30_000 });
    await button.click();
    await expect(contact.getByText(labels.sent)).toBeVisible({
      timeout: 30_000,
    });

    await expect.poll(async () => (await sentFor(email)).length).toBe(2);
    const sent = await sentFor(email);
    const owner = sent.find((entry) => entry.to === NOTIFY_TO);
    expect(owner?.subject).toBe(
      `[TEST] [Lead ${labels.lead}] Ada Lovelace — Analytical Engines — form`,
    );
    expect(normalise(owner?.text ?? '')).toContain(expected.total);
    expect(owner?.text).toContain('Friday deadline.');
    expect(owner?.text).toContain(`${path}?${answersQuery(G2)}#estimate`);
    expect(owner?.text).toContain(`Submitted from: ${path}`);
    const confirmation = sent.find((entry) => entry.to === email);
    expect(confirmation?.text ?? '').not.toContain('Ada Lovelace');
    expect((await attemptsFor(email)).length).toBe(2);
  });
}
