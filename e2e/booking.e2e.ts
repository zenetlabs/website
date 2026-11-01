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
import {
  availableSlots,
  groupByDay,
  type Slot,
  zonedToInstant,
} from '../src/lib/slots';
import {
  googleBusy,
  googleEvents,
  googleFail,
  googleReset,
  sentFor,
  TEST_CALENDAR,
  TOOL_SECRET,
  uniqueEmail,
} from './fakes';
import { BOOKING_PUBLISHED, gotoHydrated, settleAnimations } from './helpers';

test.skip(!BOOKING_PUBLISHED, 'booking is not published in this build');
test.describe.configure({ mode: 'serial' });

const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];
const BEARER = { Authorization: `Bearer ${TOOL_SECRET}` };

// Owner-zone days that currently have bookable slots. Each test uses its own
// index so that the tests never share a slot, and none sits near the notice edge.
function ownerDays(): Slot[][] {
  const slots = availableSlots({
    rules: BOOKING_RULES,
    now: Date.now(),
    busy: [],
    booked: [],
  });
  const days = new Map<string, Slot[]>();
  for (const slot of slots)
    days.set(slot.day, [...(days.get(slot.day) ?? []), slot]);
  return [...days.values()];
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

async function bearerBook(
  request: APIRequestContext,
  slot: string,
  email = uniqueEmail('api'),
) {
  const response = await request.post('/api/tools/book_meeting', {
    headers: BEARER,
    data: {
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
      page.locator('[data-booking="open"] summary').first(),
    ).toContainText('times');
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
    const details = page.locator('[data-booking="open"] details').nth(2);
    await expect(details.locator('summary')).toContainText(
      formatSlotDay('es', first.start, 'Asia/Singapore'),
    );
    await expect(
      details.getByRole('radio', { includeHidden: true }).first(),
    ).toHaveAttribute('value', new Date(first.start).toISOString());
    await details.locator('summary').click();
    await expect(details.locator('label').first()).toHaveText(
      formatSlotTime('es', first.start, 'Asia/Singapore'),
    );
  });

  test('the select changes the zone, the URL and the labels without a reload', async ({
    page,
  }) => {
    await gotoHydrated(page, '/book');
    const firstLabel = page
      .locator('[data-booking="open"] details')
      .first()
      .locator('label')
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
  const day = dayAt(3);
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
  for (const gone of ['09:30', '10:00', '10:30', '11:00']) {
    expect(values, gone).not.toContain(slotValue(day, gone));
  }
  for (const kept of ['09:00', '11:30']) {
    expect(values, kept).toContain(slotValue(day, kept));
  }
});

test('a visitor books by keyboard and gets the panel, the event and both emails', async ({
  page,
}) => {
  const day = dayAt(1);
  const slot = slotValue(day, '10:00');
  const email = uniqueEmail('kbd');
  await gotoHydrated(page, '/book?utm_source=e2e&gclid=g9');

  await page.locator(`input[value="${slot}"]`).focus();
  await page.keyboard.press('Space');
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
  const submit = page.getByRole('button', { name: 'Book this time' });
  await expect(submit).toBeEnabled({ timeout: 30_000 });
  await submit.focus();
  await page.keyboard.press('Enter');

  const heading = page.getByRole('heading', { name: "You're booked" });
  await expect(heading).toBeVisible({ timeout: 30_000 });
  await expect(heading).toBeFocused();
  await expect(
    page.getByRole('link', { name: 'Join with Google Meet' }),
  ).toHaveAttribute('href', /^https:\/\/meet\.google\.com\/fak-e\d+$/);

  const events = (await googleEvents()).filter((event) =>
    event.attendees.some((attendee) => attendee.email === email),
  );
  expect(events).toHaveLength(1);
  expect(events[0]).toMatchObject({
    calendarId: TEST_CALENDAR,
    summary: 'Zenet Labs · 30-minute call',
  });
  expect(events[0]?.start.dateTime).toBe(slot);

  await expect.poll(async () => (await sentFor(email)).length).toBe(2);
  const sent = await sentFor(email);
  const owner = sent.find((mail) => mail.to !== email);
  expect(owner?.subject).toBe(
    '[TEST] [Lead EN] [TEST] Ada Lovelace — Analytical Engines — booking',
  );
  expect(owner?.text).toContain('Booking: confirmed');
  expect(owner?.text).toContain('gclid: g9');
  const confirmation = sent.find((mail) => mail.to === email);
  expect(confirmation?.subject).toMatch(
    /^Booked: 30-minute call with Zenet Labs, /,
  );
  expect(confirmation?.text).toMatch(/https:\/\/meet\.google\.com\/fak-e\d+/);
  expect(confirmation?.text).not.toContain('Analytical Engines');

  await page.reload();
  await page.waitForSelector('body[data-hydrated="true"]');
  const values = await slotValues(page);
  for (const gone of ['09:30', '10:00', '10:30']) {
    expect(values, gone).not.toContain(slotValue(day, gone));
  }
});

test('a slot taken meanwhile gives the alert, one refresh and keeps what was typed', async ({
  page,
  request,
}) => {
  const day = dayAt(4);
  const slot = slotValue(day, '15:00');
  await gotoHydrated(page, '/book');
  const radios = page.locator('input[name="slot"]');
  const before = await radios.count();
  const input = page.locator(`input[value="${slot}"]`);
  await input.evaluate((el) => el.closest('details')?.setAttribute('open', ''));
  await input.check();
  await page.getByLabel('Name').fill('[TEST] Late Visitor');
  await page
    .getByLabel('Email (the invitation goes here)')
    .fill(uniqueEmail('late'));
  await page
    .getByLabel('What would you like to talk about?')
    .fill('Taking the slot too late.');
  await page.getByRole('checkbox').check();
  expect((await bearerBook(request, slot)).status).toBe('booked');
  const submit = page.getByRole('button', { name: 'Book this time' });
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
  const slot = slotValue(dayAt(5), '14:00');
  const results = await Promise.all([
    bearerBook(request, slot),
    bearerBook(request, slot),
  ]);
  expect(results.map((result) => result.status).sort()).toEqual([
    'booked',
    'rejected',
  ]);
  expect(results.find((result) => result.status === 'rejected')).toEqual({
    status: 'rejected',
    reason: 'slot_taken',
  });
  expect(
    (await googleEvents()).filter((event) => event.start.dateTime === slot),
  ).toHaveLength(1);
});

test('three bookings fill a day and the day leaves the list', async ({
  page,
  request,
}) => {
  const day = dayAt(6);
  for (const at of ['08:00', '12:00', '16:00']) {
    expect((await bearerBook(request, slotValue(day, at))).status).toBe(
      'booked',
    );
  }
  expect((await bearerBook(request, slotValue(day, '10:00'))).status).toBe(
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

  test('the Spanish fallback is accessible in light and dark', async ({
    page,
  }) => {
    for (const colorScheme of ['light', 'dark'] as const) {
      await page.emulateMedia({ colorScheme });
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
    }
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

test('the open page is accessible with a picked time, in light and dark', async ({
  page,
}) => {
  for (const colorScheme of ['light', 'dark'] as const) {
    await page.emulateMedia({ colorScheme });
    await gotoHydrated(page, '/es/reservar');
    await page.locator('input[name="slot"]').first().check();
    await settleAnimations(page);
    const results = await new AxeBuilder({ page })
      .withTags(TAGS)
      .exclude('iframe[src*="challenges.cloudflare.com"]')
      .analyze();
    expect(results.violations).toEqual([]);
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
