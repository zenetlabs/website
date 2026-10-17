import { expect, type Page, test } from '@playwright/test';
import { gotoHydrated } from './helpers';

const TURNSTILE_SCRIPT = 'script[src*="challenges.cloudflare.com"]';

async function fillForm(page: Page) {
  await page.getByLabel('Name').fill('Ada Lovelace');
  await page.getByLabel('Email').fill('ada@example.com');
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
    if (request.method() === 'POST' && request.url().includes('/_serverFn')) {
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

test('a filled honeypot gets a silent success', async ({ page }) => {
  await gotoHydrated(page, '/');
  await page.getByLabel('Name').focus();
  await fillForm(page);
  await page
    .locator('input[name="website"]')
    .evaluate((el: HTMLInputElement) => {
      el.value = 'http://spam.example';
    });
  await waitForToken(page);
  await page.getByRole('button', { name: 'Send message' }).click();
  await expect(page.getByText('Message sent')).toBeVisible();
});

test('a real submit with test keys shows the send error', async ({ page }) => {
  await gotoHydrated(page, '/');
  await page.getByLabel('Name').focus();
  await fillForm(page);
  await waitForToken(page);
  await page.getByRole('button', { name: 'Send message' }).click();

  const alert = page.getByRole('alert');
  await expect(alert).toBeVisible({ timeout: 30_000 });
  await expect(alert).toContainText(
    'We could not send your message. Please try again, or write to',
  );
  await expect(
    alert.getByRole('link', { name: 'hello@zenetlabs.com' }),
  ).toHaveAttribute('href', 'mailto:hello@zenetlabs.com');
});
