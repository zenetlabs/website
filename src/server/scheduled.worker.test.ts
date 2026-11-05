import { env } from 'cloudflare:workers';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getLead, leadStatements, storeLead } from '@/server/lead-store';
import { deliverDue } from '@/server/outbox';
import { runScheduled } from '@/server/scheduled';
import { signingCredentials } from '../../test/google';
import { DAY, NEW_LEAD } from '../../test/leads';

vi.mock('@/server/outbox', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/server/outbox')>();
  return { ...actual, deliverDue: vi.fn(actual.deliverDue) };
});

const NOW = Date.UTC(2026, 9, 31, 12, 0, 0);
const { DB } = env;
const fetchMock = vi.fn<typeof fetch>();
const secret = { get: async () => 'secret' };
const testEnv = {
  ...env,
  DB,
  RESEND_API_KEY: secret,
  TURNSTILE_SECRET_KEY: secret,
};

async function statuses(leadId: string): Promise<string[]> {
  const found = await getLead(DB, leadId);
  return found?.emails.map((email) => email.status) ?? [];
}

beforeEach(async () => {
  fetchMock
    .mockReset()
    .mockImplementation(async () => Response.json({ id: 'em' }));
  vi.stubGlobal('fetch', fetchMock);
  await DB.prepare('DELETE FROM leads').run();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const TICK = Date.UTC(2026, 9, 31, 3, 0, 0);

describe('runScheduled', () => {
  it('delivers due rows', async () => {
    const [owner] = await storeLead(DB, NEW_LEAD, NOW);
    await runScheduled(testEnv, NOW);
    expect(await statuses(owner?.lead.id ?? '')).toEqual(['sent', 'sent']);
  });

  it('purges expired leads on the first tick of 03:00 UTC only', async () => {
    const [expired] = await storeLead(DB, NEW_LEAD, TICK - 731 * DAY);
    const id = expired?.lead.id ?? '';
    await runScheduled(testEnv, TICK - 10 * 60_000);
    expect(await getLead(DB, id)).not.toBeNull();
    await runScheduled(testEnv, TICK + 10 * 60_000);
    expect(await getLead(DB, id)).not.toBeNull();
    await runScheduled(testEnv, TICK + 9 * 60_000);
    expect(await getLead(DB, id)).toBeNull();
  });

  it('logs one daily summary with the dead owner notifications by id', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    await runScheduled(testEnv, TICK);
    expect(log).toHaveBeenCalledWith('scheduled: daily summary', {
      purged: 0,
      deadOwner: { count: 0, outboxIds: [] },
      deadBooking: 0,
    });
    const [owner] = await storeLead(DB, NEW_LEAD, TICK);
    await DB.prepare("UPDATE email_outbox SET status = 'dead' WHERE id = ?1")
      .bind(owner?.outboxId ?? '')
      .run();
    await runScheduled(testEnv, TICK + 60_000);
    expect(error).toHaveBeenCalledWith('scheduled: daily summary', {
      purged: 0,
      deadOwner: { count: 1, outboxIds: [owner?.outboxId] },
      deadBooking: 0,
    });
    expect(JSON.stringify(error.mock.calls)).not.toContain('@');
  });

  it('purges unlinked chats after 30 days on the daily tick, keeping linked and recent ones', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    const session = (id: string, createdAt: number) =>
      DB.prepare(
        `INSERT INTO chat_sessions (id, created_at, last_at, locale, model, start_page)
         VALUES (?1, ?2, ?2, 'en', 'fake', '/')`,
      )
        .bind(id, createdAt)
        .run();
    const OLD = 'aaaaaaaa-0000-4000-8000-000000000001';
    const FRESH = 'aaaaaaaa-0000-4000-8000-000000000002';
    const LINKED = 'aaaaaaaa-0000-4000-8000-000000000003';
    await DB.prepare('DELETE FROM chat_sessions').run();
    await session(OLD, TICK - 31 * DAY);
    await session(FRESH, TICK - 29 * DAY);
    await session(LINKED, TICK - 31 * DAY);
    await storeLead(DB, { ...NEW_LEAD, chat_session_id: LINKED }, TICK);
    await runScheduled(testEnv, TICK - 10 * 60_000);
    expect(
      (await DB.prepare('SELECT COUNT(*) AS n FROM chat_sessions').first())?.n,
    ).toBe(3);
    await runScheduled(testEnv, TICK);
    const { results } = await DB.prepare(
      'SELECT id FROM chat_sessions ORDER BY id',
    ).all();
    expect(results.map((row) => row.id)).toEqual([FRESH, LINKED]);
  });

  it('still reports the lead summary when the chat purge fails', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    await DB.prepare(
      'ALTER TABLE chat_sessions RENAME TO chat_sessions_gone',
    ).run();
    try {
      await runScheduled(testEnv, TICK);
    } finally {
      await DB.prepare(
        'ALTER TABLE chat_sessions_gone RENAME TO chat_sessions',
      ).run();
    }
    expect(log).toHaveBeenCalledWith(
      'scheduled: daily summary',
      expect.anything(),
    );
    expect(error).toHaveBeenCalledWith('scheduled: chat purge failed', {
      error: 'Error',
    });
  });

  it('purges voice sessions after 30 days on the daily tick only', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    const session = (id: string, createdAt: number) =>
      DB.prepare(
        `INSERT INTO voice_sessions (id, created_at, day, locale, time_zone, start_page)
         VALUES (?1, ?2, '2026-10-01', 'en', 'UTC', '/')`,
      )
        .bind(id, createdAt)
        .run();
    await DB.prepare('DELETE FROM voice_sessions').run();
    await session('old', TICK - 31 * DAY);
    await session('fresh', TICK - 29 * DAY);
    await runScheduled(testEnv, TICK - 10 * 60_000);
    expect(
      (await DB.prepare('SELECT COUNT(*) AS n FROM voice_sessions').first())?.n,
    ).toBe(2);
    await runScheduled(testEnv, TICK);
    const { results } = await DB.prepare('SELECT id FROM voice_sessions').all();
    expect(results).toEqual([{ id: 'fresh' }]);
  });

  it('logs no summary outside the daily tick', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    await runScheduled(testEnv, NOW);
    expect(log).not.toHaveBeenCalledWith(
      'scheduled: daily summary',
      expect.anything(),
    );
    expect(log).toHaveBeenCalledWith('scheduled: booking expiry', {
      expired: 0,
      dropped: 0,
    });
  });

  it('still purges when delivery throws', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(deliverDue).mockRejectedValueOnce(new TypeError('D1 down'));
    const [expired] = await storeLead(DB, NEW_LEAD, TICK - 731 * DAY);
    await runScheduled(testEnv, TICK);
    expect(await getLead(DB, expired?.lead.id ?? '')).toBeNull();
    expect(error).toHaveBeenCalledWith('scheduled: delivery failed', {
      error: 'TypeError',
    });
  });

  it('leaves rows that are not due yet', async () => {
    const [later] = await storeLead(DB, NEW_LEAD, NOW + 10 * 60_000);
    await runScheduled(testEnv, NOW);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(await statuses(later?.lead.id ?? '')).toEqual([
      'pending',
      'pending',
    ]);
  });
});

const REQUEST = JSON.stringify({
  locale: 'en',
  name: 'Ada Lovelace',
  company: null,
  topic: 'Automate our inbox triage.',
  timeZone: 'Asia/Singapore',
  attribution: null,
  chatSessionId: null,
  voice: null,
  consentAt: NOW,
  surface: 'page',
});

describe('the booking jobs', () => {
  const credentials = signingCredentials();
  let deletes: string[];
  let deleteStatus: number;

  async function google(input: RequestInfo | URL, init?: RequestInit) {
    const url = new URL(String(input));
    if (url.hostname === 'oauth2.googleapis.com') {
      return Response.json({ access_token: 'ya29.fake', expires_in: 3600 });
    }
    if (url.hostname === 'www.googleapis.com' && init?.method === 'DELETE') {
      deletes.push(`${url.pathname}?${url.searchParams}`);
      return new Response(null, { status: deleteStatus });
    }
    return Response.json({ id: 'em' });
  }

  async function pendingBooking(id: string, createdAt: number) {
    await DB.batch([
      DB.prepare(
        `INSERT INTO bookings (id, created_at, slot_start, slot_end, day, status, hold_expires_at,
           email, channel, is_test, email_key, request, link_origin, confirm_expires_at)
         VALUES (?1, ?2, ?3, ?3 + 1800000, '2026-11-10', 'held', ?2 + 1800000,
           'ada@example.com', 'web', 0, 'ada@example.com', ?4, 'https://zenetlabs.com', ?2 + 1800000)`,
      ).bind(id, createdAt, createdAt + 6 * DAY, REQUEST),
      DB.prepare(
        `INSERT INTO booking_emails (id, booking_id, kind, created_at, next_attempt_at)
         VALUES (?1, ?2, 'verify', ?3, ?3)`,
      ).bind(`mail-${id}`, id, createdAt + 10 * 60_000),
    ]);
  }

  async function confirmedBooking(id: string, leadAt: number) {
    const lead = leadStatements(DB, NEW_LEAD, leadAt, 'none');
    await DB.batch([
      ...lead.statements,
      DB.prepare(
        `INSERT INTO bookings (id, created_at, slot_start, slot_end, day, status, email, channel,
           event_id, lead_id, is_test)
         VALUES (?1, ?2, ?2 + 86400000, ?2 + 88200000, '2024-11-01', 'confirmed', 'ada@example.com',
           'web', ?3, ?4, 0)`,
      ).bind(id, leadAt, `bk${id}`, lead.leadId),
    ]);
    return lead.leadId;
  }

  beforeEach(async () => {
    deletes = [];
    deleteStatus = 204;
    fetchMock.mockReset().mockImplementation(google);
    await DB.batch([
      DB.prepare('DELETE FROM bookings'),
      DB.prepare('DELETE FROM booking_ip_usage'),
    ]);
  });

  function withCalendar() {
    return credentials.then(({ credentials: bundle }) => ({
      ...testEnv,
      GOOGLE_CALENDAR: { get: async () => JSON.stringify(bundle) },
    }));
  }

  it('expires lapsed requests on every tick and drops their unsent verify emails before sending', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    await pendingBooking('lapsed', NOW - 40 * 60_000);
    await runScheduled(testEnv, NOW);
    expect(
      (await DB.prepare('SELECT status, request FROM bookings').all()).results,
    ).toEqual([{ status: 'expired', request: null }]);
    expect(
      (await DB.prepare('SELECT status, last_error FROM booking_emails').all())
        .results,
    ).toEqual([{ status: 'dead', last_error: 'expired' }]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('retries a due verify email for a live request with a fresh link', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    await pendingBooking('live', NOW - 15 * 60_000);
    await runScheduled(testEnv, NOW);
    const sent = fetchMock.mock.calls.find(([url]) =>
      String(url).endsWith('/emails'),
    );
    expect(JSON.parse(String(sent?.[1]?.body)).text).toMatch(
      /https:\/\/zenetlabs\.com\/book\?confirm=live\./,
    );
  });

  it('deletes 24-month-old events silently before the lead purge, and only then the lead', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    const leadId = await confirmedBooking('old', TICK - 731 * DAY);
    await runScheduled(await withCalendar(), TICK);
    expect(deletes).toEqual([
      '/calendar/v3/calendars/main-calendar/events/bkold?sendUpdates=none',
    ]);
    expect(log).toHaveBeenCalledWith('scheduled: calendar purge', {
      due: 1,
      deleted: 1,
      failed: 0,
      skipped: 0,
    });
    expect(await getLead(DB, leadId)).toBeNull();
    expect(
      (await DB.prepare('SELECT count(*) AS n FROM bookings').first())?.n,
    ).toBe(0);
  });

  it('keeps the lead and its row when a delete fails, for the next day', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    deleteStatus = 500;
    const leadId = await confirmedBooking('stuck', TICK - 731 * DAY);
    await runScheduled(await withCalendar(), TICK);
    expect(error).toHaveBeenCalledWith('scheduled: calendar purge', {
      due: 1,
      deleted: 0,
      failed: 1,
      skipped: 0,
    });
    expect(await getLead(DB, leadId)).not.toBeNull();
    expect(
      await DB.prepare('SELECT event_deleted_at FROM bookings').first(),
    ).toEqual({ event_deleted_at: null });
  });

  it('skips a row whose calendar does not exist, deletes the rest, and rotates failures to the back', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const { credentials: bundle } = await credentials;
    const noTest = { ...bundle, test_calendar_id: undefined };
    const env = {
      ...testEnv,
      GOOGLE_CALENDAR: { get: async () => JSON.stringify(noTest) },
    };
    await confirmedBooking('live', TICK - 731 * DAY);
    await confirmedBooking('test', TICK - 732 * DAY);
    await DB.prepare("UPDATE bookings SET is_test = 1 WHERE id = 'test'").run();
    await runScheduled(env, TICK);
    expect(log).toHaveBeenCalledWith('scheduled: calendar purge', {
      due: 2,
      deleted: 1,
      failed: 0,
      skipped: 1,
    });
    expect(
      (await DB.prepare('SELECT id, purge_tried_at FROM bookings').all())
        .results,
    ).toEqual([{ id: 'test', purge_tried_at: TICK }]);
  });

  it('deletes a lead past the backstop even if its event stayed, and says so', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    deleteStatus = 500;
    const leadId = await confirmedBooking('stuck', TICK - 761 * DAY);
    await runScheduled(await withCalendar(), TICK);
    expect(error).toHaveBeenCalledWith(
      'scheduled: calendar events past the backstop',
      { bookingIds: ['stuck'] },
    );
    expect(await getLead(DB, leadId)).toBeNull();
  });

  it('skips the purge with an error when the calendar is not configured and rows are due', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const leadId = await confirmedBooking('waiting', TICK - 731 * DAY);
    await runScheduled(
      { ...testEnv, GOOGLE_CALENDAR: { get: async () => 'unconfigured' } },
      TICK,
    );
    expect(error).toHaveBeenCalledWith('scheduled: calendar purge skipped', {
      reason: 'unconfigured',
    });
    expect(await getLead(DB, leadId)).not.toBeNull();
  });

  it('deletes booking fingerprints from before yesterday on the daily tick', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    await DB.batch(
      ['2026-10-29', '2026-10-30', '2026-10-31'].map((day) =>
        DB.prepare(
          "INSERT INTO booking_ip_usage (day, key, sends) VALUES (?1, 'k', 1)",
        ).bind(day),
      ),
    );
    await runScheduled(testEnv, TICK);
    expect(
      (await DB.prepare('SELECT day FROM booking_ip_usage ORDER BY day').all())
        .results,
    ).toEqual([{ day: '2026-10-30' }, { day: '2026-10-31' }]);
  });
});
