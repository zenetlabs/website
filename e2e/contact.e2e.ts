import { expect, type Page, test } from '@playwright/test';
import { attemptsFor, sentFor, uniqueEmail } from './fakes';
import { gotoHydrated } from './helpers';

const TURNSTILE_SCRIPT = 'script[src*="challenges.cloudflare.com"]';

async function fillForm(page: Page, email = 'ada@example.com') {
  await page.getByLabel('Name').fill('Ada Lovelace');
  await page.getByLabel('Email').fill(email);
  await page
    .getByLabel('What should we look at?')
    .fill('We would like to automate our inbox triage.');
  await page.getByRole('checkbox').check();
}

async function waitForToken(page: Page) {
  await expect(page.getByRole('button', { name: 'Send message' })).toBeEnabled({
    timeout: 30_000,
  });
}

test('required fields and consent block the submit', async ({ page }) => {
  await gotoHydrated(page, '/');
  const form = page.getByRole('form', { name: 'Contact form' });
  await expect(form.getByLabel('Name')).toHaveJSProperty('required', true);

  await form.getByLabel('Name').focus();
  await waitForToken(page);

  let submitted = false;
  page.on('request', (request) => {
    if (request.method() === 'POST' && request.url().includes('/api/lead')) {
      submitted = true;
    }
  });
  await form.getByRole('button', { name: 'Send message' }).click();
  expect(
    await form
      .getByLabel('Name')
      .evaluate((el: HTMLInputElement) => el.validity.valueMissing),
  ).toBe(true);

  await fillForm(page);
  await page.getByRole('checkbox').uncheck();
  await form.getByRole('button', { name: 'Send message' }).click();
  expect(
    await page
      .getByRole('checkbox')
      .evaluate((el: HTMLInputElement) => el.validity.valueMissing),
  ).toBe(true);
  expect(submitted).toBe(false);
});

test('Turnstile mounts only after the first focus in the form', async ({
  page,
}) => {
  await gotoHydrated(page, '/');
  await page.waitForTimeout(500);
  await expect(page.locator(TURNSTILE_SCRIPT)).toHaveCount(0);
  await expect(page.locator('input[name="cf-turnstile-response"]')).toHaveCount(
    0,
  );

  await page.getByLabel('Name').focus();
  await expect(page.locator(TURNSTILE_SCRIPT)).toHaveCount(1);
  await waitForToken(page);
});

test('a filled honeypot gets a silent success and sends nothing', async ({
  page,
}) => {
  const email = uniqueEmail('honeypot');
  await gotoHydrated(page, '/');
  await page.getByLabel('Name').focus();
  await fillForm(page, email);
  await page
    .locator('input[name="website"]')
    .evaluate((el: HTMLInputElement) => {
      el.value = 'http://spam.example';
    });
  await waitForToken(page);
  await page.getByRole('button', { name: 'Send message' }).click();
  await expect(page.getByText('Message sent')).toBeVisible();
  await page.waitForTimeout(1000);
  expect(await attemptsFor(email)).toEqual([]);
});

test('a real submit with test keys is accepted and emailed', async ({
  page,
}) => {
  const email = uniqueEmail('contact');
  await gotoHydrated(page, '/');
  await page.getByLabel('Name').focus();
  await fillForm(page, email);
  await waitForToken(page);
  await page.getByRole('button', { name: 'Send message' }).click();

  await expect(page.getByText('Message sent')).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText('Message sent')).toBeFocused();
  await expect.poll(async () => (await sentFor(email)).length).toBe(2);
});

test('a rejected submit shows the alert with the mailto fallback', async ({
  page,
}) => {
  await page.route('**/api/lead', (route) =>
    route.fulfill({
      status: 429,
      contentType: 'application/json',
      body: JSON.stringify({ ok: false, error: 'rate' }),
    }),
  );
  await gotoHydrated(page, '/');
  await page.getByLabel('Name').focus();
  await fillForm(page);
  await waitForToken(page);
  await page.getByRole('button', { name: 'Send message' }).click();

  const alert = page.getByRole('alert');
  await expect(alert).toBeVisible({ timeout: 30_000 });
  await expect(alert).toContainText('Too many attempts from your connection');
  await expect(alert).toBeFocused();
  await expect(
    alert.getByRole('link', { name: 'hello@zenetlabs.com' }),
  ).toHaveAttribute('href', 'mailto:hello@zenetlabs.com');
});
