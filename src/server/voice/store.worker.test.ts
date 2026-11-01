import { env } from 'cloudflare:workers';
import { beforeEach, describe, expect, it } from 'vitest';
import { DAY_MS } from '@/lib/time';
import {
  claimToolCall,
  claimVoiceSession,
  deleteVoiceSession,
  markVoiceBooked,
  purgeVoiceSessions,
  releaseVoiceBooking,
  setConversationId,
} from '@/server/voice/store';

const { DB } = env;
const NOW = Date.UTC(2027, 0, 4, 8, 0);
const DAY = '2027-01-04';

function claim(
  overrides: Partial<Parameters<typeof claimVoiceSession>[1]> = {},
) {
  return claimVoiceSession(DB, {
    id: crypto.randomUUID(),
    now: NOW,
    day: DAY,
    locale: 'en',
    timeZone: 'Europe/Madrid',
    startPage: '/',
    isTest: false,
    cap: 2,
    ...overrides,
  });
}

async function total(): Promise<number> {
  const row = await DB.prepare(
    'SELECT count(*) AS n FROM voice_sessions',
  ).first<{
    n: number;
  }>();
  return row?.n ?? -1;
}

beforeEach(async () => {
  await DB.prepare('DELETE FROM voice_sessions').run();
});

describe('claimVoiceSession', () => {
  it('lets the cap-th claim through and refuses the next', async () => {
    expect(await claim()).toBe(true);
    expect(await claim()).toBe(true);
    expect(await claim()).toBe(false);
    expect(await total()).toBe(2);
  });

  it('lets exactly one of two claims in parallel take the last slot', async () => {
    await claim();
    const results = await Promise.all([claim(), claim()]);
    expect(results.filter(Boolean)).toHaveLength(1);
    expect(await total()).toBe(2);
  });

  it('counts test sessions with real ones, since a preview spends the same minutes, and each day on its own', async () => {
    await claim();
    await claim({ isTest: true });
    expect(await claim({ isTest: true })).toBe(false);
    expect(await claim()).toBe(false);
    expect(await claim({ day: '2027-01-05' })).toBe(true);
  });

  it('stores the locale, zone and page but no address', async () => {
    const id = crypto.randomUUID();
    await claim({
      id,
      locale: 'es',
      timeZone: 'Asia/Singapore',
      startPage: '/es',
    });
    const row = await DB.prepare('SELECT * FROM voice_sessions WHERE id = ?1')
      .bind(id)
      .first();
    expect(row).toMatchObject({
      locale: 'es',
      time_zone: 'Asia/Singapore',
      start_page: '/es',
      day: DAY,
      tool_calls: 0,
      book_attempts: 0,
      booked_at: null,
      is_test: 0,
    });
    expect(Object.keys(row ?? {})).not.toContain('ip');
  });

  it('forgets a session that was deleted, freeing its slot', async () => {
    const id = crypto.randomUUID();
    await claim({ id, cap: 1 });
    expect(await claim({ cap: 1 })).toBe(false);
    await deleteVoiceSession(DB, id);
    expect(await claim({ cap: 1 })).toBe(true);
  });
});

const call = (
  id: string,
  now = NOW,
  booking = false,
  conversation: string | null = null,
) => claimToolCall(DB, id, now, { booking, conversation });

describe('claimToolCall', () => {
  it('counts the call and returns the session, until the window or the calls run out', async () => {
    const id = crypto.randomUUID();
    await claim({ id, locale: 'es', isTest: true });
    await setConversationId(DB, id, 'conv-9');
    expect(await call(id, NOW + 1000)).toEqual({
      status: 'ok',
      session: {
        locale: 'es',
        timeZone: 'Europe/Madrid',
        isTest: true,
        conversationId: 'conv-9',
        booked: false,
      },
    });
    expect((await call(id, NOW + 15 * 60_000 - 1)).status).toBe('ok');
    expect((await call(id, NOW + 15 * 60_000)).status).toBe('session');
  });

  it('refuses the 41st call and an unknown id', async () => {
    const id = crypto.randomUUID();
    await claim({ id });
    for (let n = 0; n < 40; n += 1) {
      expect((await call(id)).status).toBe('ok');
    }
    expect((await call(id)).status).toBe('session');
    expect((await call(crypto.randomUUID())).status).toBe('session');
  });
});

describe('claimToolCall for a booking', () => {
  it('allows three attempts, then says limit while the session is alive', async () => {
    const id = crypto.randomUUID();
    await claim({ id });
    for (let n = 0; n < 3; n += 1) {
      expect((await call(id, NOW, true)).status).toBe('ok');
      await releaseVoiceBooking(DB, id);
    }
    expect((await call(id, NOW, true)).status).toBe('limit');
    const row = await DB.prepare(
      'SELECT tool_calls, book_attempts FROM voice_sessions WHERE id = ?1',
    )
      .bind(id)
      .first();
    expect(row).toEqual({ tool_calls: 4, book_attempts: 3 });
  });

  it('counts the attempt and the call in the same statement', async () => {
    const id = crypto.randomUUID();
    await claim({ id });
    await call(id, NOW, true);
    const row = await DB.prepare(
      'SELECT tool_calls, book_attempts FROM voice_sessions WHERE id = ?1',
    )
      .bind(id)
      .first();
    expect(row).toEqual({ tool_calls: 1, book_attempts: 1 });
  });

  it('says limit after a booking, session for a dead session', async () => {
    const booked = crypto.randomUUID();
    await claim({ id: booked, cap: 5 });
    expect((await call(booked, NOW, true)).status).toBe('ok');
    await markVoiceBooked(DB, booked, NOW);
    expect((await call(booked, NOW, true)).status).toBe('limit');
    expect(await call(booked)).toMatchObject({
      status: 'ok',
      session: { booked: true },
    });
    expect((await call(crypto.randomUUID(), NOW, true)).status).toBe('session');
    const expired = crypto.randomUUID();
    await claim({ id: expired, cap: 9 });
    expect((await call(expired, NOW + 16 * 60_000, true)).status).toBe(
      'session',
    );
  });
});

describe('a booking in flight', () => {
  it('lets only one of three parallel claims start a booking', async () => {
    const id = crypto.randomUUID();
    await claim({ id });
    const claims = await Promise.all([
      call(id, NOW, true),
      call(id, NOW, true),
      call(id, NOW, true),
    ]);
    expect(claims.map((entry) => entry.status).sort()).toEqual([
      'limit',
      'limit',
      'ok',
    ]);
  });

  it('frees the session when the booking did not happen, and blocks it for good when it did', async () => {
    const id = crypto.randomUUID();
    await claim({ id });
    expect((await call(id, NOW, true)).status).toBe('ok');
    expect((await call(id, NOW, true)).status).toBe('limit');
    await releaseVoiceBooking(DB, id);
    expect((await call(id, NOW, true)).status).toBe('ok');
    await markVoiceBooked(DB, id, NOW);
    await releaseVoiceBooking(DB, id);
    expect((await call(id, NOW, true)).status).toBe('limit');
  });

  it('stops blocking when the booking never reported back', async () => {
    const id = crypto.randomUUID();
    await claim({ id });
    expect((await call(id, NOW, true)).status).toBe('ok');
    expect((await call(id, NOW + 59_000, true)).status).toBe('limit');
    expect((await call(id, NOW + 61_000, true)).status).toBe('ok');
  });
});

describe('the conversation a session is bound to', () => {
  it('is the one of the first call, and any other is refused', async () => {
    const id = crypto.randomUUID();
    await claim({ id });
    await setConversationId(DB, id, 'minted-id-1');
    expect(await call(id)).toMatchObject({
      session: { conversationId: 'minted-id-1' },
    });
    expect(await call(id, NOW, false, 'conv_first1')).toMatchObject({
      status: 'ok',
      session: { conversationId: 'conv_first1' },
    });
    expect((await call(id, NOW, false, 'conv_other2')).status).toBe('session');
    expect((await call(id, NOW, false, 'conv_first1')).status).toBe('ok');
    expect(await call(id)).toMatchObject({
      status: 'ok',
      session: { conversationId: 'conv_first1' },
    });
  });
});

describe('purgeVoiceSessions', () => {
  it('deletes sessions older than 30 days and keeps the rest', async () => {
    const old = crypto.randomUUID();
    const recent = crypto.randomUUID();
    await claim({ id: old, now: NOW - 30 * DAY_MS - 1, cap: 9 });
    await claim({ id: recent, now: NOW - 30 * DAY_MS + 1, cap: 9 });
    expect(await purgeVoiceSessions(DB, NOW)).toBe(1);
    const left = await DB.prepare('SELECT id FROM voice_sessions').all();
    expect(left.results).toEqual([{ id: recent }]);
  });
});
