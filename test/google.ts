import { exportPKCS8, generateKeyPair } from 'jose';
import type { BookingDeps } from '@/server/booking';
import type { CalendarCredentials } from '@/server/calendar-config';
import type { ServerConfig, SiteConfig } from '../site.config';

export async function signingCredentials(): Promise<{
  credentials: CalendarCredentials;
  publicKey: CryptoKey;
}> {
  const { privateKey, publicKey } = await generateKeyPair('RS256', {
    extractable: true,
  });
  return {
    publicKey,
    credentials: {
      type: 'service_account',
      client_email: 'booking@project.iam.example.com',
      private_key_id: `kid-${crypto.randomUUID()}`,
      private_key: await exportPKCS8(privateKey),
      subject: 'owner@example.com',
      calendar_id: 'main-calendar',
      test_calendar_id: 'test-calendar',
    },
  };
}

export const TEST_SERVER: ServerConfig = {
  leads: { notifyTo: 'owner@example.com' },
  resendBaseUrl: 'https://resend.test',
  access: null,
  booking: {
    tokenUrl: 'https://google.test/token',
    calendarUrl: 'https://google.test/calendar/v3',
    busyCacheMs: 0,
    failureCacheMs: 0,
  },
  assistant: {
    model: 'fake',
    aiGatewayName: null,
    dailyNeuronBudget: 1_000,
    perAddressDailyTurns: 40,
  },
};

export const TEST_SITE: SiteConfig = {
  url: 'https://zenetlabs.com',
  turnstileSiteKey: 'k',
  cfBeaconToken: '',
  ga4Id: null,
  calculator: { published: false },
  booking: { published: true },
  assistant: { published: true },
};

type Interval = { start: number; end: number };
export type StoredEvent = { calendarId: string; body: Record<string, unknown> };
export type InsertMode =
  | 'ok'
  | 'pending'
  | 'http500'
  | 'timeout-stored'
  | 'timeout-lost'
  | 'conference-failed';

export type World = {
  busy: Map<string, Interval[]>;
  events: StoredEvent[];
  tokenStatus: number;
  freebusyStatus: number;
  freebusyHang: boolean;
  getStatus: number;
  freebusyCalls: string[];
  tokenCalls: number;
  insertMode: InsertMode;
  sent: Array<{ to: string; subject: string; text: string }>;
  turnstile: { success: boolean; action: string; hostname: string };
  turnstileCalls: number;
};

export function newWorld(): World {
  return {
    busy: new Map(),
    events: [],
    tokenStatus: 200,
    freebusyStatus: 200,
    freebusyHang: false,
    getStatus: 200,
    freebusyCalls: [],
    tokenCalls: 0,
    insertMode: 'ok',
    sent: [],
    turnstile: { success: true, action: 'book', hostname: 'zenetlabs.com' },
    turnstileCalls: 0,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function readJson(init: RequestInit | undefined): Record<string, unknown> {
  const parsed: unknown = JSON.parse(String(init?.body ?? '{}'));
  return isRecord(parsed) ? parsed : {};
}

function eventInterval(event: StoredEvent): Interval | null {
  const { start, end } = event.body;
  if (!isRecord(start) || !isRecord(end)) return null;
  const from = Date.parse(String(start.dateTime));
  const to = Date.parse(String(end.dateTime));
  return Number.isNaN(from) || Number.isNaN(to)
    ? null
    : { start: from, end: to };
}

function eventResponse(event: StoredEvent, ready: boolean): Response {
  return Response.json({
    id: event.body.id,
    htmlLink: 'https://calendar.google.com/event?eid=1',
    ...(ready ? { hangoutLink: 'https://meet.google.com/aaa-bbbb-ccc' } : {}),
    conferenceData: ready
      ? undefined
      : { createRequest: { status: { statusCode: 'pending' } } },
  });
}

export function fakeFetch(world: World): typeof fetch {
  return async (input, init) => {
    const url = new URL(String(input));
    const path = `${url.origin}${url.pathname}`;
    const method = init?.method ?? 'GET';
    if (path === 'https://google.test/token') {
      world.tokenCalls += 1;
      return world.tokenStatus === 200
        ? Response.json({ access_token: 'ya29.fake', expires_in: 3600 })
        : Response.json(
            { error: 'unauthorized_client' },
            { status: world.tokenStatus },
          );
    }
    if (path === 'https://google.test/calendar/v3/freeBusy') {
      const body = readJson(init);
      const items = Array.isArray(body.items) ? body.items : [];
      const id = isRecord(items[0]) ? String(items[0].id) : '';
      world.freebusyCalls.push(id);
      if (world.freebusyHang) return new Promise<Response>(() => {});
      if (world.freebusyStatus !== 200) {
        return new Response('{}', { status: world.freebusyStatus });
      }
      const own = world.events
        .filter((event) => event.calendarId === id)
        .flatMap((event) => eventInterval(event) ?? []);
      const busy = [...(world.busy.get(id) ?? []), ...own].map(
        ({ start, end }) => ({
          start: new Date(start).toISOString(),
          end: new Date(end).toISOString(),
        }),
      );
      return Response.json({ calendars: { [id]: { busy } } });
    }
    const events =
      /^\/calendar\/v3\/calendars\/([^/]+)\/events(?:\/([^/]+))?$/.exec(
        url.pathname,
      );
    if (url.origin === 'https://google.test' && events) {
      const calendarId = decodeURIComponent(events[1] ?? '');
      if (method === 'POST') {
        const stored: StoredEvent = { calendarId, body: readJson(init) };
        if (world.insertMode === 'http500') {
          return new Response('{}', { status: 500 });
        }
        if (world.insertMode === 'timeout-lost') {
          throw new DOMException('slow', 'TimeoutError');
        }
        world.events.push(stored);
        if (world.insertMode === 'conference-failed') {
          return Response.json({
            id: stored.body.id,
            htmlLink: 'https://calendar.google.com/event?eid=1',
            conferenceData: {
              createRequest: { status: { statusCode: 'failure' } },
            },
          });
        }
        if (world.insertMode === 'timeout-stored') {
          throw new DOMException('slow', 'TimeoutError');
        }
        return eventResponse(stored, world.insertMode !== 'pending');
      }
      if (world.getStatus !== 200) {
        return new Response('{}', { status: world.getStatus });
      }
      const found = world.events.find(
        (event) =>
          event.calendarId === calendarId &&
          event.body.id === decodeURIComponent(events[2] ?? ''),
      );
      if (!found) return new Response('{}', { status: 404 });
      return eventResponse(found, true);
    }
    if (path === 'https://resend.test/emails') {
      const body = readJson(init);
      const to = Array.isArray(body.to) ? String(body.to[0]) : '';
      world.sent.push({
        to,
        subject: String(body.subject),
        text: String(body.text),
      });
      return Response.json({ id: `re_${world.sent.length}` });
    }
    if (path === 'https://challenges.cloudflare.com/turnstile/v0/siteverify') {
      world.turnstileCalls += 1;
      return Response.json(world.turnstile);
    }
    throw new TypeError(`unexpected fetch ${method} ${path}`);
  };
}

export function bookingDeps(
  db: D1Database,
  world: World,
  secret: string | null,
  background: Promise<unknown>[],
): BookingDeps {
  return {
    db,
    resendKey: async () => 're_test',
    fetch: fakeFetch(world),
    server: TEST_SERVER,
    site: TEST_SITE,
    calendarSecret: async () => secret,
    waitUntil: (promise) => {
      background.push(promise);
    },
  };
}
