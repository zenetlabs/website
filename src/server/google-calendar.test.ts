import { describe, expect, it, vi } from 'vitest';
import {
  type CalendarAccess,
  createEvent,
  eventIdFor,
  freeBusy,
  type NewEvent,
} from '@/server/google-calendar';

const CALENDAR_URL = 'https://calendar.test/v3';
const BOOKING_ID = '313caabc-35f8-4659-a70b-62dcc40a43e0';
const EVENT_ID = 'bk313caabc35f84659a70b62dcc40a43e0';
const START = Date.UTC(2026, 10, 3, 9);

const EVENT: NewEvent = {
  bookingId: BOOKING_ID,
  start: START,
  end: START + 1_800_000,
  zone: 'Europe/Madrid',
  email: 'ada@example.com',
  locale: 'en',
};

type Handler = (
  url: string,
  init: RequestInit | undefined,
) => Response | Promise<Response>;

function access(handler: Handler): {
  access: CalendarAccess;
  calls: Array<[string, RequestInit | undefined]>;
} {
  const calls: Array<[string, RequestInit | undefined]> = [];
  return {
    calls,
    access: {
      calendarUrl: CALENDAR_URL,
      token: 'tok',
      fetch: async (input, init) => {
        const url = String(input);
        calls.push([url, init]);
        return handler(url, init);
      },
    },
  };
}

const created = (extra: object = {}) =>
  Response.json({
    id: EVENT_ID,
    htmlLink: 'https://calendar.google.com/event?eid=x',
    hangoutLink: 'https://meet.google.com/abc-defg-hij',
    ...extra,
  });

const noWait = async () => {};

describe('freeBusy', () => {
  it('posts the window and parses busy intervals', async () => {
    const { access: a, calls } = access(() =>
      Response.json({
        calendars: {
          main: {
            busy: [
              {
                start: '2026-11-03T09:00:00Z',
                end: '2026-11-03T09:30:00+00:00',
              },
            ],
          },
        },
      }),
    );
    await expect(
      freeBusy(a, 'main', START, START + 86_400_000),
    ).resolves.toEqual({
      ok: true,
      value: [{ start: START, end: START + 1_800_000 }],
    });
    const [url, init] = calls[0] ?? ['', undefined];
    expect(url).toBe(`${CALENDAR_URL}/freeBusy`);
    expect(new Headers(init?.headers).get('authorization')).toBe('Bearer tok');
    expect(JSON.parse(String(init?.body))).toEqual({
      timeMin: '2026-11-03T09:00:00.000Z',
      timeMax: '2026-11-04T09:00:00.000Z',
      items: [{ id: 'main' }],
    });
  });

  it('fails closed on calendar errors, bad status, bad shape and network faults', async () => {
    const run = (handler: Handler) =>
      freeBusy(access(handler).access, 'main', 0, 1);
    await expect(
      run(() =>
        Response.json({
          calendars: { main: { errors: [{ reason: 'notFound' }] } },
        }),
      ),
    ).resolves.toEqual({ ok: false, code: 'freebusy_notFound' });
    await expect(
      run(() => new Response('x', { status: 503 })),
    ).resolves.toEqual({
      ok: false,
      code: 'freebusy_http_503',
    });
    await expect(run(() => Response.json({ calendars: {} }))).resolves.toEqual({
      ok: false,
      code: 'freebusy_response',
    });
    await expect(
      run(() => {
        throw new TypeError('offline');
      }),
    ).resolves.toEqual({ ok: false, code: 'network' });
    await expect(
      run(() => {
        throw new DOMException('slow', 'TimeoutError');
      }),
    ).resolves.toEqual({ ok: false, code: 'timeout' });
  });
});

describe('createEvent', () => {
  it('inserts with Meet, invitations and a deterministic id, and puts no visitor text in it', async () => {
    const { access: a, calls } = access(() => created());
    const result = await createEvent(a, 'main/cal', EVENT, noWait);
    expect(result).toEqual({
      ok: true,
      value: {
        eventId: EVENT_ID,
        htmlLink: 'https://calendar.google.com/event?eid=x',
        meetUrl: 'https://meet.google.com/abc-defg-hij',
        conference: 'ready',
      },
    });
    const [url, init] = calls[0] ?? ['', undefined];
    expect(url).toBe(
      `${CALENDAR_URL}/calendars/main%2Fcal/events?conferenceDataVersion=1&sendUpdates=all`,
    );
    const body = JSON.parse(String(init?.body));
    expect(body).toMatchObject({
      id: EVENT_ID,
      summary: 'Zenet Labs · 30-minute call',
      attendees: [{ email: 'ada@example.com' }],
      conferenceData: {
        createRequest: {
          requestId: BOOKING_ID,
          conferenceSolutionKey: { type: 'hangoutsMeet' },
        },
      },
      guestsCanInviteOthers: false,
      guestsCanModify: false,
      guestsCanSeeOtherGuests: false,
      extendedProperties: { private: { zenetBookingId: BOOKING_ID } },
    });
    expect(body.attendees[0]).not.toHaveProperty('displayName');
    expect(eventIdFor(BOOKING_ID)).toBe(EVENT_ID);
    expect(EVENT_ID).toMatch(/^[0-9a-v]{5,1024}$/);
  });

  it('writes the Spanish summary for Spanish bookings', async () => {
    const { access: a, calls } = access(() => created());
    await createEvent(a, 'main', { ...EVENT, locale: 'es' }, noWait);
    expect(JSON.parse(String(calls[0]?.[1]?.body)).summary).toBe(
      'Zenet Labs · llamada de 30 minutos',
    );
  });

  it('falls back to the video entry point when there is no hangoutLink', async () => {
    const { access: a } = access(() =>
      Response.json({
        id: EVENT_ID,
        conferenceData: {
          entryPoints: [
            { entryPointType: 'video', uri: 'https://meet.google.com/zzz' },
          ],
        },
      }),
    );
    const result = await createEvent(a, 'main', EVENT, noWait);
    expect(result).toMatchObject({
      ok: true,
      value: { meetUrl: 'https://meet.google.com/zzz' },
    });
  });

  it('ignores a non-https conference link', async () => {
    const { access: a } = access(() =>
      created({ hangoutLink: 'javascript:alert(1)' }),
    );
    const result = await createEvent(a, 'main', EVENT, vi.fn(noWait));
    expect(result).toMatchObject({ ok: true, value: { meetUrl: null } });
  });

  it('waits once and reads the event again while the conference is pending', async () => {
    const wait = vi.fn(noWait);
    let reads = 0;
    const { access: a, calls } = access((_url, init) => {
      if (init?.method === 'POST') {
        return Response.json({
          id: EVENT_ID,
          conferenceData: {
            createRequest: { status: { statusCode: 'pending' } },
          },
        });
      }
      reads += 1;
      return created();
    });
    const result = await createEvent(a, 'main', EVENT, wait);
    expect(result).toMatchObject({
      ok: true,
      value: { meetUrl: 'https://meet.google.com/abc-defg-hij' },
    });
    expect(wait).toHaveBeenCalledWith(1000);
    expect(reads).toBe(1);
    expect(calls).toHaveLength(2);
  });

  it('keeps the booking, without a link, when the conference is still pending', async () => {
    const pending = () =>
      Response.json({
        id: EVENT_ID,
        conferenceData: {
          createRequest: { status: { statusCode: 'pending' } },
        },
      });
    const result = await createEvent(
      access(pending).access,
      'main',
      EVENT,
      noWait,
    );
    expect(result).toMatchObject({
      ok: true,
      value: { meetUrl: null, conference: 'pending' },
    });
  });

  it('keeps the booking, without a link, when only the Meet request failed', async () => {
    const failed = () =>
      Response.json({
        id: EVENT_ID,
        htmlLink: 'https://calendar.google.com/event?eid=x',
        conferenceData: {
          createRequest: { status: { statusCode: 'failure' } },
        },
      });
    await expect(
      createEvent(access(failed).access, 'main', EVENT, noWait),
    ).resolves.toMatchObject({
      ok: true,
      value: { conference: 'failed', meetUrl: null },
    });
  });

  it('returns the existing event after a 409', async () => {
    const { access: a } = access((_url, init) =>
      init?.method === 'POST'
        ? Response.json({ error: { code: 409 } }, { status: 409 })
        : created(),
    );
    await expect(createEvent(a, 'main', EVENT, noWait)).resolves.toMatchObject({
      ok: true,
    });
  });

  it.each([
    [
      'a timeout',
      () => {
        throw new DOMException('slow', 'TimeoutError');
      },
    ],
    [
      'a network error',
      () => {
        throw new TypeError('offline');
      },
    ],
    ['a 502', () => new Response('x', { status: 502 })],
  ])(
    'recovers a lost response after %s when the event exists',
    async (_label, failing) => {
      const { access: a, calls } = access((_url, init) =>
        init?.method === 'POST' ? failing() : created(),
      );
      await expect(
        createEvent(a, 'main', EVENT, noWait),
      ).resolves.toMatchObject({ ok: true });
      expect(calls).toHaveLength(2);
    },
  );

  it('fails cleanly when the lost insert left no event', async () => {
    const { access: a } = access((_url, init) =>
      init?.method === 'POST'
        ? new Response('x', { status: 500 })
        : new Response('{}', { status: 404 }),
    );
    await expect(createEvent(a, 'main', EVENT, noWait)).resolves.toEqual({
      ok: false,
      code: 'insert_http_500',
      unknown: false,
    });
  });

  it('flags the outcome unknown when the insert was lost and the read failed too', async () => {
    const { access: a } = access((_url, init) =>
      init?.method === 'POST'
        ? new Response('x', { status: 502 })
        : new Response('x', { status: 500 }),
    );
    await expect(createEvent(a, 'main', EVENT, noWait)).resolves.toEqual({
      ok: false,
      code: 'insert_http_502',
      unknown: true,
    });
    const timeouts = access((_url, init) => {
      if (init?.method === 'POST') {
        throw new DOMException('slow', 'TimeoutError');
      }
      throw new TypeError('offline');
    });
    await expect(
      createEvent(timeouts.access, 'main', EVENT, noWait),
    ).resolves.toEqual({ ok: false, code: 'timeout', unknown: true });
  });

  it('names the delegation problem for service accounts', async () => {
    const forbidden = () =>
      Response.json(
        {
          error: {
            code: 403,
            message: 'Service accounts cannot invite attendees',
            errors: [{ reason: 'forbiddenForServiceAccounts' }],
          },
        },
        { status: 403 },
      );
    await expect(
      createEvent(access(forbidden).access, 'main', EVENT, noWait),
    ).resolves.toEqual({
      ok: false,
      code: 'dwd',
      unknown: false,
    });
  });

  it('names an invalid conference type and other client errors', async () => {
    const conference = () =>
      Response.json(
        { error: { message: 'Invalid conference type value.' } },
        { status: 400 },
      );
    await expect(
      createEvent(access(conference).access, 'main', EVENT, noWait),
    ).resolves.toEqual({
      ok: false,
      code: 'conference',
      unknown: false,
    });
    const denied = () =>
      Response.json({ error: { message: 'no' } }, { status: 403 });
    await expect(
      createEvent(access(denied).access, 'main', EVENT, noWait),
    ).resolves.toEqual({
      ok: false,
      code: 'insert_403',
      unknown: false,
    });
  });
});
