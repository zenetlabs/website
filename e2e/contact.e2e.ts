import { expect, type Page } from '@playwright/test';
import { attemptsFor, sentFor, uniqueEmail } from './fakes';
import { test } from './fixtures';
import {
  ASSISTANT_PUBLISHED,
  BOOKING_PUBLISHED,
  CONTACT_PAIR,
  expectDoorOpen,
  gotoHydrated,
  openDoor,
} from './helpers';
import { forceInteractiveTurnstile } from './turnstile-interactive';

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
  await openDoor(page, 'book');
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

const INK_DOORS = [
  'message',
  ...(BOOKING_PUBLISHED ? (['book'] as const) : []),
  ...(ASSISTANT_PUBLISHED ? (['ai'] as const) : []),
] as const;

for (const viewport of [
  { width: 390, height: 844 },
  { width: 1440, height: 900 },
]) {
  for (const door of INK_DOORS) {
    test(`the ${door} door has one ink primary on the page at ${viewport.width}`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport);
      await gotoHydrated(page, CONTACT_PAIR.en);
      await openDoor(page, door);
      if (door === 'book') {
        await expect(
          page.locator('.contact-book .slot-chip').first(),
        ).toBeVisible({ timeout: 15_000 });
      }
      const inks = await page.evaluate(() => {
        const ink = getComputedStyle(document.body).getPropertyValue('--cta');
        const probe = document.createElement('div');
        probe.style.backgroundColor = ink;
        document.body.appendChild(probe);
        const want = getComputedStyle(probe).backgroundColor;
        probe.remove();
        return Array.from(document.querySelectorAll('a, button'))
          .filter(
            (element) =>
              element.checkVisibility({
                opacityProperty: true,
                visibilityProperty: true,
              }) && getComputedStyle(element).backgroundColor === want,
          )
          .map((element) => element.className);
      });
      expect(inks).toHaveLength(1);
    });
  }
}

test('the doors are a tablist with the message door open and the form visible', async ({
  page,
}) => {
  await gotoHydrated(page, CONTACT_PAIR.en);
  const tablist = page.getByRole('tablist', { name: 'Talk to us' });
  await expect(tablist.getByRole('tab')).toHaveCount(
    1 + Number(BOOKING_PUBLISHED) + Number(ASSISTANT_PUBLISHED),
  );
  await expectDoorOpen(page, 'message');
  await expect(page.getByRole('form', { name: 'Contact form' })).toBeVisible();
  if (BOOKING_PUBLISHED) await expect(page.locator('#door-book')).toBeHidden();
  if (ASSISTANT_PUBLISHED) await expect(page.locator('#door-ai')).toBeHidden();
});

test('the doors work from the keyboard and keep what was typed', async ({
  page,
}) => {
  test.skip(
    !(BOOKING_PUBLISHED && ASSISTANT_PUBLISHED),
    'needs all three doors',
  );
  await gotoHydrated(page, CONTACT_PAIR.en);
  await page.getByLabel('Name').fill('Ada Lovelace');
  await page.locator('#door-message-tab').focus();
  await page.keyboard.press('ArrowLeft');
  await expect(page.locator('#door-book-tab')).toBeFocused();
  await expect(page.locator('#door-book')).toBeVisible();
  await page.keyboard.press('End');
  await expect(page.locator('#door-ai-tab')).toBeFocused();
  await expect(page.locator('#door-ai')).toBeVisible();
  await page.keyboard.press('Home');
  await page.keyboard.press('ArrowRight');
  await expectDoorOpen(page, 'message');
  await page.keyboard.press('Tab');
  await expect(page.locator('#door-message')).toBeFocused();
  await expect(page.getByLabel('Name')).toHaveValue('Ada Lovelace');
});

for (const viewport of [
  { width: 1280, height: 800 },
  { width: 390, height: 844 },
]) {
  for (const path of [CONTACT_PAIR.en, CONTACT_PAIR.es]) {
    test(`${path} shows the doors and the form's first field in the first screen at ${viewport.width}`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport);
      await gotoHydrated(page, path);
      for (const tab of await page.locator('#contact [role="tab"]').all()) {
        await expect(tab).toBeInViewport();
      }
      await expect(
        page.locator('#door-message input').first(),
      ).toBeInViewport();
    });
  }
}

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

test('an interactive check asks for the tick, not an error, and the enquiry goes once it is ticked', async ({
  page,
}) => {
  await forceInteractiveTurnstile(page);
  const email = uniqueEmail('interactive');
  await gotoHydrated(page, CONTACT_PAIR.en);
  await page.getByLabel('Name').focus();
  const box = page.getByRole('button', { name: 'Fake Turnstile checkbox' });
  await expect(box).toBeVisible();
  await expect(page.getByText('Tick the box to continue.')).toBeVisible();
  await fillForm(page, email);
  await page.getByRole('button', { name: 'Send message' }).click();
  await expect(
    page.getByRole('button', { name: "Checking you're not a bot…" }),
  ).toBeVisible();
  await expect(page.getByRole('alert')).toHaveCount(0);
  await box.click();
  await expect(page.getByText('Message sent')).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText('Tick the box to continue.')).toHaveCount(0);
});
