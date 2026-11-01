import { env } from 'cloudflare:workers';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  availability,
  type BookRequest,
  bookMeeting,
  clearBusyCache,
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
const TUESDAY_10 = Date.UTC(2027, 0, 12, 9, 0);

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
    consentAt: NOW,
    attribution: { landing: '/?utm_source=news', referrer: '', page: '/book' },
    chatSessionId: null,
    ...rest,
  };
}

async function book(
  overrides: Partial<BookingInput> = {},
  isTest = false,
  rest: Partial<BookRequest> = {},
) {
  const result = await bookMeeting(request(overrides, rest), {
    deps: deps(),
    now: NOW,
    isTest,
  });
  await settle();
  return result;
}

async function rows(sql: string): Promise<Record<string, unknown>[]> {
  return (await DB.prepare(sql).all()).results;
}

beforeEach(async () => {
  world = newWorld();
  background = [];
  clearTokenCache();
  clearBusyCache();
  secret = JSON.stringify((await signingCredentials()).credentials);
  await DB.prepare('DELETE FROM bookings').run();
  await DB.prepare('DELETE FROM leads').run();
});

describe('bookMeeting', () => {
  it('confirms the booking, stores a booking lead and sends both emails', async () => {
    const result = await book();
    expect(result).toEqual({
      status: 'booked',
      start: TUESDAY_10,
      end: TUESDAY_10 + 1_800_000,
      meetUrl: 'https://meet.google.com/aaa-bbbb-ccc',
    });
    const [booking] = await rows('SELECT * FROM bookings');
    expect(booking).toMatchObject({
      status: 'confirmed',
      slot_start: TUESDAY_10,
      day: '2027-01-12',
      channel: 'web',
      time_zone: 'Asia/Singapore',
      meet_url: 'https://meet.google.com/aaa-bbbb-ccc',
      is_test: 0,
    });
    expect(String(booking?.event_id)).toMatch(/^bk[0-9a-f]{32}$/);

    const [lead] = await rows('SELECT * FROM leads');
    expect(lead).toMatchObject({
      source: 'booking',
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      message: 'We want to automate our inbox triage and invoicing.',
      utm_source: 'news',
      submit_page: '/book',
      consent_version: CONSENT_VERSION,
      is_test: 0,
    });
    expect(booking?.lead_id).toBe(lead?.id);
    expect(JSON.parse(String(lead?.context))).toMatchObject({
      booking: {
        status: 'confirmed',
        channel: 'web',
        calendar: 'main',
        timeZone: 'Asia/Singapore',
      },
    });

    expect(world.sent.map((mail) => mail.to).sort()).toEqual([
      'ada@example.com',
      'owner@example.com',
    ]);
    const confirmation = world.sent.find(
      (mail) => mail.to === 'ada@example.com',
    );
    expect(confirmation?.subject).toBe(
      'Booked: 30-minute call with Zenet Labs, Tuesday 12 January, 5:00 pm',
    );
    expect(confirmation?.text).toContain(
      'https://meet.google.com/aaa-bbbb-ccc',
    );
    expect(confirmation?.text).not.toContain('Ada Lovelace');
    expect(confirmation?.text).not.toContain('Analytical Engines');
    expect(confirmation?.text).not.toContain('inbox triage');
    expect(
      world.sent.find((mail) => mail.to === 'owner@example.com')?.subject,
    ).toBe('[Lead EN] Ada Lovelace — Analytical Engines — booking');
    expect(background.length).toBeGreaterThan(0);
  });

  it('puts no name, company or topic in the Google event', async () => {
    await book();
    const [event] = world.events;
    expect(event?.calendarId).toBe('main-calendar');
    const sent = JSON.stringify(event?.body);
    for (const text of ['Ada Lovelace', 'Analytical Engines', 'inbox triage']) {
      expect(sent).not.toContain(text);
    }
    expect(event?.body.attendees).toEqual([{ email: 'ada@example.com' }]);
  });

  it('still sends the confirmation after a contact-form confirmation the same day', async () => {
    await storeLead(
      DB,
      { ...NEW_LEAD, email: 'ada@example.com' },
      NOW - DAY / 2,
    );
    await book();
    expect(
      world.sent.filter((mail) => mail.to === 'ada@example.com'),
    ).toHaveLength(1);
    const kinds = await rows(
      "SELECT o.kind FROM email_outbox o JOIN leads l ON l.id = o.lead_id WHERE l.source = 'booking' ORDER BY o.kind",
    );
    expect(kinds).toEqual([{ kind: 'confirmation' }, { kind: 'owner' }]);
  });

  it.each([
    ['off the grid', Date.UTC(2027, 0, 12, 9, 10)],
    ['under 12 hours away', NOW + 11 * 3_600_000],
    ['on a weekend', Date.UTC(2027, 0, 16, 9, 0)],
  ])(
    'rejects a slot %s without touching the calendar or the database',
    async (_label, start) => {
      const result = await book({ slot: new Date(start).toISOString() });
      expect(result).toEqual({ status: 'rejected', reason: 'invalid_slot' });
      expect(world.events).toEqual([]);
      expect(await rows('SELECT id FROM bookings')).toEqual([]);
      expect(await rows('SELECT id FROM leads')).toEqual([]);
    },
  );

  it('rejects a busy slot as taken', async () => {
    world.busy.set('main-calendar', [
      { start: TUESDAY_10, end: TUESDAY_10 + 1_800_000 },
    ]);
    expect(await book()).toEqual({ status: 'rejected', reason: 'slot_taken' });
    expect(world.events).toEqual([]);
  });

  it('applies the one-per-address-per-day limit', async () => {
    expect((await book()).status).toBe('booked');
    const second = await book({
      slot: new Date(Date.UTC(2027, 0, 13, 9, 0)).toISOString(),
    });
    expect(second).toEqual({ status: 'rejected', reason: 'limit' });
    expect(world.events).toHaveLength(1);
  });

  it('lets only one of two parallel bookings for a slot through', async () => {
    const results = await Promise.all([
      bookMeeting(request({ email: 'a@example.com' }), {
        deps: deps(),
        now: NOW,
        isTest: false,
      }),
      bookMeeting(request({ email: 'b@example.com' }), {
        deps: deps(),
        now: NOW,
        isTest: false,
      }),
    ]);
    await settle();
    expect(results.map((result) => result.status).sort()).toEqual([
      'booked',
      'rejected',
    ]);
    expect(results.find((result) => result.status === 'rejected')).toEqual({
      status: 'rejected',
      reason: 'slot_taken',
    });
    expect(world.events).toHaveLength(1);
  });

  it('stops after three bookings in one owner day', async () => {
    const hours = [8, 11, 14];
    for (const [index, hour] of hours.entries()) {
      const result = await book({
        email: `p${index}@example.com`,
        slot: new Date(Date.UTC(2027, 0, 12, hour, 0)).toISOString(),
      });
      expect(result.status, `booking ${index}`).toBe('booked');
    }
    const fourth = await book({
      email: 'p3@example.com',
      slot: new Date(Date.UTC(2027, 0, 12, 15, 0)).toISOString(),
    });
    expect(fourth).toEqual({ status: 'rejected', reason: 'day_full' });
  });

  describe('when Google fails', () => {
    it('keeps the lead, tells only the owner and frees the slot after a failed insert', async () => {
      world.insertMode = 'http500';
      const result = await book();
      expect(result).toEqual({
        status: 'unavailable',
        reason: 'calendar_error',
      });
      const [booking] = await rows('SELECT status, lead_id FROM bookings');
      expect(booking?.status).toBe('failed');
      const [lead] = await rows('SELECT id, context FROM leads');
      expect(booking?.lead_id).toBe(lead?.id);
      expect(JSON.parse(String(lead?.context))).toMatchObject({
        booking: { status: 'failed', meetUrl: null },
      });
      expect(world.sent.map((mail) => mail.to)).toEqual(['owner@example.com']);
      expect(world.sent[0]?.subject).toBe(
        '[Lead EN] Ada Lovelace — Analytical Engines — booking FAILED',
      );
      expect(world.sent[0]?.text).toContain('Booking: FAILED');
      world.insertMode = 'ok';
      expect((await book({ email: 'next@example.com' })).status).toBe('booked');
    });

    it('treats an insert that timed out but landed as booked', async () => {
      world.insertMode = 'timeout-stored';
      expect((await book()).status).toBe('booked');
      expect(world.events).toHaveLength(1);
    });

    it('treats an insert that timed out and never landed as a failure', async () => {
      world.insertMode = 'timeout-lost';
      expect(await book()).toEqual({
        status: 'unavailable',
        reason: 'calendar_error',
      });
    });

    it('fills the Meet link from a second read when the conference is pending', async () => {
      world.insertMode = 'pending';
      const result = await book();
      expect(result).toMatchObject({
        status: 'booked',
        meetUrl: 'https://meet.google.com/aaa-bbbb-ccc',
      });
    });

    it('reports calendar_error when the token fails, and writes nothing', async () => {
      world.tokenStatus = 400;
      const log = vi.spyOn(console, 'error').mockImplementation(() => {});
      expect(await book()).toEqual({
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
      expect(await book()).toEqual({
        status: 'unavailable',
        reason: 'calendar_error',
      });
      expect(world.events).toEqual([]);
    });
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

  it('books a test booking on the test calendar only', async () => {
    const result = await book({ name: '[TEST] Acceptance' }, true);
    expect(result.status).toBe('booked');
    expect(world.events.map((event) => event.calendarId)).toEqual([
      'test-calendar',
    ]);
    expect(world.freebusyCalls).toEqual(['test-calendar']);
    const [lead] = await rows('SELECT is_test, context FROM leads');
    expect(lead?.is_test).toBe(1);
    expect(JSON.parse(String(lead?.context))).toMatchObject({
      booking: { calendar: 'test' },
    });
    expect(await rows('SELECT is_test FROM bookings')).toEqual([
      { is_test: 1 },
    ]);
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

  describe('when only the database write fails after the event exists', () => {
    // Fails the Nth and following batch calls, up to `until`; call 1 is the hold.
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
      const result = await bookMeeting(request(), {
        deps: { ...deps(), db },
        now: NOW,
        isTest: false,
        retryDelaysMs: [1, 1],
      });
      await settle();
      return result;
    }

    it('answers booked at once and writes the lead and the confirmation on a retry', async () => {
      const log = vi.spyOn(console, 'error').mockImplementation(() => {});
      const result = await bookWith(flaky(2, 2));
      expect(result.status).toBe('booked');
      expect(world.events).toHaveLength(1);
      expect(log).toHaveBeenCalledWith('booking: store failed', {
        bookingId: expect.stringMatching(/^[0-9a-f-]{36}$/),
        error: 'Error',
      });
      const [booking] = await rows('SELECT status, lead_id FROM bookings');
      expect(booking?.status).toBe('confirmed');
      expect(await rows('SELECT source FROM leads')).toEqual([
        { source: 'booking' },
      ]);
      expect(world.sent.map((mail) => mail.to).sort()).toEqual([
        'ada@example.com',
        'owner@example.com',
      ]);
      expect(JSON.stringify(log.mock.calls)).not.toContain('ada@example.com');
      log.mockRestore();
    });

    it('gives up after the retries, naming the booking and never the visitor', async () => {
      const log = vi.spyOn(console, 'error').mockImplementation(() => {});
      expect((await bookWith(flaky(2, 99))).status).toBe('booked');
      expect(
        log.mock.calls.filter(
          ([message]) => message === 'booking: store retry failed',
        ),
      ).toHaveLength(2);
      expect(await rows('SELECT id FROM leads')).toEqual([]);
      expect(JSON.stringify(log.mock.calls)).not.toMatch(
        /ada@example|Ada Lovelace/,
      );
      log.mockRestore();
    });

    it('does not retry a unique-index conflict', async () => {
      const log = vi.spyOn(console, 'error').mockImplementation(() => {});
      await bookWith(
        flaky(2, 99, 'D1_ERROR: UNIQUE constraint failed: bookings.slot_start'),
      );
      expect(
        log.mock.calls.filter(
          ([message]) => message === 'booking: store retry failed',
        ),
      ).toHaveLength(0);
      log.mockRestore();
    });
  });

  it('accepts the booking without a Meet link when only the conference failed', async () => {
    world.insertMode = 'conference-failed';
    const result = await book();
    expect(result).toMatchObject({ status: 'booked', meetUrl: null });
    expect((await rows('SELECT status, meet_url FROM bookings'))[0]).toEqual({
      status: 'confirmed',
      meet_url: null,
    });
    const owner = world.sent.find((mail) => mail.to === 'owner@example.com');
    expect(owner?.text).toContain('Meet link: MISSING');
    const visitor = world.sent.find((mail) => mail.to === 'ada@example.com');
    expect(visitor?.text).toContain(
      'the link comes with the calendar invitation',
    );
  });

  describe('when the insert response was lost and the read fails too', () => {
    beforeEach(() => {
      world.insertMode = 'timeout-stored';
      world.getStatus = 500;
    });

    it('keeps the slot blocked as unknown and tells the owner to check the calendar', async () => {
      const log = vi.spyOn(console, 'error').mockImplementation(() => {});
      expect(await book()).toEqual({
        status: 'unavailable',
        reason: 'calendar_error',
      });
      const [booking] = await rows('SELECT status, lead_id FROM bookings');
      expect(booking?.status).toBe('unknown');
      expect(booking?.lead_id).toBeTruthy();
      expect(world.sent.map((mail) => mail.to)).toEqual(['owner@example.com']);
      const [mail] = world.sent;
      expect(mail?.subject).toBe(
        '[Lead EN] Ada Lovelace — Analytical Engines — booking CHECK CALENDAR',
      );
      expect(mail?.text).toContain('may have been created, check the calendar');
      expect(mail?.text).not.toContain('Nothing was created');
      world.getStatus = 200;
      world.insertMode = 'ok';
      expect(await book({ email: 'next@example.com' })).toEqual({
        status: 'rejected',
        reason: 'slot_taken',
      });
      const listed = await availability(
        { deps: deps(), now: NOW, isTest: false },
        { from: TUESDAY_10, to: TUESDAY_10 + 1 },
      );
      expect(listed).toEqual({ status: 'ok', slots: [] });
      log.mockRestore();
    });
  });

  it('frees the slot and says nothing was created only when the insert definitely failed', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    world.insertMode = 'timeout-lost';
    expect(await book()).toEqual({
      status: 'unavailable',
      reason: 'calendar_error',
    });
    expect((await rows('SELECT status FROM bookings'))[0]).toEqual({
      status: 'failed',
    });
    expect(world.sent[0]?.text).toContain('Nothing was created');
    world.insertMode = 'ok';
    expect((await book({ email: 'next@example.com' })).status).toBe('booked');
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
