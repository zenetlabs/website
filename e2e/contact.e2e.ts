import { expect, type Page, test } from '@playwright/test';
import { attemptsFor, sentFor, uniqueEmail } from './fakes';
import { BOOKING_PUBLISHED, CONTACT_PAIR, gotoHydrated } from './helpers';

const TURNSTILE_SCRIPT = 'script[src*="challenges.cloudflare.com"]';

async function fillForm(page: Page, email = 'ada@example.com') {
  await page.getByLabel('Name').fill('Ada Lovelace');
  await page.getByLabel('Email').fill(email);
  await page
    .getByLabel('What should we look at?')
    .fill('We would like to automate our inbox triage.');
  await page.getByRole('checkbox').check();
}

// Send stays enabled throughout (a press before the check answers waits for
// it); this waits for the check itself.
async function waitForToken(page: Page) {
  await expect(
    page.getByRole('button', { name: 'Send message' }),
  ).toBeEnabled();
  await expect(
    page.locator('input[name="cf-turnstile-response"]'),
  ).not.toHaveValue('', { timeout: 30_000 });
}

test('the contact card inside the band keeps the page surface', async ({
  page,
}) => {
  await gotoHydrated(page, CONTACT_PAIR.en);
  const form = page.getByRole('form', { name: 'Contact form' });
  const colours = await form.evaluate((node) => {
    const card = node.parentElement;
    const band = node.closest('[data-ground="band"]');
    if (!card || !band) throw new Error('no band');
    const probe = (parent: Element) => {
      const element = document.createElement('div');
      element.style.backgroundColor = 'var(--surface)';
      parent.appendChild(element);
      const colour = getComputedStyle(element).backgroundColor;
      element.remove();
      return colour;
    };
    return {
      card: getComputedStyle(card).backgroundColor,
      page: probe(document.body),
      band: probe(band),
    };
  });
  expect(colours.card).toBe(colours.page);
  expect(colours.card).not.toBe(colours.band);
});

test('required fields and consent block the submit', async ({ page }) => {
  await gotoHydrated(page, CONTACT_PAIR.en);
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
  await gotoHydrated(page, CONTACT_PAIR.en);
  await page.waitForTimeout(500);
  await expect(page.locator(TURNSTILE_SCRIPT)).toHaveCount(0);
  await expect(page.locator('input[name="cf-turnstile-response"]')).toHaveCount(
    0,
  );

  await page.getByLabel('Name').focus();
  await expect(page.locator(TURNSTILE_SCRIPT)).toHaveCount(1);
  await waitForToken(page);
});

test('Send is enabled before the check: a press waits for it, then sends', async ({
  page,
}) => {
  const email = uniqueEmail('early');
  await gotoHydrated(page, CONTACT_PAIR.en);
  const send = page.getByRole('button', { name: 'Send message' });
  await expect(send).toBeEnabled();
  await fillForm(page, email);
  await send.click();
  await expect(page.getByText('Message sent')).toBeVisible({ timeout: 30_000 });
  await expect.poll(async () => (await sentFor(email)).length).toBe(2);
});

test('the booking card shows the next free times as chips, in the same box', async ({
  page,
}) => {
  test.skip(!BOOKING_PUBLISHED, 'booking is not published in this build');
  let release: () => void = () => {};
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route('**/api/book/slots', async (route) => {
    await held;
    await route.continue();
  });
  await gotoHydrated(page, CONTACT_PAIR.en);
  const card = page.locator('.contact-book');
  await expect(card.locator('[data-slot-fallback]')).toBeVisible();
  const before = await card.boundingBox();
  release();
  const chips = card.locator('.slot-chip');
  await expect(chips.first()).toBeVisible({ timeout: 15_000 });
  expect(await chips.count()).toBeLessThanOrEqual(3);
  await expect(chips.first()).toHaveAttribute('href', /^\/book\?slot=\d+$/);
  const after = await card.boundingBox();
  expect(Math.abs((after?.height ?? 0) - (before?.height ?? 0))).toBeLessThan(
    2,
  );
});

test('a filled honeypot gets a silent success and sends nothing', async ({
  page,
}) => {
  const email = uniqueEmail('honeypot');
  await gotoHydrated(page, CONTACT_PAIR.en);
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
  await gotoHydrated(page, CONTACT_PAIR.en);
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
  await gotoHydrated(page, CONTACT_PAIR.en);
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
