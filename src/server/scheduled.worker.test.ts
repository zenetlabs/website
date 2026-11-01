import { env } from 'cloudflare:workers';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getLead, storeLead } from '@/server/lead-store';
import { deliverDue } from '@/server/outbox';
import { runScheduled } from '@/server/scheduled';
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
    });
    const [owner] = await storeLead(DB, NEW_LEAD, TICK);
    await DB.prepare("UPDATE email_outbox SET status = 'dead' WHERE id = ?1")
      .bind(owner?.outboxId ?? '')
      .run();
    await runScheduled(testEnv, TICK + 60_000);
    expect(error).toHaveBeenCalledWith('scheduled: daily summary', {
      purged: 0,
      deadOwner: { count: 1, outboxIds: [owner?.outboxId] },
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

  it('logs no summary outside the daily tick', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    await runScheduled(testEnv, NOW);
    expect(log).not.toHaveBeenCalled();
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
