import { env } from 'cloudflare:workers';
import { beforeEach, describe, expect, it } from 'vitest';
import { bookMeeting, clearBusyCache } from '@/server/booking';
import {
  type ConfirmDeps,
  confirmViewResponse,
  maskEmail,
  postConfirm,
} from '@/server/booking-confirm';
import { clearTokenCache } from '@/server/google-auth';
import {
  bookingDeps,
  newWorld,
  signingCredentials,
  type World,
} from '../../test/google';

const { DB } = env;
const ORIGIN = 'https://zenetlabs.com';
const NOW = Date.UTC(2027, 0, 4, 8, 0);
const SLOT = Date.UTC(2027, 0, 12, 9, 0);

let world: World;
let background: Promise<unknown>[];
let secret: string;
let limited: boolean;

function deps(now = NOW + 60_000): ConfirmDeps {
  return {
    ...bookingDeps(DB, world, secret, background),
    limiter: { limit: async () => ({ success: !limited }) },
    now: () => now,
  };
}

async function request(locale: 'en' | 'es' = 'en'): Promise<string> {
  await bookMeeting(
    {
      input: {
        slot: new Date(SLOT).toISOString(),
        name: 'Ada Lovelace',
        email: 'ada@example.com',
        company: 'Analytical Engines',
        topic: 'Automate our inbox triage.',
        timeZone: 'Asia/Singapore',
        locale,
      },
      channel: 'web',
      surface: 'page',
      consentAt: NOW,
      attribution: null,
      chatSessionId: null,
      origin: ORIGIN,
      ip: null,
    },
    { deps: deps(), now: NOW, isTest: false },
  );
  await Promise.allSettled(background);
  const text = world.sent.at(-1)?.text ?? '';
  return /\?confirm=([\w.-]+)/.exec(text)?.[1] ?? '';
}

function form(
  body: string,
  headers: Record<string, string> = {},
  url = `${ORIGIN}/api/book/confirm`,
): Request {
  return new Request(url, {
    method: 'POST',
    headers: {
      Origin: ORIGIN,
      'Sec-Fetch-Site': 'same-origin',
      'Content-Type': 'application/x-www-form-urlencoded',
      ...headers,
    },
    body,
  });
}

async function status(): Promise<unknown> {
  return DB.prepare('SELECT status, confirmed_at FROM bookings').first();
}

beforeEach(async () => {
  world = newWorld(NOW);
  background = [];
  limited = false;
  secret = JSON.stringify((await signingCredentials()).credentials);
  clearTokenCache();
  clearBusyCache();
  await DB.prepare('DELETE FROM bookings').run();
  await DB.prepare('DELETE FROM leads').run();
});

describe('opening the link', () => {
  it('changes nothing on GET or HEAD, the scanner case, and shows only the slot and a masked address', async () => {
    const token = await request();
    for (const method of ['GET', 'HEAD', 'GET']) {
      const response = await confirmViewResponse(
        new Request(`${ORIGIN}/api/book/confirm?confirm=${token}`, { method }),
        DB,
        NOW + 60_000,
      );
      expect(response.headers.get('cache-control')).toBe('private, no-store');
      expect(response.headers.get('x-robots-tag')).toBe('noindex');
      expect(response.headers.get('referrer-policy')).toBe('same-origin');
      if (method === 'GET') {
        const body = await response.text();
        expect(JSON.parse(body)).toEqual({
          state: 'pending',
          start: SLOT,
          end: SLOT + 1_800_000,
          timeZone: 'Asia/Singapore',
          masked: 'a•••@example.com',
          expiresAt: NOW + 30 * 60_000,
          method: 'booking',
        });
        expect(body).not.toMatch(/Ada|Analytical|inbox/);
      }
    }
    expect(await status()).toEqual({ status: 'held', confirmed_at: null });
    expect(world.events).toEqual([]);
  });

  it('answers invalid for a wrong token, never saying whether the booking exists', async () => {
    const token = await request();
    const [id] = token.split('.');
    for (const wrong of [`${id}.${'A'.repeat(43)}`, 'x', '']) {
      const response = await confirmViewResponse(
        new Request(`${ORIGIN}/api/book/confirm?confirm=${wrong}`),
        DB,
        NOW,
      );
      expect(await response.json()).toEqual({ state: 'invalid' });
    }
  });

  it('only lets the outcome hint refine a state the row agrees with', async () => {
    const token = await request();
    const view = async (outcome: string) =>
      (
        await confirmViewResponse(
          new Request(
            `${ORIGIN}/api/book/confirm?confirm=${token}&outcome=${outcome}`,
          ),
          DB,
          NOW,
        )
      ).json();
    expect(await view('unavailable')).toMatchObject({ state: 'unavailable' });
    expect(await view('taken')).toMatchObject({ state: 'pending' });
  });

  it('masks an address to its first letter and domain', () => {
    expect(maskEmail('ada@example.com')).toBe('a•••@example.com');
    expect(maskEmail('@x')).toBe('•••');
  });
});

describe('pressing Confirm', () => {
  it('books, then 303s back to the link in the visitor language', async () => {
    const token = await request('es');
    const response = await postConfirm(
      form(`token=${token}&locale=es`),
      deps(),
    );
    await Promise.allSettled(background);
    expect(response.status).toBe(303);
    expect(response.headers.get('location')).toBe(
      `${ORIGIN}/es/reservar?confirm=${token}&outcome=booked`,
    );
    expect(response.headers.get('referrer-policy')).toBe('same-origin');
    expect(await status()).toMatchObject({ status: 'confirmed' });
    expect(world.events).toHaveLength(1);
  });

  it('carries the taken and unavailable outcomes in the redirect', async () => {
    const token = await request();
    world.freebusyStatus = 503;
    const unavailable = await postConfirm(form(`token=${token}`), deps());
    expect(unavailable.headers.get('location')).toBe(
      `${ORIGIN}/book?confirm=${token}&outcome=unavailable`,
    );
    world.freebusyStatus = 200;
    world.busy.set('main-calendar', [{ start: SLOT, end: SLOT + 1_800_000 }]);
    const taken = await postConfirm(
      form(`token=${token}`),
      deps(NOW + 120_000),
    );
    expect(taken.headers.get('location')).toBe(
      `${ORIGIN}/book?confirm=${token}&outcome=taken`,
    );
  });

  it.each([
    ['no Origin', { Origin: '' }, 403],
    ['a foreign Origin', { Origin: 'https://evil.example' }, 403],
    ['a cross-site fetch', { 'Sec-Fetch-Site': 'cross-site' }, 403],
    ['a same-site fetch', { 'Sec-Fetch-Site': 'same-site' }, 403],
    ['a JSON body', { 'Content-Type': 'application/json' }, 415],
  ])('refuses %s and changes nothing', async (_label, headers, code) => {
    const token = await request();
    const response = await postConfirm(form(`token=${token}`, headers), deps());
    expect(response.status).toBe(code);
    expect(await status()).toEqual({ status: 'held', confirmed_at: null });
  });

  it('accepts a browser that sends no Sec-Fetch-Site', async () => {
    const token = await request();
    const request_ = new Request(`${ORIGIN}/api/book/confirm`, {
      method: 'POST',
      headers: {
        Origin: ORIGIN,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `token=${token}`,
    });
    expect((await postConfirm(request_, deps())).status).toBe(303);
  });

  it('refuses a body over 1 KB and a limited IP', async () => {
    const token = await request();
    const big = await postConfirm(
      form(`token=${token}&pad=${'x'.repeat(1100)}`),
      deps(),
    );
    expect(big.status).toBe(413);
    limited = true;
    const rate = await postConfirm(form(`token=${token}`), deps());
    expect(rate.status).toBe(429);
    expect(rate.headers.get('retry-after')).toBe('60');
    expect(await status()).toEqual({ status: 'held', confirmed_at: null });
  });
});
