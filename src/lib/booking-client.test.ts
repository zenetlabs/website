import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  availabilityOutcome,
  bookingOutcome,
  fetchAvailability,
  submitBooking,
} from '@/lib/booking-client';
import {
  confirmViewOf,
  fetchConfirmation,
  outcomeOf,
} from '@/lib/confirm-view';

const REQUEST = {
  slot: '2026-11-03T09:00:00.000Z',
  name: 'Ada',
  email: 'ada@example.com',
  topic: 'Automate our inbox triage please',
  timeZone: 'Asia/Singapore',
  locale: 'en',
  consent: true,
  turnstileToken: 't',
  website: '',
  attribution: { landing: '/', referrer: '', page: '/book' },
  surface: 'page',
} as const;

afterEach(() => vi.unstubAllGlobals());

describe('bookingOutcome', () => {
  it('reads a pending result', () => {
    expect(
      bookingOutcome({
        ok: true,
        result: {
          status: 'pending',
          start: '2026-11-03T09:00:00.000Z',
          end: '2026-11-03T09:30:00.000Z',
          label: 'Tuesday 3 November, 5:00 pm',
          expiresAt: '2026-11-02T08:30:00.000Z',
          resent: true,
        },
      }),
    ).toEqual({
      kind: 'pending',
      start: Date.UTC(2026, 10, 3, 9),
      end: Date.UTC(2026, 10, 3, 9, 30),
      expiresAt: Date.UTC(2026, 10, 2, 8, 30),
      resent: true,
    });
  });

  it('reads a missing resent flag as false', () => {
    expect(
      bookingOutcome({
        ok: true,
        result: {
          status: 'pending',
          start: '2026-11-03T09:00:00Z',
          end: '2026-11-03T09:30:00Z',
          expiresAt: '2026-11-02T08:30:00Z',
        },
      }),
    ).toMatchObject({ kind: 'pending', resent: false });
  });

  it.each(['invalid_slot', 'slot_taken', 'limit', 'email_not_accepted'])(
    'reads the %s rejection',
    (reason) => {
      expect(
        bookingOutcome({ ok: true, result: { status: 'rejected', reason } }),
      ).toEqual({
        kind: 'rejected',
        reason,
      });
    },
  );

  it.each(['captcha', 'rate', 'invalid'])(
    'reads the %s transport error',
    (error) => {
      expect(bookingOutcome({ ok: false, error })).toEqual({
        kind: 'failed',
        error,
      });
    },
  );

  it.each([
    undefined,
    null,
    'x',
    {},
    { ok: true },
    { ok: true, result: { status: 'unavailable', reason: 'not_configured' } },
    { ok: true, result: { status: 'rejected', reason: 'other' } },
    { ok: true, result: { status: 'pending', start: 'nope', end: 'nope' } },
    {
      ok: true,
      result: {
        status: 'booked',
        start: '2026-11-03T09:00:00Z',
        end: '2026-11-03T09:30:00Z',
      },
    },
    { ok: false, error: 'origin' },
  ])('treats %j as unavailable', (body) => {
    expect(bookingOutcome(body)).toEqual({
      kind: 'failed',
      error: 'unavailable',
    });
  });
});

describe('submitBooking', () => {
  it('posts the request as JSON to the tool endpoint', async () => {
    const send = vi.fn<typeof fetch>(async () =>
      Response.json({
        ok: true,
        result: { status: 'rejected', reason: 'limit' },
      }),
    );
    vi.stubGlobal('fetch', send);
    await expect(submitBooking(REQUEST)).resolves.toEqual({
      kind: 'rejected',
      reason: 'limit',
      envelope: { ok: true, result: { status: 'rejected', reason: 'limit' } },
    });
    const [url, init] = send.mock.calls[0] ?? [];
    expect(url).toBe('/api/tools/book_meeting');
    expect(init).toMatchObject({ method: 'POST' });
    expect(JSON.parse(String(init?.body))).toMatchObject({
      consent: true,
      website: '',
    });
  });

  it('maps a 429 to rate and a thrown fetch to unavailable', async () => {
    vi.stubGlobal('fetch', async () => new Response('', { status: 429 }));
    await expect(submitBooking(REQUEST)).resolves.toEqual({
      kind: 'failed',
      error: 'rate',
      envelope: { ok: false, error: 'rate' },
    });
    vi.stubGlobal('fetch', async () => {
      throw new TypeError('offline');
    });
    await expect(submitBooking(REQUEST)).resolves.toMatchObject({
      kind: 'failed',
      error: 'unavailable',
    });
  });
});

describe('availability', () => {
  it('maps the endpoint answer and drops malformed slots', () => {
    expect(
      availabilityOutcome({
        status: 'ok',
        slots: [{ start: 1, end: 2 }, { start: 'x', end: 2 }, null],
      }),
    ).toEqual({ status: 'ok', slots: [{ start: 1, end: 2 }] });
  });

  it('treats anything but ok as unavailable', () => {
    expect(availabilityOutcome({ status: 'unavailable' })).toEqual({
      status: 'unavailable',
    });
    expect(availabilityOutcome(undefined)).toEqual({ status: 'unavailable' });
    expect(availabilityOutcome('x')).toEqual({ status: 'unavailable' });
  });

  it('refreshes with exactly one request', async () => {
    const send = vi.fn<typeof fetch>(async () =>
      Response.json({
        status: 'ok',
        slots: [
          { start: 1, end: 2 },
          { start: 3, end: 4 },
        ],
      }),
    );
    vi.stubGlobal('fetch', send);
    await expect(fetchAvailability()).resolves.toEqual({
      status: 'ok',
      slots: [
        { start: 1, end: 2 },
        { start: 3, end: 4 },
      ],
    });
    expect(send).toHaveBeenCalledTimes(1);
    expect(send.mock.calls[0]?.[0]).toBe('/api/book/slots');
  });

  it('is unavailable on a bad body or a network error', async () => {
    vi.stubGlobal('fetch', async () => new Response('<html>', { status: 502 }));
    await expect(fetchAvailability()).resolves.toEqual({
      status: 'unavailable',
    });
    vi.stubGlobal('fetch', async () => {
      throw new TypeError('offline');
    });
    await expect(fetchAvailability()).resolves.toEqual({
      status: 'unavailable',
    });
  });
});

describe('confirmViewOf', () => {
  const VIEW = {
    state: 'pending',
    start: 1,
    end: 2,
    timeZone: 'Asia/Singapore',
    masked: 'a•••@example.com',
    expiresAt: 3,
    method: 'booking',
  };

  it('reads a view and its states', () => {
    expect(confirmViewOf(VIEW)).toEqual(VIEW);
    expect(
      confirmViewOf({ ...VIEW, state: 'confirmed', timeZone: null }),
    ).toMatchObject({
      state: 'confirmed',
      timeZone: null,
    });
  });

  it.each([
    undefined,
    { state: 'invalid' },
    { ...VIEW, state: 'booked' },
    { ...VIEW, method: 'form' },
    { ...VIEW, start: 'x' },
    { ...VIEW, name: 'Ada' },
  ])('treats %j as invalid or drops what it does not know', (body) => {
    const view = confirmViewOf(body);
    expect(JSON.stringify(view)).not.toContain('Ada');
  });

  it('asks the endpoint with the token and only a known outcome', async () => {
    const send = vi.fn<typeof fetch>(async () => Response.json(VIEW));
    vi.stubGlobal('fetch', send);
    await expect(fetchConfirmation('id.secret', 'taken')).resolves.toEqual(
      VIEW,
    );
    expect(String(send.mock.calls[0]?.[0])).toBe(
      '/api/book/confirm?confirm=id.secret&outcome=taken',
    );
    expect(outcomeOf('nope')).toBeNull();
  });
});
