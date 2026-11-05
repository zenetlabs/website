import { env } from 'cloudflare:workers';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  availability,
  type BookRequest,
  bookMeeting,
  clearBusyCache,
  confirmFromLink,
  pageSlots,
} from '@/server/booking';
import type { BookingInput } from '@/server/booking-schema';
import { clearTokenCache } from '@/server/google-auth';
import { CONSENT_VERSION } from '@/server/lead-fields';
import { storeLead } from '@/server/lead-store';
import {
  bookingDeps,
  newWorld,
  signingCredentials,
  type World,
} from '../../test/google';
import { DAY, NEW_LEAD } from '../../test/leads';

const { DB } = env;
const NOW = Date.UTC(2027, 0, 4, 8, 0);
const LATER = NOW + 60_000;
const TUESDAY_10 = Date.UTC(2027, 0, 12, 9, 0);
const ORIGIN = 'https://zenetlabs.com';

let world: World;
let background: Promise<unknown>[];
let secret: string;

async function settle() {
  await Promise.allSettled(background);
}

function deps(
  overrides: {
    secret?: string | null;
    busyCacheMs?: number;
    failureCacheMs?: number;
    published?: boolean;
  } = {},
) {
  const base = bookingDeps(
    DB,
    world,
    overrides.secret === undefined ? secret : overrides.secret,
    background,
  );
  return {
    ...base,
    site: {
      ...base.site,
      booking: { published: overrides.published ?? true },
    },
    server: {
      ...base.server,
      booking: {
        ...base.server.booking,
        busyCacheMs: overrides.busyCacheMs ?? base.server.booking.busyCacheMs,
        failureCacheMs:
          overrides.failureCacheMs ?? base.server.booking.failureCacheMs,
      },
    },
  };
}

function input(overrides: Partial<BookingInput> = {}): BookingInput {
  return {
    slot: new Date(TUESDAY_10).toISOString(),
    name: 'Ada Lovelace',
    email: 'ada@example.com',
    company: 'Analytical Engines',
    topic: 'We want to automate our inbox triage and invoicing.',
    timeZone: 'Asia/Singapore',
    locale: 'en',
    ...overrides,
  };
}

function request(
  overrides: Partial<BookingInput> = {},
  rest: Partial<BookRequest> = {},
): BookRequest {
  return {
    input: input(overrides),
    channel: 'web',
    surface: 'page',
    consentAt: NOW,
    attribution: { landing: '/?utm_source=news', referrer: '', page: '/book' },
    chatSessionId: null,
    origin: ORIGIN,
    ip: { address: '203.0.113.7', secret: 'ts-secret' },
    ...rest,
  };
}

// The request: holds the slot and sends the verify email.
async function ask(
  overrides: Partial<BookingInput> = {},
  isTest = false,
  rest: Partial<BookRequest> = {},
  now = NOW,
) {
  const result = await bookMeeting(request(overrides, rest), {
    deps: deps(),
    now,
    isTest,
  });
  await settle();
  return result;
}

// The newest confirm token emailed to this address.
function tokenFor(email = 'ada@example.com'): string {
  const mail = world.sent.filter((sent) => sent.to === email).at(-1);
  const match = /\?confirm=([\w.-]+)/.exec(mail?.text ?? '');
  if (!match?.[1]) throw new Error(`no confirm link for ${email}`);
  return match[1];
}

async function confirm(token: string, now = LATER) {
  const result = await confirmFromLink(token, { deps: deps(), now });
  await settle();
  return result;
}

// Request and confirm from the email, as a visitor does.
async function book(
  overrides: Partial<BookingInput> = {},
  isTest = false,
  rest: Partial<BookRequest> = {},
) {
  const asked = await ask(overrides, isTest, rest);
  if (asked.status !== 'pending') return asked;
  return confirm(tokenFor(overrides.email ?? 'ada@example.com'));
}

async function rows(sql: string): Promise<Record<string, unknown>[]> {
  return (await DB.prepare(sql).all()).results;
}

beforeEach(async () => {
  world = newWorld(NOW);
  background = [];
  clearTokenCache();
  clearBusyCache();
  secret = JSON.stringify((await signingCredentials()).credentials);
  await DB.prepare('DELETE FROM bookings').run();
  await DB.prepare('DELETE FROM leads').run();
  await DB.prepare('DELETE FROM booking_ip_usage').run();
});

describe('a request', () => {
  it('holds the slot, emails the visitor a link and tells the owner nothing', async () => {
    const result = await ask();
    expect(result).toEqual({
      status: 'pending',
      start: TUESDAY_10,
      end: TUESDAY_10 + 1_800_000,
      expiresAt: NOW + 30 * 60_000,
      resent: false,
    });
    const [booking] = await rows('SELECT * FROM bookings');
    expect(booking).toMatchObject({
      status: 'held',
      hold_expires_at: NOW + 30 * 60_000,
      confirm_expires_at: NOW + 30 * 60_000,
      confirmed_at: null,
      email: 'ada@example.com',
      email_key: 'ada@example.com',
      link_origin: ORIGIN,
      channel: 'web',
      lead_id: null,
    });
    expect(String(booking?.confirm_hash)).toMatch(/^[0-9a-f]{64}$/);
    expect(JSON.parse(String(booking?.request))).toMatchObject({
      name: 'Ada Lovelace',
      company: 'Analytical Engines',
      consentAt: NOW,
      surface: 'page',
    });
    expect(world.events).toEqual([]);
    expect(await rows('SELECT id FROM leads')).toEqual([]);
    expect(world.sent.map((mail) => mail.to)).toEqual(['ada@example.com']);
    const [mail] = world.sent;
    expect(mail?.subject).toBe(
      'Confirm your call with Zenet Labs: Tuesday 12 January, 5:00 pm',
    );
    expect(mail?.text).toContain(`${ORIGIN}/book?confirm=${tokenFor()}`);
    for (const text of ['Ada Lovelace', 'Analytical Engines', 'inbox triage']) {
      expect(mail?.text).not.toContain(text);
    }
    expect(await rows('SELECT sends FROM booking_ip_usage')).toEqual([
      { sends: 1 },
    ]);
  });

  it('points the links at the origin of the request, a preview alias included', async () => {
    const preview = 'https://pr-5-prod-zenet-web.zenetlabs.workers.dev';
    await ask({ locale: 'es' }, true, { origin: preview });
    expect(world.sent[0]?.text).toContain(
      `${preview}/es/reservar?confirm=${tokenFor()}`,
    );
  });

  it('rejects a disposable address before it looks at the calendar', async () => {
    expect(await ask({ email: 'someone@mailinator.com' })).toEqual({
      status: 'rejected',
      reason: 'email_not_accepted',
    });
    expect(await ask({ email: 'someone@x.mailinator.com' })).toEqual({
      status: 'rejected',
      reason: 'email_not_accepted',
    });
    expect(world.freebusyCalls).toEqual([]);
    expect(world.sent).toEqual([]);
    expect(await rows('SELECT id FROM bookings')).toEqual([]);
  });

  it.each([
    ['off the grid', Date.UTC(2027, 0, 12, 9, 10)],
    ['under 12 hours away', NOW + 11 * 3_600_000],
    ['on a weekend', Date.UTC(2027, 0, 16, 9, 0)],
  ])(
    'rejects a slot %s without touching the calendar or the database',
    async (_label, start) => {
      const result = await ask({ slot: new Date(start).toISOString() });
      expect(result).toEqual({ status: 'rejected', reason: 'invalid_slot' });
      expect(world.events).toEqual([]);
      expect(await rows('SELECT id FROM bookings')).toEqual([]);
      expect(world.sent).toEqual([]);
    },
  );

  it('rejects a busy slot as taken', async () => {
    world.busy.set('main-calendar', [
      { start: TUESDAY_10, end: TUESDAY_10 + 1_800_000 },
    ]);
    expect(await ask()).toEqual({ status: 'rejected', reason: 'slot_taken' });
    expect(world.sent).toEqual([]);
  });

  it('lets only one of two parallel requests for a slot through', async () => {
    const results = await Promise.all(
      ['a@example.com', 'b@example.com'].map((email) =>
        bookMeeting(request({ email }), {
          deps: deps(),
          now: NOW,
          isTest: false,
        }),
      ),
    );
    await settle();
    expect(results.map((result) => result.status).sort()).toEqual([
      'pending',
      'rejected',
    ]);
    expect(world.sent).toHaveLength(1);
  });

  it('stops at three in one owner day, pending ones included', async () => {
    for (const [index, hour] of [8, 11, 14].entries()) {
      const result = await ask({
        email: `p${index}@example.com`,
        slot: new Date(Date.UTC(2027, 0, 12, hour, 0)).toISOString(),
      });
      expect(result.status, `request ${index}`).toBe('pending');
    }
    expect(
      await ask({
        email: 'p3@example.com',
        slot: new Date(Date.UTC(2027, 0, 12, 15, 0)).toISOString(),
      }),
    ).toEqual({ status: 'rejected', reason: 'day_full' });
  });

  it('frees the slot once the 30 minutes are up', async () => {
    await ask();
    const later = NOW + 31 * 60_000;
    expect(
      (await ask({ email: 'next@example.com' }, false, {}, later)).status,
    ).toBe('pending');
    const [first] = await rows(
      "SELECT status, request FROM bookings WHERE email = 'ada@example.com'",
    );
    expect(first).toEqual({ status: 'expired', request: null });
  });

  it('refuses to run without recorded consent', () => {
    expect(() =>
      bookMeeting(request({}, { consentAt: null }), {
        deps: deps(),
        now: NOW,
        isTest: false,
      }),
    ).toThrow('consent');
  });

  it('answers the honest pending even when the email could not go out, and leaves it to the cron', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    const failing = {
      ...deps(),
      fetch: async (input: RequestInfo | URL, init?: RequestInit) =>
        String(input).includes('resend.test')
          ? new Response('{}', { status: 500 })
          : deps().fetch(input, init),
    };
    const result = await bookMeeting(request(), {
      deps: failing,
      now: NOW,
      isTest: false,
    });
    await settle();
    expect(result.status).toBe('pending');
    expect(await rows('SELECT status, attempts FROM booking_emails')).toEqual([
      { status: 'failed', attempts: 1 },
    ]);
    log.mockRestore();
  });
});

describe('a resend', () => {
  it('waits out the cooldown, then sends a new link that replaces the old one', async () => {
    await ask();
    const first = tokenFor();
    expect(await ask({}, false, {}, NOW + 30_000)).toMatchObject({
      status: 'pending',
      resent: false,
      expiresAt: NOW + 30 * 60_000,
    });
    expect(world.sent).toHaveLength(1);
    expect(await ask({}, false, {}, NOW + 61_000)).toMatchObject({
      status: 'pending',
      resent: true,
      expiresAt: NOW + 30 * 60_000,
    });
    expect(world.sent).toHaveLength(2);
    const second = tokenFor();
    expect(second).not.toBe(first);
    expect(await confirm(first)).toBe('invalid');
    expect(await confirm(second)).toBe('confirmed');
  });

  it('counts against the address cap: three emails a day, requests and resends together, and logs which cap', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    await ask();
    await ask({}, false, {}, NOW + 61_000);
    await ask({ email: 'ADA+again@example.com' }, false, {}, NOW + 122_000);
    expect(await ask({}, false, {}, NOW + 183_000)).toEqual({
      status: 'rejected',
      reason: 'limit',
    });
    expect(world.sent).toHaveLength(3);
    expect(warn).toHaveBeenCalledWith('booking: limit', { cap: 'address' });
    warn.mockRestore();
  });

  it('logs the active-booking cap for a second time from one mailbox', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    await ask();
    expect(
      await ask({
        email: 'ada+other@example.com',
        slot: new Date(TUESDAY_10 + 3_600_000 * 3).toISOString(),
      }),
    ).toEqual({ status: 'rejected', reason: 'limit' });
    expect(warn).toHaveBeenCalledWith('booking: limit', { cap: 'active' });
    warn.mockRestore();
  });
});

describe('a confirm', () => {
  it('inserts bk<id>, writes the lead with the request time and sends the owner and booked emails', async () => {
    await ask();
    const token = tokenFor();
    world.sent = [];
    expect(await confirm(token)).toBe('confirmed');
    const [booking] = await rows('SELECT * FROM bookings');
    expect(booking).toMatchObject({
      status: 'confirmed',
      confirmed_at: LATER,
      request: null,
      hold_expires_at: null,
      meet_url: 'https://meet.google.com/aaa-bbbb-ccc',
    });
    expect(String(booking?.event_id)).toBe(
      `bk${String(booking?.id).replaceAll('-', '')}`,
    );
    const [lead] = await rows('SELECT * FROM leads');
    expect(lead).toMatchObject({
      source: 'booking',
      name: 'Ada Lovelace',
      company: 'Analytical Engines',
      utm_source: 'news',
      consent_version: CONSENT_VERSION,
      consent_at: NOW,
      created_at: LATER,
    });
    expect(booking?.lead_id).toBe(lead?.id);
    expect(JSON.parse(String(lead?.context))).toMatchObject({
      booking: {
        status: 'confirmed',
        channel: 'web',
        origin: ORIGIN,
        requestedAt: NOW,
      },
    });
    expect(world.sent.map((mail) => mail.to).sort()).toEqual([
      'ada@example.com',
      'owner@example.com',
    ]);
    const owner = world.sent.find((mail) => mail.to === 'owner@example.com');
    expect(owner?.text).toMatch(
      /Cancel this booking: https:\/\/zenetlabs\.com\/api\/book\/cancel\?t=[0-9a-f-]{36}\.[\w-]{43}/,
    );
    expect(owner?.text).toContain('Requested: 2027-01-04T08:00:00.000Z');
    expect(owner?.text).toContain('Confirmed: 2027-01-04T08:01:00.000Z');
    const visitor = world.sent.find((mail) => mail.to === 'ada@example.com');
    expect(visitor?.subject).toBe(
      'Booked: 30-minute call with Zenet Labs, Tuesday 12 January, 5:00 pm',
    );
    expect(visitor?.text).not.toContain('Ada Lovelace');
    const [event] = world.events;
    for (const text of ['Ada Lovelace', 'Analytical Engines', 'inbox triage']) {
      expect(JSON.stringify(event?.body)).not.toContain(text);
    }
  });

  it('is idempotent: a second click changes nothing', async () => {
    await ask();
    const token = tokenFor();
    expect(await confirm(token)).toBe('confirmed');
    expect(await confirm(token, LATER + 1000)).toBe('stale');
    expect(world.events).toHaveLength(1);
    expect(await rows('SELECT id FROM leads')).toHaveLength(1);
  });

  it('gives a double click exactly one winner', async () => {
    await ask();
    const token = tokenFor();
    const results = await Promise.all([confirm(token), confirm(token)]);
    expect(results.sort()).toEqual(['confirmed', 'stale']);
    expect(world.events).toHaveLength(1);
  });

  it('creates no event for an expired link', async () => {
    await ask();
    expect(await confirm(tokenFor(), NOW + 31 * 60_000)).toBe('stale');
    expect(world.events).toEqual([]);
  });

  it('answers taken when the slot went in Google meanwhile, and releases the hold', async () => {
    await ask();
    world.busy.set('main-calendar', [
      { start: TUESDAY_10, end: TUESDAY_10 + 1_800_000 },
    ]);
    expect(await confirm(tokenFor())).toBe('taken');
    expect(world.events).toEqual([]);
    expect(await rows('SELECT status, request FROM bookings')).toEqual([
      { status: 'expired', request: null },
    ]);
  });

  it('still confirms when the 12-hour notice has passed since the request', async () => {
    const asked = Date.UTC(2027, 0, 4, 18, 50);
    const slot = Date.UTC(2027, 0, 5, 7, 0);
    expect(
      (await ask({ slot: new Date(slot).toISOString() }, false, {}, asked))
        .status,
    ).toBe('pending');
    expect(await confirm(tokenFor(), asked + 20 * 60_000)).toBe('confirmed');
  });

  it('consumes nothing when the calendar fails before the consume', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    await ask();
    world.freebusyStatus = 503;
    expect(await confirm(tokenFor())).toBe('unavailable');
    expect(await rows('SELECT status, confirmed_at FROM bookings')).toEqual([
      { status: 'held', confirmed_at: null },
    ]);
    world.freebusyStatus = 200;
    expect(await confirm(tokenFor(), LATER + 1000)).toBe('confirmed');
    log.mockRestore();
  });

  it('refuses a wrong or malformed token without saying whether the booking exists', async () => {
    await ask();
    const [id] = tokenFor().split('.');
    expect(await confirm(`${id}.${'A'.repeat(43)}`)).toBe('invalid');
    expect(await confirm('nonsense')).toBe('invalid');
    expect(await confirm(`${crypto.randomUUID()}.${'A'.repeat(43)}`)).toBe(
      'invalid',
    );
  });

  it('keeps the lead, tells only the owner and frees the slot after a failed insert', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    world.insertMode = 'http500';
    await ask();
    const token = tokenFor();
    world.sent = [];
    expect(await confirm(token)).toBe('failed');
    const [booking] = await rows('SELECT status, lead_id FROM bookings');
    expect(booking?.status).toBe('failed');
    expect(world.sent.map((mail) => mail.to)).toEqual(['owner@example.com']);
    expect(world.sent[0]?.text).toContain('Booking: FAILED');
    expect(world.sent[0]?.text).not.toContain('Cancel this booking');
    log.mockRestore();
  });

  it('keeps the slot blocked as unknown when the insert response and the read are both lost', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    world.insertMode = 'timeout-stored';
    world.getStatus = 500;
    await ask();
    const token = tokenFor();
    world.sent = [];
    expect(await confirm(token)).toBe('unknown');
    expect((await rows('SELECT status FROM bookings'))[0]?.status).toBe(
      'unknown',
    );
    expect(world.sent.map((mail) => mail.to)).toEqual(['owner@example.com']);
    expect(world.sent[0]?.subject).toContain('CHECK CALENDAR');
    log.mockRestore();
  });

  it('accepts the booking without a Meet link when only the conference failed', async () => {
    world.insertMode = 'conference-failed';
    expect(await book()).toBe('confirmed');
    const owner = world.sent.find((mail) => mail.to === 'owner@example.com');
    expect(owner?.text).toContain('Meet link: MISSING');
  });

  it('books a test booking on the test calendar only', async () => {
    expect(await book({ name: '[TEST] Acceptance' }, true)).toBe('confirmed');
    expect(world.events.map((event) => event.calendarId)).toEqual([
      'test-calendar',
    ]);
    const [lead] = await rows('SELECT is_test FROM leads');
    expect(lead?.is_test).toBe(1);
  });

  it('records the webmcp and voice channels', async () => {
    expect(
      await book({}, false, { channel: 'webmcp', surface: 'webmcp' }),
    ).toBe('confirmed');
    expect(
      await book(
        {
          email: 'voice@example.com',
          slot: new Date(TUESDAY_10 + 3 * 3_600_000).toISOString(),
        },
        false,
        {
          channel: 'voice',
          surface: 'voice',
          ip: null,
          voice: { sessionId: crypto.randomUUID(), conversationId: 'conv-1' },
        },
      ),
    ).toBe('confirmed');
    expect(await rows('SELECT channel FROM bookings ORDER BY channel')).toEqual(
      [{ channel: 'voice' }, { channel: 'webmcp' }],
    );
    expect(await rows('SELECT source FROM leads ORDER BY source')).toEqual([
      { source: 'booking' },
      { source: 'voice' },
    ]);
  });

  it('still sends the booked email after a contact-form confirmation the same day', async () => {
    await storeLead(
      DB,
      { ...NEW_LEAD, email: 'ada@example.com' },
      NOW - DAY / 2,
    );
    world.sent = [];
    await book();
    expect(
      world.sent.filter(
        (mail) =>
          mail.to === 'ada@example.com' && mail.subject.startsWith('Booked'),
      ),
    ).toHaveLength(1);
  });

  describe('when only the database write fails after the event exists', () => {
    // Fails the Nth and following batch calls, up to `until`; call 1 is the hold, call 2 the verify email's bookkeeping.
    function flaky(from: number, until: number, message = 'D1 down') {
      let batches = 0;
      return new Proxy(DB, {
        get(target, property) {
          if (property === 'batch') {
            return async (...args: Parameters<D1Database['batch']>) => {
              batches += 1;
              if (batches >= from && batches <= until) throw new Error(message);
              return target.batch(...args);
            };
          }
          const value = Reflect.get(target, property);
          return typeof value === 'function' ? value.bind(target) : value;
        },
      });
    }

    async function bookWith(db: D1Database) {
      const scoped = { ...deps(), db };
      await bookMeeting(request(), { deps: scoped, now: NOW, isTest: false });
      await settle();
      const result = await confirmFromLink(tokenFor(), {
        deps: scoped,
        now: LATER,
        retryDelaysMs: [1, 1],
      });
      await settle();
      return result;
    }

    it('answers confirmed at once and writes the lead on a retry', async () => {
      const log = vi.spyOn(console, 'error').mockImplementation(() => {});
      expect(await bookWith(flaky(3, 3))).toBe('confirmed');
      expect(log).toHaveBeenCalledWith('booking: store failed', {
        bookingId: expect.stringMatching(/^[0-9a-f-]{36}$/),
        error: 'Error',
      });
      expect((await rows('SELECT status FROM bookings'))[0]?.status).toBe(
        'confirmed',
      );
      expect(await rows('SELECT source FROM leads')).toEqual([
        { source: 'booking' },
      ]);
      expect(JSON.stringify(log.mock.calls)).not.toContain('ada@example.com');
      log.mockRestore();
    });

    it('gives up after the retries, naming the booking and never the visitor', async () => {
      const log = vi.spyOn(console, 'error').mockImplementation(() => {});
      expect(await bookWith(flaky(3, 99))).toBe('confirmed');
      expect(
        log.mock.calls.filter(
          ([message]) => message === 'booking: store retry failed',
        ),
      ).toHaveLength(2);
      expect(JSON.stringify(log.mock.calls)).not.toMatch(
        /ada@example|Ada Lovelace/,
      );
      log.mockRestore();
    });

    it('does not retry a unique-index conflict', async () => {
      const log = vi.spyOn(console, 'error').mockImplementation(() => {});
      await bookWith(
        flaky(3, 99, 'D1_ERROR: UNIQUE constraint failed: bookings.slot_start'),
      );
      expect(
        log.mock.calls.filter(
          ([message]) => message === 'booking: store retry failed',
        ),
      ).toHaveLength(0);
      log.mockRestore();
    });
  });
});

describe('when Google fails on the request', () => {
  it('reports calendar_error when the token fails, and writes nothing', async () => {
    world.tokenStatus = 400;
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(await ask()).toEqual({
      status: 'unavailable',
      reason: 'calendar_error',
    });
    expect(log).toHaveBeenCalledWith('booking: calendar error', {
      op: 'token',
      code: 'auth_unauthorized_client',
    });
    expect(await rows('SELECT id FROM bookings')).toEqual([]);
    log.mockRestore();
  });

  it('fails closed when free/busy fails', async () => {
    world.freebusyStatus = 503;
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(await ask()).toEqual({
      status: 'unavailable',
      reason: 'calendar_error',
    });
    expect(world.sent).toEqual([]);
    vi.restoreAllMocks();
  });

  it('is not configured without a secret, an invalid one, or a test calendar for test bookings', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    for (const missing of [
      null,
      'not json',
      JSON.stringify({ type: 'service_account' }),
    ]) {
      const result = await bookMeeting(request(), {
        deps: deps({ secret: missing }),
        now: NOW,
        isTest: false,
      });
      expect(result).toEqual({
        status: 'unavailable',
        reason: 'not_configured',
      });
    }
    const bundle = JSON.parse(secret);
    delete bundle.test_calendar_id;
    const noTest = await bookMeeting(request(), {
      deps: deps({ secret: JSON.stringify(bundle) }),
      now: NOW,
      isTest: true,
    });
    expect(noTest).toEqual({ status: 'unavailable', reason: 'not_configured' });
    expect(world.tokenCalls).toBe(0);
    expect(await rows('SELECT id FROM bookings')).toEqual([]);
    log.mockRestore();
  });
});

describe('the booking flag', () => {
  it('answers not_configured, with no Google call and no write, while unpublished', async () => {
    const off = deps({ published: false });
    expect(await availability({ deps: off, now: NOW, isTest: false })).toEqual({
      status: 'unavailable',
      reason: 'not_configured',
    });
    const result = await bookMeeting(request(), {
      deps: off,
      now: NOW,
      isTest: false,
    });
    await settle();
    expect(result).toEqual({ status: 'unavailable', reason: 'not_configured' });
    expect(world.tokenCalls).toBe(0);
    expect(world.freebusyCalls).toEqual([]);
    expect(await rows('SELECT id FROM bookings')).toEqual([]);
  });
});

describe('pageSlots', () => {
  const scope = (overrides = {}) => ({
    deps: deps(overrides),
    now: NOW,
    isTest: false,
  });

  it('returns the slots for the page', async () => {
    const result = await pageSlots(scope(), 2_000);
    expect(result.status).toBe('ok');
    expect(result.status === 'ok' && result.slots.length).toBeGreaterThan(100);
  });

  it('falls back to the contact form instead of throwing when availability rejects', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    const broken = new Proxy(DB, {
      get(target, property) {
        if (property === 'prepare') {
          return () => {
            throw new Error('D1 down');
          };
        }
        const value = Reflect.get(target, property);
        return typeof value === 'function' ? value.bind(target) : value;
      },
    });
    const result = await pageSlots(
      { ...scope(), deps: { ...deps(), db: broken } },
      2_000,
    );
    expect(result).toEqual({ status: 'unavailable' });
    expect(log).toHaveBeenCalledWith('booking: availability failed', {
      error: 'Error',
    });
    log.mockRestore();
  });

  it('gives up at the deadline when Google is slow', async () => {
    world.freebusyHang = true;
    const started = Date.now();
    expect(await pageSlots(scope(), 60)).toEqual({ status: 'unavailable' });
    expect(Date.now() - started).toBeLessThan(1_000);
  });
});

describe('availability', () => {
  it('lists slots inside the rules and hides what is busy or booked', async () => {
    const start = Date.UTC(2027, 0, 12, 9, 0);
    world.busy.set('main-calendar', [{ start, end: start + 1_800_000 }]);
    const result = await availability(
      { deps: deps(), now: NOW, isTest: false },
      {
        from: Date.UTC(2027, 0, 12, 0, 0),
        to: Date.UTC(2027, 0, 13, 0, 0),
      },
    );
    if (result.status !== 'ok') throw new Error('expected slots');
    const starts = result.slots.map((slot) => slot.start);
    expect(starts).not.toContain(start);
    expect(starts).not.toContain(start + 1_800_000);
    expect(starts).not.toContain(start - 1_800_000);
    expect(starts).toContain(start + 3_600_000);
    expect(starts.every((time) => time >= NOW + 12 * 3_600_000)).toBe(true);
  });

  it('caches busy time for the configured TTL, but never for a booking', async () => {
    const scope = (now: number) => ({
      deps: deps({ busyCacheMs: 60_000 }),
      now,
      isTest: false,
    });
    await availability(scope(NOW));
    await availability(scope(NOW + 30_000));
    expect(world.freebusyCalls).toHaveLength(1);
    await availability(scope(NOW + 61_000));
    expect(world.freebusyCalls).toHaveLength(2);
    await bookMeeting(request(), scope(NOW + 62_000));
    await settle();
    expect(world.freebusyCalls).toHaveLength(3);
  });

  it('shares one free/busy call between concurrent requests', async () => {
    const scope = { deps: deps(), now: NOW, isTest: false };
    await Promise.all([
      availability(scope),
      availability(scope),
      availability(scope),
    ]);
    expect(world.freebusyCalls).toHaveLength(1);
  });

  it('remembers a free/busy failure for the failure TTL, for pages and bookings alike', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    world.freebusyStatus = 503;
    const scope = (now: number) => ({
      deps: deps({ failureCacheMs: 45_000 }),
      now,
      isTest: false,
    });
    await availability(scope(NOW));
    expect(await availability(scope(NOW + 30_000))).toMatchObject({
      reason: 'calendar_error',
    });
    expect(await bookMeeting(request(), scope(NOW + 31_000))).toEqual({
      status: 'unavailable',
      reason: 'calendar_error',
    });
    expect(world.freebusyCalls).toHaveLength(1);
    world.freebusyStatus = 200;
    expect((await availability(scope(NOW + 46_000))).status).toBe('ok');
    expect(world.freebusyCalls).toHaveLength(2);
    log.mockRestore();
  });

  it('remembers a token failure too, so a broken Google costs one call', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    world.tokenStatus = 400;
    const scope = (now: number) => ({
      deps: deps({ failureCacheMs: 45_000 }),
      now,
      isTest: false,
    });
    await availability(scope(NOW));
    await availability(scope(NOW + 1000));
    await bookMeeting(request(), scope(NOW + 2000));
    expect(world.tokenCalls).toBe(1);
    log.mockRestore();
  });

  it('ignores a free/busy call that never settled once it is past its window', async () => {
    world.freebusyHang = true;
    const hung = availability({ deps: deps(), now: NOW, isTest: false });
    void hung;
    await vi.waitFor(() => expect(world.freebusyCalls).toHaveLength(1));
    world.freebusyHang = false;
    const next = await availability({
      deps: deps(),
      now: NOW + 11_000,
      isTest: false,
    });
    expect(next.status).toBe('ok');
    expect(world.freebusyCalls).toHaveLength(2);
  });

  it('does not cache when the TTL is zero', async () => {
    await availability({ deps: deps(), now: NOW, isTest: false });
    await availability({ deps: deps(), now: NOW + 1000, isTest: false });
    expect(world.freebusyCalls).toHaveLength(2);
  });

  it('reports not_configured and calendar_error', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(
      await availability({
        deps: deps({ secret: null }),
        now: NOW,
        isTest: false,
      }),
    ).toEqual({
      status: 'unavailable',
      reason: 'not_configured',
    });
    world.freebusyStatus = 500;
    expect(
      await availability({ deps: deps(), now: NOW, isTest: false }),
    ).toEqual({
      status: 'unavailable',
      reason: 'calendar_error',
    });
    log.mockRestore();
  });
});
