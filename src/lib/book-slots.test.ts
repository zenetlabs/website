import { afterEach, describe, expect, it, vi } from 'vitest';
import { bookAvailabilityOf, fetchBookAvailability } from '@/lib/book-slots';

const CALENDAR = {
  now: 1,
  from: 2,
  to: 3,
  weekdays: [1, 2, 3, 4],
  days: [
    {
      start: 10,
      end: 20,
      holidays: [{ region: 'SG', name: { en: 'Deepavali', es: 'Deepavali' } }],
    },
  ],
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('bookAvailabilityOf', () => {
  it('reads the slots and the calendar', () => {
    expect(
      bookAvailabilityOf({
        status: 'ok',
        slots: [{ start: 10, end: 11 }, { start: 'x' }],
        calendar: CALENDAR,
      }),
    ).toEqual({
      status: 'ok',
      slots: [{ start: 10, end: 11 }],
      calendar: CALENDAR,
    });
  });

  it.each([
    ['no calendar', { status: 'ok', slots: [] }],
    ['a broken day', { ...CALENDAR, days: [{ start: 1 }] }],
    [
      'an unknown region',
      {
        ...CALENDAR,
        days: [
          { start: 1, end: 2, holidays: [{ region: 'US', name: CALENDAR }] },
        ],
      },
    ],
    ['a missing horizon', { ...CALENDAR, to: '3' }],
    ['no open weekdays', { ...CALENDAR, weekdays: undefined }],
  ])('is unavailable with %s', (_label, calendar) => {
    expect(bookAvailabilityOf({ status: 'ok', slots: [], calendar })).toEqual({
      status: 'unavailable',
    });
  });

  it('passes on an unavailable answer', () => {
    expect(bookAvailabilityOf({ status: 'unavailable' })).toEqual({
      status: 'unavailable',
    });
    expect(bookAvailabilityOf(null)).toEqual({ status: 'unavailable' });
  });
});

describe('fetchBookAvailability', () => {
  it('asks the page endpoint once and reads the answer', async () => {
    const send = vi.fn(async () =>
      Response.json({ status: 'ok', slots: [], calendar: CALENDAR }),
    );
    vi.stubGlobal('fetch', send);
    expect(await fetchBookAvailability()).toMatchObject({ status: 'ok' });
    expect(send).toHaveBeenCalledWith('/api/book/slots', {
      headers: { Accept: 'application/json' },
    });
  });

  it('is unavailable on an error status or a network failure', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('', { status: 429 })),
    );
    expect(await fetchBookAvailability()).toEqual({ status: 'unavailable' });
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new TypeError('offline');
      }),
    );
    expect(await fetchBookAvailability()).toEqual({ status: 'unavailable' });
  });
});
