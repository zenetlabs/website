import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import AxeBuilder from '@axe-core/playwright';
import {
  type APIRequestContext,
  expect,
  type Page,
  test,
} from '@playwright/test';
import { BOOKING_RULES } from '../src/content/booking-rules';
import { formatSlotDay, formatSlotTime } from '../src/lib/slot-format';
import { groupByDay, type Slot, zonedToInstant } from '../src/lib/slots';
import { availableSlots } from '../src/server/booking-slots';
import {
  agentHeaders,
  cancelLinkIn,
  confirmLinkFor,
  confirmLinksFor,
  googleBusy,
  googleDeletions,
  googleEvents,
  googleFail,
  googleReset,
  sentFor,
  startVoiceSession,
  TEST_CALENDAR,
  uniqueEmail,
} from './fakes';
import { BOOKING_PUBLISHED, gotoHydrated, settleAnimations } from './helpers';

test.skip(!BOOKING_PUBLISHED, 'booking is not published in this build');
test.describe.configure({ mode: 'serial' });

const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

// Whole owner-zone working days (Monday to Thursday, no holiday, all twelve
// times past the notice), earlier than the late window (12+ days out) that
// api-tools, voice and webmcp book in. The tests share four of them, never
// one slot, and at most three requests a day. Twelve days hold at least four
// such days unless a holiday falls in a short week.
const LATE_WINDOW_DAYS = 12;
const FULL_DAY = 12;

function ownerDays(): Slot[][] {
  const now = Date.now();
  const lateFrom = new Date(now + LATE_WINDOW_DAYS * 86_400_000)
    .toISOString()
    .slice(0, 10);
  const slots = availableSlots({
    rules: BOOKING_RULES,
    now,
    busy: [],
    booked: [],
  });
  const days = new Map<string, Slot[]>();
  for (const slot of slots) {
    if (slot.day >= lateFrom) continue;
    days.set(slot.day, [...(days.get(slot.day) ?? []), slot]);
  }
  return [...days.values()].filter((day) => day.length === FULL_DAY);
}

function atOwnerTime(day: Slot, at: string): number {
  const [year = 0, month = 0, date = 0] = day.day.split('-').map(Number);
  const [hours = 0, minutes = 0] = at.split(':').map(Number);
  const instant = zonedToInstant(
    { year, month, day: date },
    hours * 60 + minutes,
    BOOKING_RULES.zone,
  );
  if (instant === null) throw new Error(`no ${at} on ${day.day}`);
  return instant;
}

function dayAt(index: number): Slot[] {
  const day = ownerDays()[index];
  if (!day) throw new Error(`fewer than ${index + 1} bookable days`);
  return day;
}

function slotValue(day: Slot[], at: string): string {
  const first = day[0];
  if (!first) throw new Error('empty day');
  return new Date(atOwnerTime(first, at)).toISOString();
}

async function slotValues(page: Page): Promise<string[]> {
  return page
    .locator('input[name="slot"]')
    .evaluateAll((inputs) =>
      inputs.flatMap((input) =>
        input instanceof HTMLInputElement ? [input.value] : [],
      ),
    );
}

// The calendar shows one day's times at a time: open the slot's day, then
// press its time (the radios are visually hidden inside their labels).
async function dayOf(page: Page, slot: string) {
  return page
    .locator(`input[name="slot"][value="${slot}"]`)
    .evaluate((input) => input.closest('[data-day]')?.getAttribute('data-day'));
}

async function pickSlot(page: Page, slot: string) {
  await page
    .locator(`.cal-day[data-date="${await dayOf(page, slot)}"]`)
    .click();
  await page.locator(`label.time-chip:has(input[value="${slot}"])`).click();
  await expect(
    page.locator(`input[name="slot"][value="${slot}"]`),
  ).toBeChecked();
}

async function bearerBook(
  request: APIRequestContext,
  slot: string,
  email = uniqueEmail('api'),
) {
  const response = await request.post('/api/tools/book_meeting', {
    headers: agentHeaders(await startVoiceSession(request)),
    data: {
      confirmed: true,
      slot,
      name: '[TEST] Api',
      email,
      topic: 'Automate our inbox triage please.',
    },
  });
  expect(response.status()).toBe(200);
  return (await response.json()).result;
}

test.beforeAll(googleReset);

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('/book lists times in Singapore time, with a usable zone form and the mailto', async ({
    page,
  }) => {
    const response = await page.goto('/book');
    expect(response?.status()).toBe(200);
    await expect(page.locator('[data-booking="open"]')).toBeVisible();
    await expect(page.getByText('Times in Singapore')).toBeVisible();
    await expect(
      page.locator('[data-booking="open"] [data-day]:not([hidden]) legend'),
    ).toContainText('times');
    await expect(
      page.locator('.cal-day[data-status="open"]').first(),
    ).toBeVisible();
    await expect(page.locator('noscript p')).toContainText(
      'Booking needs JavaScript.',
    );
    await expect(page.locator('noscript p')).toBeVisible();
    await expect(
      page.locator('noscript a[href="mailto:hello@zenetlabs.com"]'),
    ).toBeVisible();
    await expect(page.getByLabel('Name')).toBeDisabled();

    await page.getByLabel('Your time zone').selectOption('Asia/Tokyo');
    await page.locator('noscript button').click();
    await expect(page).toHaveURL(/\/book\?tz=Asia%2FTokyo$/);
    await expect(page.getByText('Times in Tokyo')).toBeVisible();
  });

  test('/es/reservar lists times in Madrid time with the Spanish notice', async ({
    page,
  }) => {
    const response = await page.goto('/es/reservar');
    expect(response?.status()).toBe(200);
    await expect(page.getByText('Horas en Madrid')).toBeVisible();
    await expect(page.locator('noscript p')).toContainText(
      'Reservar requiere JavaScript.',
    );
    await expect(
      page.getByRole('button', { name: 'Ver horarios' }),
    ).toBeVisible();
  });

  test('an unknown zone in the URL falls back to the locale default without a redirect', async ({
    request,
  }) => {
    const response = await request.get('/book?tz=Mars%2FBase', {
      maxRedirects: 0,
    });
    expect(response.status()).toBe(200);
    expect(await response.text()).toContain('Times in Singapore');
  });
});

test.describe('in a Singapore browser', () => {
  test.use({ timezoneId: 'Asia/Singapore' });

  test('the Spanish page switches to the browser zone after hydration and matches the engine', async ({
    page,
  }) => {
    await gotoHydrated(page, '/es/reservar');
    await expect(page.getByLabel('Tu zona horaria')).toHaveValue(
      'Asia/Singapore',
    );
    await expect(page.getByText('Horas en Singapur')).toBeVisible();

    const slots = availableSlots({
      rules: BOOKING_RULES,
      now: Date.now(),
      busy: [],
      booked: [],
    });
    const third = groupByDay(slots, 'Asia/Singapore')[2];
    const first = third?.entries[0]?.slot;
    if (!third || !first) throw new Error('no third day');
    const day = page.locator(`.cal-day[data-date="${third.date}"]`);
    const name = formatSlotDay('es', first.start, 'Asia/Singapore');
    // The day's number is visible; its name says the date and the count.
    await expect(day).toHaveText(String(Number(third.date.slice(8))));
    await expect(day).toHaveAccessibleName(
      new RegExp(`^${name}, \\d+ horas?$`),
    );
    await day.click();
    await expect(day).toHaveAttribute('aria-pressed', 'true');
    const shown = page.locator(
      '[data-booking="open"] [data-day]:not([hidden])',
    );
    await expect(shown.locator('legend')).toContainText(new RegExp(name, 'i'));
    await expect(
      shown.getByRole('radio', { includeHidden: true }).first(),
    ).toHaveAttribute('value', new Date(first.start).toISOString());
    await expect(shown.locator('label').first()).toHaveText(
      formatSlotTime('es', first.start, 'Asia/Singapore'),
    );
  });

  test('the select changes the zone, the URL and the labels without a reload', async ({
    page,
  }) => {
    await gotoHydrated(page, '/book');
    const firstLabel = page
      .locator('[data-booking="open"] [data-day]:not([hidden]) label')
      .first();
    const before = await firstLabel.innerText();
    await page.getByLabel('Your time zone').selectOption('America/New_York');
    await expect(page).toHaveURL(/tz=America%2FNew_York/);
    await expect(page.getByText('Times in New York')).toBeVisible();
    await expect(firstLabel).not.toHaveText(before);
  });
});

test('busy time and its 15 minute buffer disappear from the list', async ({
  page,
}) => {
  const day = dayAt(1);
  const first = day[0];
  if (!first) throw new Error('empty day');
  await googleBusy(TEST_CALENDAR, [
    {
      start: new Date(atOwnerTime(first, '10:10')).toISOString(),
      end: new Date(atOwnerTime(first, '10:50')).toISOString(),
    },
  ]);
  await gotoHydrated(page, '/book');
  const values = await slotValues(page);
  for (const gone of ['10:00', '10:30', '11:00']) {
    expect(values, gone).not.toContain(slotValue(day, gone));
  }
  for (const kept of ['11:30', '12:00']) {
    expect(values, kept).toContain(slotValue(day, kept));
  }
});

async function requestOnPage(
  page: Page,
  {
    slot,
    email,
    path = '/book',
  }: { slot: string; email: string; path?: string },
) {
  const es = path.startsWith('/es');
  await gotoHydrated(page, path);
  await pickSlot(page, slot);
  await page.getByLabel(es ? 'Nombre' : 'Name').fill('[TEST] Ada Lovelace');
  await page
    .getByLabel(
      es
        ? 'Correo electrónico (aquí llega el enlace para confirmar)'
        : 'Email (the confirmation link goes here)',
    )
    .fill(email);
  await page
    .getByLabel(
      es ? '¿De qué te gustaría hablar?' : 'What would you like to talk about?',
    )
    .fill('We want to automate our inbox triage.');
  await page.getByRole('checkbox').check();
  const submit = page.getByRole('button', {
    name: es ? 'Pedir esta hora' : 'Request this time',
  });
  await expect(submit).toBeEnabled({ timeout: 30_000 });
  await submit.click();
}

test('a visitor requests by keyboard and gets the pending panel, an email and no event yet', async ({
  page,
}) => {
  const day = dayAt(0);
  const slot = slotValue(day, '10:00');
  const email = uniqueEmail('kbd');
  await gotoHydrated(page, '/book?utm_source=e2e&gclid=g9');

  // The day first (arrow keys in the date grid, Space on it), then its time.
  // The calendar opens once its chunk is in and it has hydrated.
  await expect(page.locator('.cal-day[tabindex="0"]')).toBeEnabled();
  const dayKey = await dayOf(page, slot);
  const active = page.locator('.cal-day[tabindex="0"]');
  await active.focus();
  const from = (await active.getAttribute('data-date')) ?? '';
  await page.keyboard.press('ArrowDown');
  const week = new Date(`${from}T00:00:00Z`);
  week.setUTCDate(week.getUTCDate() + 7);
  const below = page.locator(
    `.cal-day[data-date="${week.toISOString().slice(0, 10)}"]`,
  );
  if ((await below.count()) > 0) await expect(below).toBeFocused();
  await page.locator(`.cal-day[data-date="${dayKey}"]`).focus();
  await page.keyboard.press('Space');
  await expect(page.locator(`.cal-day[data-date="${dayKey}"]`)).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await page.locator(`input[name="slot"][value="${slot}"]`).focus();
  await page.keyboard.press('Space');
  await expect(
    page.locator(`input[name="slot"][value="${slot}"]`),
  ).toBeChecked();
  await page.getByLabel('Name').focus();
  await page.keyboard.type('[TEST] Ada Lovelace');
  await page.keyboard.press('Tab');
  await page.keyboard.type(email);
  await page.keyboard.press('Tab');
  await page.keyboard.type('Analytical Engines');
  await page.keyboard.press('Tab');
  await page.keyboard.type('We want to automate our inbox triage.');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Space');
  const submit = page.getByRole('button', { name: 'Request this time' });
  await expect(submit).toBeEnabled({ timeout: 30_000 });
  await submit.focus();
  await page.keyboard.press('Enter');

  const heading = page.getByRole('heading', { name: 'Check your inbox' });
  await expect(heading).toBeVisible({ timeout: 30_000 });
  await expect(heading).toBeFocused();
  await expect(page.getByText(`have sent a link to ${email}`)).toBeVisible();

  const link = await confirmLinkFor(email);
  expect(new URL(link).pathname).toBe('/book');
  const sent = await sentFor(email);
  expect(sent).toHaveLength(1);
  expect(sent[0]?.text).not.toContain('Analytical Engines');
  expect(sent[0]?.text).not.toContain('Lovelace');
  expect(
    (await googleEvents()).filter((event) =>
      event.attendees.some((attendee) => attendee.email === email),
    ),
  ).toEqual([]);

  await page.reload();
  await page.waitForSelector('body[data-hydrated="true"]');
  expect(await slotValues(page)).not.toContain(slot);
});

for (const locale of ['en', 'es'] as const) {
  test(`${locale}: the emailed link survives a scanner, books on Confirm and the owner can cancel it`, async ({
    page,
    request,
  }) => {
    const es = locale === 'es';
    const day = dayAt(es ? 1 : 0);
    const slot = slotValue(day, '14:00');
    const email = uniqueEmail(`flow-${locale}`);
    await requestOnPage(page, {
      slot,
      email,
      path: es ? '/es/reservar' : '/book',
    });
    await expect(
      page.getByRole('heading', {
        name: es ? 'Revisa tu correo' : 'Check your inbox',
      }),
    ).toBeVisible({ timeout: 30_000 });
    const link = await confirmLinkFor(email);
    expect(new URL(link).pathname).toBe(es ? '/es/reservar' : '/book');

    // A mail scanner prefetches the link: nothing may change.
    const fetched = await request.get(link, { maxRedirects: 0 });
    expect(fetched.status()).toBe(200);
    expect(fetched.headers()['x-robots-tag']).toBe('noindex');
    expect(fetched.headers()['cache-control']).toBe('private, no-store');
    expect(fetched.headers()['referrer-policy']).toBe('same-origin');
    expect(await fetched.text()).not.toContain('Lovelace');
    expect((await request.head(link, { maxRedirects: 0 })).status()).toBe(200);
    const mine = async () =>
      (await googleEvents()).filter((event) => event.start.dateTime === slot);
    expect(await mine()).toEqual([]);

    await gotoHydrated(page, link.replace(/^https?:\/\/[^/]+/, ''));
    await expect(
      page.getByRole('heading', {
        name: es ? 'Confirma tu llamada' : 'Confirm your call',
      }),
    ).toBeVisible();
    await expect(page.getByText(/•••@example\.com/)).toBeVisible();
    await page
      .getByRole('button', {
        name: es ? 'Confirmar la llamada' : 'Confirm the call',
      })
      .click();
    await expect(
      page.getByRole('heading', {
        name: es ? 'Tu llamada está reservada' : 'Your call is booked',
      }),
    ).toBeVisible({ timeout: 30_000 });
    expect(new URL(page.url()).pathname).toBe(es ? '/es/reservar' : '/book');

    const events = await mine();
    expect(events).toHaveLength(1);
    expect(events[0]?.id).toMatch(/^bk[0-9a-f]{32}$/);
    expect(events[0]?.calendarId).toBe(TEST_CALENDAR);
    await expect.poll(async () => (await sentFor(email)).length).toBe(3);
    const sent = await sentFor(email);
    const booked = sent.find(
      (mail) => mail.to === email && !mail.subject?.startsWith('Confirm'),
    );
    expect(booked?.subject).toMatch(es ? /^Reservada: / : /^Booked: /);
    const owner = sent.find((mail) => mail.to !== email);
    expect(owner?.text).toContain('Booking: confirmed');
    const cancel = cancelLinkIn(owner?.text ?? null);

    // The owner opens the cancel link: a GET never cancels.
    const ownerPage = await request.get(cancel);
    expect(ownerPage.status()).toBe(200);
    expect(ownerPage.headers()['x-robots-tag']).toBe('noindex');
    expect(await mine()).toHaveLength(1);
    await page.goto(cancel.replace(/^https?:\/\/[^/]+/, ''));
    await page
      .getByRole('button', { name: 'Cancel the call and email the visitor' })
      .click();
    await expect(
      page.getByText(/^Cancelled\. The event is deleted/),
    ).toBeVisible();
    expect(await mine()).toEqual([]);
    expect(
      (await googleDeletions()).filter(
        (deletion) => deletion.eventId === events[0]?.id,
      ),
    ).toEqual([
      {
        calendarId: TEST_CALENDAR,
        eventId: events[0]?.id,
        sendUpdates: 'all',
        status: 204,
      },
    ]);
    await expect.poll(async () => (await sentFor(email)).length).toBe(4);
    const cancelled = (await sentFor(email)).at(-1);
    expect(cancelled?.subject).toMatch(es ? /^Cancelada: / : /^Cancelled: /);

    // The link now shows the cancelled state.
    await gotoHydrated(page, link.replace(/^https?:\/\/[^/]+/, ''));
    await expect(
      page.getByRole('heading', {
        name: es ? 'Esta llamada se ha cancelado' : 'This call was cancelled',
      }),
    ).toBeVisible();
  });
}

test('a resend makes the first link invalid, and the newest one works', async ({
  page,
}) => {
  const slot = slotValue(dayAt(1), '15:00');
  const email = uniqueEmail('resend');
  await requestOnPage(page, { slot, email });
  const first = await confirmLinkFor(email);
  const resend = page.getByRole('button', { name: 'Send the email again' });
  await expect(resend).toBeEnabled({ timeout: 30_000 });
  await resend.click();
  await expect(
    page.getByText('Sent again. Only the newest link works.'),
  ).toBeVisible({ timeout: 30_000 });
  await expect
    .poll(async () => confirmLinksFor(await sentFor(email)).length)
    .toBe(2);
  const second = confirmLinksFor(await sentFor(email)).at(-1) ?? '';
  expect(second).not.toBe(first);
  await gotoHydrated(page, first.replace(/^https?:\/\/[^/]+/, ''));
  await expect(
    page.getByRole('heading', { name: "This link doesn't work" }),
  ).toBeVisible();
  await gotoHydrated(page, second.replace(/^https?:\/\/[^/]+/, ''));
  await expect(
    page.getByRole('heading', { name: 'Confirm your call' }),
  ).toBeVisible();
});

test('a disposable address gets its message and no email', async ({ page }) => {
  const slot = slotValue(dayAt(2), '10:00');
  const email = `e2e-${crypto.randomUUID().slice(0, 8)}@mailinator.com`;
  await requestOnPage(page, { slot, email });
  await expect(page.getByRole('alert')).toContainText(
    'Please use a permanent email address.',
  );
  expect(await sentFor(email)).toEqual([]);
});

test('a filled honeypot shows the same pending panel and sends nothing', async ({
  page,
}) => {
  const slot = slotValue(dayAt(2), '11:00');
  const email = uniqueEmail('bot');
  await gotoHydrated(page, '/book');
  await page.locator('input[name="website"]').evaluate((input) => {
    if (input instanceof HTMLInputElement) input.value = 'http://spam.example';
  });
  await pickSlot(page, slot);
  await page.getByLabel('Name').fill('[TEST] Bot');
  await page.getByLabel('Email (the confirmation link goes here)').fill(email);
  await page
    .getByLabel('What would you like to talk about?')
    .fill('Spam spam spam spam spam.');
  await page.getByRole('checkbox').check();
  const submit = page.getByRole('button', { name: 'Request this time' });
  await expect(submit).toBeEnabled({ timeout: 30_000 });
  await submit.click();
  await expect(
    page.getByRole('heading', { name: 'Check your inbox' }),
  ).toBeVisible({ timeout: 30_000 });
  await page.waitForTimeout(500);
  expect(await sentFor(email)).toEqual([]);
});

test('an expired link says so, and every confirm state passes axe', async ({
  page,
}) => {
  await gotoHydrated(
    page,
    `/book?confirm=${crypto.randomUUID()}.${'A'.repeat(43)}`,
  );
  await expect(
    page.getByRole('heading', { name: "This link doesn't work" }),
  ).toBeVisible();
  await settleAnimations(page);
  const results = await new AxeBuilder({ page }).withTags(TAGS).analyze();
  expect(results.violations).toEqual([]);
});

test('a slot taken meanwhile gives the alert, one refresh and keeps what was typed', async ({
  page,
  request,
}) => {
  const day = dayAt(2);
  const slot = slotValue(day, '15:00');
  await gotoHydrated(page, '/book');
  const radios = page.locator('input[name="slot"]');
  const before = await radios.count();
  await pickSlot(page, slot);
  await page.getByLabel('Name').fill('[TEST] Late Visitor');
  await page
    .getByLabel('Email (the confirmation link goes here)')
    .fill(uniqueEmail('late'));
  await page
    .getByLabel('What would you like to talk about?')
    .fill('Taking the slot too late.');
  await page.getByRole('checkbox').check();
  expect((await bearerBook(request, slot)).status).toBe('pending');
  const submit = page.getByRole('button', { name: 'Request this time' });
  await expect(submit).toBeEnabled({ timeout: 30_000 });
  const refreshes: string[] = [];
  page.on('request', (call) => {
    if (call.url().includes('/api/book/slots')) refreshes.push(call.method());
  });
  await submit.click();
  await expect(page.getByRole('alert')).toContainText(
    'Someone just took that time.',
  );
  await expect.poll(() => radios.count()).toBeLessThan(before);
  expect(refreshes).toEqual(['GET']);
  await expect(page.getByLabel('Name')).toHaveValue('[TEST] Late Visitor');
  expect(await slotValues(page)).not.toContain(slot);
});

test('two parallel bookings of one slot give exactly one booked and one slot_taken', async ({
  request,
}) => {
  const slot = slotValue(dayAt(2), '13:00');
  const results = await Promise.all([
    bearerBook(request, slot),
    bearerBook(request, slot),
  ]);
  expect(results.map((result) => result.status).sort()).toEqual([
    'pending',
    'rejected',
  ]);
  expect(results.find((result) => result.status === 'rejected')).toEqual({
    status: 'rejected',
    reason: 'slot_taken',
  });
  expect(
    (await googleEvents()).filter((event) => event.start.dateTime === slot),
  ).toHaveLength(0);
});

test('three bookings fill a day and the day leaves the list', async ({
  page,
  request,
}) => {
  const day = dayAt(3);
  for (const at of ['10:00', '12:00', '14:00']) {
    expect((await bearerBook(request, slotValue(day, at))).status).toBe(
      'pending',
    );
  }
  expect((await bearerBook(request, slotValue(day, '11:00'))).status).toBe(
    'rejected',
  );
  await gotoHydrated(page, '/book');
  const values = await slotValues(page);
  const offered = day.map((slot) => new Date(slot.start).toISOString());
  expect(values.filter((value) => offered.includes(value))).toEqual([]);
});

test.describe('when Google fails', () => {
  async function unavailablePage(page: Page, path: string) {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      await googleFail('freebusy', 1);
      await page.goto(path);
      if ((await page.locator('[data-booking="unavailable"]').count()) > 0)
        return;
    }
    throw new Error(`${path} never showed the fallback`);
  }

  test('/book falls back to the contact form and the tool says unavailable', async ({
    page,
    request,
  }) => {
    await unavailablePage(page, '/book');
    await expect(
      page.getByRole('heading', {
        name: "Online booking isn't available right now",
      }),
    ).toBeVisible();
    await expect(
      page.getByRole('form', { name: 'Contact form' }),
    ).toBeVisible();
    await expect(
      page.getByRole('link', { name: 'hello@zenetlabs.com' }).first(),
    ).toBeVisible();

    let status = '';
    for (
      let attempt = 0;
      attempt < 5 && status !== 'unavailable';
      attempt += 1
    ) {
      await googleFail('freebusy', 1);
      const response = await request.post('/api/tools/check_availability', {
        data: {},
      });
      expect(response.status()).toBe(200);
      status = (await response.json()).result.status;
    }
    expect(status).toBe('unavailable');
  });

  test('the Spanish fallback is accessible', async ({ page }) => {
    await unavailablePage(page, '/es/reservar');
    await page.waitForSelector('body[data-hydrated="true"]');
    await settleAnimations(page);
    await expect(
      page.getByRole('heading', {
        name: 'La reserva en línea no está disponible ahora mismo',
      }),
    ).toBeVisible();
    const results = await new AxeBuilder({ page })
      .withTags(TAGS)
      .exclude('iframe[src*="challenges.cloudflare.com"]')
      .analyze();
    expect(results.violations).toEqual([]);
  });
});

test('the header CTA points at the booking page in both languages', async ({
  page,
}) => {
  await gotoHydrated(page, '/');
  await expect(page.locator('[data-cta="header"]')).toHaveAttribute(
    'href',
    '/book',
  );
  await gotoHydrated(page, '/es');
  await expect(page.locator('[data-cta="header"]')).toHaveAttribute(
    'href',
    '/es/reservar',
  );
});

for (const path of ['/book', '/es/reservar']) {
  test(`${path} is accessible with a picked day and time`, async ({ page }) => {
    await gotoHydrated(page, path);
    await page.locator('.cal-day[data-status="open"]').last().click();
    await page
      .locator('[data-day]:not([hidden]) label.time-chip')
      .first()
      .click();
    await settleAnimations(page);
    const results = await new AxeBuilder({ page })
      .withTags(TAGS)
      .exclude('iframe[src*="challenges.cloudflare.com"]')
      .analyze();
    expect(results.violations).toEqual([]);
  });
}

test('closed days are focusable, named with their reason and never picked', async ({
  page,
}) => {
  await gotoHydrated(page, '/book');
  const closed = page.locator('.cal-day[aria-disabled="true"]');
  expect(await closed.count()).toBeGreaterThan(0);
  const off = page.locator('.cal-day[data-status="off"]').first();
  await expect(off).toHaveAccessibleName(
    /, calls are Monday to Thursday \(Madrid time\)$/,
  );
  await expect(off).toHaveAttribute(
    'title',
    'Calls are Monday to Thursday (Madrid time)',
  );
  await expect(page.locator('.cal-day[tabindex="0"]')).toBeEnabled();
  const picked = page.locator('.cal-day[aria-pressed="true"]');
  const before = await picked.getAttribute('data-date');
  // Playwright waits forever on an aria-disabled target; a visitor's click
  // reaches it and changes nothing.
  await off.click({ force: true });
  await expect(picked).toHaveAttribute('data-date', before ?? '');
  for (const date of await page
    .locator('.cal-day[data-status="open"]')
    .evaluateAll((cells) =>
      cells.map((cell) => cell.getAttribute('data-date')),
    )) {
    const [year = 0, month = 0, day = 0] = (date ?? '').split('-').map(Number);
    const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
    // From UTC to Singapore, Madrid's Monday to Thursday stay those days.
    expect([1, 2, 3, 4], date ?? '').toContain(weekday);
  }
});

test('no client file carries Google endpoints or key material', () => {
  const files: string[] = [];
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const path = join(dir, name);
      if (statSync(path).isDirectory()) walk(path);
      else if (/\.(js|css|html|json|txt)$/.test(name)) files.push(path);
    }
  };
  walk(join(process.cwd(), 'dist/client'));
  expect(files.length).toBeGreaterThan(0);
  for (const file of files) {
    const text = readFileSync(file, 'utf8');
    expect(text, file).not.toContain('127.0.0.1:4175/__google');
    expect(text, file).not.toContain('PRIVATE KEY');
    expect(text, file).not.toContain('oauth2.googleapis');
    expect(text, file).not.toContain('cloudflare:workers');
  }
});
