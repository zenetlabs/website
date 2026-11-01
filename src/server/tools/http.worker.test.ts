import { env } from 'cloudflare:workers';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { clearBusyCache } from '@/server/booking';
import { clearTokenCache } from '@/server/google-auth';
import { assistantLive, getHealth } from '@/server/health';
import {
  handleToolRequest,
  manifestResponse,
  type ToolHttpDeps,
} from '@/server/tools/http';
import {
  bookingDeps,
  newWorld,
  signingCredentials,
  TEST_SITE,
  type World,
} from '../../../test/google';

const { DB } = env;
const ORIGIN = 'https://zenetlabs.com';
const NOW = Date.UTC(2027, 0, 4, 8, 0);
const BEARER = 'bearer-secret-value';

const BOOKING = {
  slot: '2027-01-12T09:00:00.000Z',
  name: 'Ada Lovelace',
  email: 'ada@example.com',
  topic: 'We want to automate our inbox triage.',
  timeZone: 'Asia/Singapore',
  locale: 'en',
};
const BROWSER = {
  ...BOOKING,
  consent: true,
  turnstileToken: 'token',
  website: '',
  attribution: {
    landing: '/book?utm_source=news&gclid=g1',
    referrer: '',
    page: '/book',
  },
};

const BODY = z.object({
  ok: z.boolean(),
  error: z.string().optional(),
  result: z.unknown().optional(),
  issues: z
    .array(z.object({ path: z.string(), message: z.string() }))
    .optional(),
});

let world: World;
let background: Promise<unknown>[];
let secret: string;
let limiter: { tools: boolean; book: boolean };
let bearer: string | null;
let turnstileSecret: () => Promise<string>;

function deps(overrides: Partial<ToolHttpDeps> = {}): ToolHttpDeps {
  return {
    ...bookingDeps(DB, world, secret, background),
    bearerSecret: async () => bearer,
    turnstileSecret,
    toolsLimiter: { limit: async () => ({ success: !limiter.tools }) },
    bookLimiter: { limit: async () => ({ success: !limiter.book }) },
    now: () => NOW,
    ...overrides,
  };
}

function post(
  name: string,
  body: unknown,
  headers: Record<string, string> = {},
  url = `${ORIGIN}/api/tools/${name}`,
  overrides: Partial<ToolHttpDeps> = {},
): Promise<Response> {
  const request = new Request(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'CF-Connecting-IP': '203.0.113.7',
      ...headers,
    },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
  return handleToolRequest(request, name, deps(overrides));
}

const browser = (
  body: unknown = BROWSER,
  headers: Record<string, string> = {},
) => post('book_meeting', body, { Origin: ORIGIN, ...headers });

async function json(response: Response) {
  return BODY.parse(await response.json());
}

async function count(table: string): Promise<number> {
  const row = await DB.prepare(`SELECT count(*) AS n FROM ${table}`).first<{
    n: number;
  }>();
  return row?.n ?? -1;
}

beforeEach(async () => {
  world = newWorld();
  background = [];
  limiter = { tools: false, book: false };
  bearer = BEARER;
  turnstileSecret = async () => 'ts-secret';
  secret = JSON.stringify((await signingCredentials()).credentials);
  clearTokenCache();
  clearBusyCache();
  await DB.prepare('DELETE FROM bookings').run();
  await DB.prepare('DELETE FROM leads').run();
});

describe('routing and auth', () => {
  it('answers 404 for an unknown tool and for the client-only navigate tool', async () => {
    for (const name of ['nope', 'navigate', '__proto__']) {
      const response = await post(name, {});
      expect(response.status, name).toBe(404);
      expect(await json(response)).toMatchObject({
        ok: false,
        error: 'unknown',
      });
    }
  });

  it('answers 401 for a wrong, malformed or unset bearer, even on read tools', async () => {
    const cases: Array<[string | null, string]> = [
      [BEARER, 'Bearer wrong'],
      [BEARER, 'Basic abc'],
      [BEARER, 'Bearer'],
      [null, `Bearer ${BEARER}`],
    ];
    for (const [configured, header] of cases) {
      bearer = configured;
      const response = await post('get_pricing', {}, { Authorization: header });
      expect(response.status, header).toBe(401);
      expect(await json(response)).toMatchObject({ error: 'auth' });
    }
  });

  it('never falls through to the browser path with a wrong bearer', async () => {
    const response = await browser(BROWSER, { Authorization: 'Bearer wrong' });
    expect(response.status).toBe(401);
    expect(world.turnstileCalls).toBe(0);
  });

  it('lets a correct bearer book without Turnstile, origin or a per-IP limit', async () => {
    limiter = { tools: true, book: true };
    const response = await post('book_meeting', BOOKING, {
      Authorization: `Bearer ${BEARER}`,
    });
    expect(response.status).toBe(200);
    expect(await json(response)).toMatchObject({
      ok: true,
      result: { status: 'booked' },
    });
    await Promise.allSettled(background);
    expect(world.turnstileCalls).toBe(0);
    const row = await DB.prepare('SELECT channel FROM bookings').first();
    expect(row).toEqual({ channel: 'voice' });
  });

  it('still applies the D1 caps to bearer bookings', async () => {
    const headers = { Authorization: `Bearer ${BEARER}` };
    await post('book_meeting', BOOKING, headers);
    const second = await post(
      'book_meeting',
      { ...BOOKING, slot: '2027-01-13T09:00:00.000Z' },
      headers,
    );
    expect(await json(second)).toMatchObject({
      ok: true,
      result: { status: 'rejected', reason: 'limit' },
    });
  });
});

describe('the browser booking path', () => {
  it.each([
    ['no Origin', {}],
    ['a foreign Origin', { Origin: 'https://evil.example' }],
  ])('answers 403 origin with %s', async (_label, headers) => {
    const response = await post('book_meeting', BROWSER, headers);
    expect(response.status).toBe(403);
    expect(await json(response)).toMatchObject({ error: 'origin' });
    expect(world.turnstileCalls).toBe(0);
  });

  it('answers 415 for a body that is not JSON', async () => {
    const response = await browser(BROWSER, { 'Content-Type': 'text/plain' });
    expect(response.status).toBe(415);
    expect(await json(response)).toMatchObject({ error: 'unsupported' });
  });

  it('answers 429 with Retry-After from the book limiter, and the tools limiter for reads', async () => {
    limiter.book = true;
    const booking = await browser();
    expect(booking.status).toBe(429);
    expect(booking.headers.get('retry-after')).toBe('60');
    expect(world.turnstileCalls).toBe(0);
    limiter = { tools: true, book: false };
    const read = await post('get_pricing', {});
    expect(read.status).toBe(429);
    expect(read.headers.get('retry-after')).toBe('60');
    expect((await browser()).status).not.toBe(429);
  });

  it('fails open, with a log, when the limiter itself breaks', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    const request = new Request(`${ORIGIN}/api/tools/get_pricing`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    });
    const broken = deps({
      toolsLimiter: {
        limit: async () => {
          throw new Error('limiter down');
        },
      },
    });
    expect(
      (await handleToolRequest(request, 'get_pricing', broken)).status,
    ).toBe(200);
    expect(log).toHaveBeenCalledWith('tools: limiter unavailable');
    log.mockRestore();
  });

  it('answers 413 by declared length and by streamed size', async () => {
    const big = `{"topic":"${'x'.repeat(17_000)}"}`;
    const declared = await browser(big, {
      'Content-Length': String(big.length),
    });
    expect(declared.status).toBe(413);
    const streamed = await browser(big);

    expect(streamed.status).toBe(413);
    expect(await json(streamed)).toMatchObject({ error: 'too-large' });
  });

  it('answers 400 with issue paths and never echoes the submitted values', async () => {
    const marker = 'MARKER-VALUE-1234567890';
    const response = await browser({
      ...BROWSER,
      name: `${marker}${'x'.repeat(200)}`,
      email: marker,
      consent: false,
    });
    expect(response.status).toBe(400);
    const text = await response.clone().text();
    expect(text).not.toContain(marker);
    const body = await json(response);
    expect(body.error).toBe('invalid');
    expect(body.issues?.map((issue) => issue.path).sort()).toEqual([
      'consent',
      'email',
      'name',
    ]);
    expect(body.issues?.length).toBeLessThanOrEqual(10);
    expect(await json(await browser('not json'))).toMatchObject({
      error: 'invalid',
    });
  });

  it('answers a honeypot hit with a fake success and touches nothing', async () => {
    const response = await browser({
      ...BROWSER,
      website: 'http://spam.example',
    });
    expect(response.status).toBe(200);
    expect(await json(response)).toMatchObject({
      ok: true,
      result: { status: 'booked', meetUrl: null },
    });
    expect(world.turnstileCalls).toBe(0);
    expect(world.events).toEqual([]);
    expect(world.freebusyCalls).toEqual([]);
    expect(await count('bookings')).toBe(0);
    expect(await count('leads')).toBe(0);
  });

  it('answers 503 when the Turnstile secret cannot be read', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    turnstileSecret = async () => {
      throw new Error('Secret not found');
    };
    const response = await browser();
    expect(response.status).toBe(503);
    expect(await json(response)).toMatchObject({ error: 'unavailable' });
    expect(world.turnstileCalls).toBe(0);
    log.mockRestore();
  });

  it.each([
    [
      'a failed check',
      { success: false, action: 'book', hostname: 'zenetlabs.com' },
    ],
    [
      'the lead action',
      { success: true, action: 'lead', hostname: 'zenetlabs.com' },
    ],
    [
      'a foreign hostname',
      { success: true, action: 'book', hostname: 'evil.example' },
    ],
  ])('answers 403 captcha for %s', async (_label, verdict) => {
    world.turnstile = verdict;
    const response = await browser();
    expect(response.status).toBe(403);
    expect(await json(response)).toMatchObject({ error: 'captcha' });
    expect(world.events).toEqual([]);
    expect(await count('bookings')).toBe(0);
  });

  describe('from the chat card', () => {
    const SESSION = '5f0c2a52-6f4e-4a6c-9d4e-0b1d7b3b0a11';
    const LIVE_SITE = { ...TEST_SITE, assistant: { published: true } };
    const withChat = { ...BROWSER, chatSessionId: SESSION };

    async function session(createdAt: number) {
      await DB.prepare(
        `INSERT INTO chat_sessions (id, created_at, last_at, locale, model, start_page, user_messages)
         VALUES (?1, ?2, ?2, 'en', 'fake', '/', 1)`,
      )
        .bind(SESSION, createdAt)
        .run();
    }

    beforeEach(async () => {
      await DB.prepare('DELETE FROM chat_sessions').run();
      world.turnstile = {
        success: true,
        action: 'book',
        hostname: 'zenetlabs.com',
      };
    });

    it('books through book_meeting with its checks, as the chat channel, linked to the conversation', async () => {
      await session(NOW - 60_000);
      const response = await post(
        'book_meeting',
        withChat,
        { Origin: ORIGIN },
        undefined,
        {
          site: LIVE_SITE,
        },
      );
      expect(await json(response)).toMatchObject({
        ok: true,
        result: { status: 'booked' },
      });
      await Promise.allSettled(background);
      expect(world.turnstileCalls).toBe(1);
      expect(
        await DB.prepare('SELECT source, chat_session_id FROM leads').first(),
      ).toEqual({
        source: 'chat',
        chat_session_id: SESSION,
      });
      expect(await DB.prepare('SELECT channel FROM bookings').first()).toEqual({
        channel: 'chat',
      });
    });

    it('still enforces the booking caps: a second booking from the same address is refused', async () => {
      await session(NOW - 60_000);
      const site = { site: LIVE_SITE };
      await post('book_meeting', withChat, { Origin: ORIGIN }, undefined, site);
      const again = await post(
        'book_meeting',
        { ...withChat, slot: '2027-01-13T09:00:00.000Z' },
        { Origin: ORIGIN },
        undefined,
        site,
      );
      expect(await json(again)).toMatchObject({
        result: { status: 'rejected', reason: 'limit' },
      });
    });

    it('needs Turnstile like any browser booking', async () => {
      await session(NOW - 60_000);
      world.turnstile = {
        success: false,
        action: 'book',
        hostname: 'zenetlabs.com',
      };
      const response = await post(
        'book_meeting',
        withChat,
        { Origin: ORIGIN },
        undefined,
        { site: LIVE_SITE },
      );
      expect(response.status).toBe(403);
      expect(await count('bookings')).toBe(0);
    });

    it.each([
      ['an unknown session', null],
      ['a session older than a day', 25 * 3_600_000],
    ])('falls back to the web channel for %s', async (_label, age) => {
      if (age !== null) await session(NOW - age);
      const response = await post(
        'book_meeting',
        withChat,
        { Origin: ORIGIN },
        undefined,
        { site: LIVE_SITE },
      );
      expect(await json(response)).toMatchObject({
        result: { status: 'booked' },
      });
      await Promise.allSettled(background);
      expect(
        await DB.prepare('SELECT source, chat_session_id FROM leads').first(),
      ).toEqual({
        source: 'booking',
        chat_session_id: null,
      });
      expect(await DB.prepare('SELECT channel FROM bookings').first()).toEqual({
        channel: 'web',
      });
    });

    it('ignores the session while the assistant is dark', async () => {
      await session(NOW - 60_000);
      await post('book_meeting', withChat, { Origin: ORIGIN }, undefined, {
        site: { ...TEST_SITE, assistant: { published: false } },
      });
      await Promise.allSettled(background);
      expect(
        await DB.prepare('SELECT source, chat_session_id FROM leads').first(),
      ).toEqual({
        source: 'booking',
        chat_session_id: null,
      });
    });

    it('rejects a session id that is not a uuid', async () => {
      const response = await post(
        'book_meeting',
        { ...BROWSER, chatSessionId: 'x' },
        { Origin: ORIGIN },
      );
      expect(response.status).toBe(400);
    });
  });

  it('books, records the channel and the campaign, and sets no CORS headers', async () => {
    const response = await browser();
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(response.headers.get('access-control-allow-origin')).toBeNull();
    expect(await json(response)).toMatchObject({
      ok: true,
      result: { status: 'booked', label: 'Tuesday 12 January, 5:00 pm' },
    });
    await Promise.allSettled(background);
    expect(world.turnstileCalls).toBe(1);
    const lead = await DB.prepare(
      'SELECT source, utm_source, gclid, submit_page FROM leads',
    ).first();
    expect(lead).toEqual({
      source: 'booking',
      utm_source: 'news',
      gclid: 'g1',
      submit_page: '/book',
    });
    expect(await DB.prepare('SELECT channel FROM bookings').first()).toEqual({
      channel: 'web',
    });
  });

  it('marks the booking as a test on a non-live host', async () => {
    const response = await post(
      'book_meeting',
      BROWSER,
      { Origin: 'http://localhost:4173' },
      'http://localhost:4173/api/tools/book_meeting',
    );
    expect(response.status).toBe(200);
    await Promise.allSettled(background);
    expect(world.events.map((event) => event.calendarId)).toEqual([
      'test-calendar',
    ]);
    expect(await DB.prepare('SELECT is_test FROM leads').first()).toEqual({
      is_test: 1,
    });
  });
});

describe('read tools over HTTP', () => {
  it('serve the same envelope without any origin check', async () => {
    const response = await post('get_pricing', { service: 'diagnostic' });
    expect(response.status).toBe(200);
    expect(await json(response)).toMatchObject({
      ok: true,
      result: { currency: 'SGD' },
    });
  });

  it('answer 400 with issues for invalid input', async () => {
    const response = await post('get_pricing', { service: 'nope' });
    expect(response.status).toBe(400);
    expect(await json(response)).toMatchObject({
      error: 'invalid',
      issues: [{ path: 'service' }],
    });
  });

  it('report unavailable inside a 200 while the calendar is not configured', async () => {
    secret = 'UNSET-not-json';
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    const response = await post('check_availability', {});
    expect(response.status).toBe(200);
    expect(await json(response)).toMatchObject({
      ok: true,
      result: { status: 'unavailable', reason: 'not_configured' },
    });
    log.mockRestore();
  });

  it('turn a thrown error into a 503 that logs the tool and error name only', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    const request = new Request(`${ORIGIN}/api/tools/check_availability`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    });
    const broken = deps({
      calendarSecret: async () => {
        throw new Error('secret=super-private');
      },
    });
    const response = await handleToolRequest(
      request,
      'check_availability',
      broken,
    );
    expect(response.status).toBe(503);
    expect(await json(response)).toMatchObject({ error: 'unavailable' });
    expect(log).toHaveBeenCalledWith('tools: failed', {
      tool: 'check_availability',
      code: 'Error',
    });
    expect(JSON.stringify(log.mock.calls)).not.toContain('super-private');
    log.mockRestore();
  });
});

describe('a placeholder or invalid calendar secret', () => {
  it.each([
    ['the unconfigured placeholder', 'unconfigured'],
    ['UNSET', 'UNSET'],
    ['an empty bundle', '{}'],
    ['truncated JSON', '{"type":'],
  ])(
    'with %s the tools answer 200 not_configured and never 5xx',
    async (_label, value) => {
      const log = vi.spyOn(console, 'error').mockImplementation(() => {});
      const binding = { get: async () => value };
      const read = async () => {
        const { readCalendarSecret } = await import('@/server/calendar-config');
        return readCalendarSecret({ GOOGLE_CALENDAR: binding });
      };
      const request = (
        name: string,
        body: unknown,
        headers: Record<string, string>,
      ) =>
        handleToolRequest(
          new Request(`${ORIGIN}/api/tools/${name}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...headers },
            body: JSON.stringify(body),
          }),
          name,
          { ...deps(), calendarSecret: read },
        );

      const read1 = await request('check_availability', {}, {});
      expect(read1.status).toBe(200);
      expect(await json(read1)).toMatchObject({
        result: { status: 'unavailable', reason: 'not_configured' },
      });
      const book = await request('book_meeting', BOOKING, {
        Authorization: `Bearer ${BEARER}`,
      });
      expect(book.status).toBe(200);
      expect(await json(book)).toMatchObject({
        result: { status: 'unavailable', reason: 'not_configured' },
      });
      expect(
        await getHealth({
          GOOGLE_CALENDAR: binding,
          TOOLS_BEARER_SECRET: binding,
        }),
      ).toMatchObject({
        booking: false,
      });
      expect(world.tokenCalls).toBe(0);
      log.mockRestore();
    },
  );

  it('is not configured while the booking flag is off, even with a valid secret', async () => {
    const request = new Request(`${ORIGIN}/api/tools/check_availability`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    });
    const off = deps();
    const response = await handleToolRequest(request, 'check_availability', {
      ...off,
      site: { ...off.site, booking: { published: false } },
    });
    expect(await json(response)).toMatchObject({
      result: { status: 'unavailable', reason: 'not_configured' },
    });
    expect(world.freebusyCalls).toEqual([]);
  });
});

describe('while the booking flag is off', () => {
  it('answers a honeypot hit with not_configured, not a fake booking', async () => {
    const request = new Request(`${ORIGIN}/api/tools/book_meeting`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: ORIGIN,
        'CF-Connecting-IP': '203.0.113.7',
      },
      body: JSON.stringify({ ...BROWSER, website: 'http://spam.example' }),
    });
    const off = deps();
    const response = await handleToolRequest(request, 'book_meeting', {
      ...off,
      site: { ...off.site, booking: { published: false } },
    });
    expect(response.status).toBe(200);
    expect(await json(response)).toMatchObject({
      ok: true,
      result: { status: 'unavailable', reason: 'not_configured' },
    });
  });

  it('keeps the booking tools out of the manifest', async () => {
    const response = manifestResponse({
      ...TEST_SITE,
      booking: { published: false },
    });
    const body = z
      .object({ tools: z.array(z.object({ name: z.string() })) })
      .parse(await response.json());
    expect(body.tools.map((tool) => tool.name)).not.toContain('book_meeting');
    expect(body.tools.map((tool) => tool.name)).not.toContain(
      'check_availability',
    );
  });
});

describe('the wrong method on a tool URL', () => {
  it('is 404 for a tool that does not exist and 405 with Allow for one that does', async () => {
    const { wrongMethod } = await import('@/server/tools/route');
    expect(wrongMethod('nope').status).toBe(404);
    expect(wrongMethod('navigate').status).toBe(404);
    const real = wrongMethod('get_pricing');
    expect(real.status).toBe(405);
    expect(real.headers.get('allow')).toBe('POST');
  });
});

describe('manifest and health', () => {
  it('serves the six-tool manifest with a short public cache', async () => {
    const response = manifestResponse(TEST_SITE);
    expect(response.headers.get('cache-control')).toBe('public, max-age=300');
    const body = z
      .object({
        version: z.number(),
        tools: z.array(z.object({ name: z.string() })),
      })
      .parse(await response.json());
    expect(body.tools.map((tool) => tool.name)).toHaveLength(6);
  });

  it('reports booleans only, for both states', async () => {
    const binding = (value: string | Error) => ({
      get: async () => {
        if (value instanceof Error) throw value;
        return value;
      },
    });
    expect(
      await getHealth({
        GOOGLE_CALENDAR: binding(secret),
        TOOLS_BEARER_SECRET: binding('x'),
      }),
    ).toEqual({
      ok: true,
      booking: true,
      toolsBearer: true,
      assistant: false,
    });
    expect(
      await getHealth({
        GOOGLE_CALENDAR: binding('UNSET'),
        TOOLS_BEARER_SECRET: binding(new Error('Secret not found')),
      }),
    ).toEqual({
      ok: true,
      booking: false,
      toolsBearer: false,
      assistant: false,
    });
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(
      await getHealth({
        GOOGLE_CALENDAR: binding('{"broken"'),
        TOOLS_BEARER_SECRET: binding('x'),
      }),
    ).toEqual({
      ok: true,
      booking: false,
      toolsBearer: true,
      assistant: false,
    });
    log.mockRestore();
  });

  it('reports the assistant only when it is published and a model exists', () => {
    expect(assistantLive(TEST_SITE, true)).toBe(true);
    expect(assistantLive(TEST_SITE, false)).toBe(false);
    expect(assistantLive({ assistant: { published: false } }, true)).toBe(
      false,
    );
  });
});
