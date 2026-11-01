import { env } from 'cloudflare:workers';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  backoffMs,
  claimEmail,
  deadOwnerEmails,
  deferEmail,
  dueEmails,
  exportLeads,
  getLead,
  leadStatements,
  leadsOverview,
  markDead,
  markFailed,
  markSent,
  purgeExpired,
  storeLead,
} from '@/server/lead-store';
import { DAY, NEW_LEAD } from '../../test/leads';

const NOW = Date.UTC(2026, 9, 31, 12, 0, 0);
const { DB } = env;

async function store(lead: Parameters<typeof storeLead>[1], now: number) {
  const emails = await storeLead(DB, lead, now);
  return {
    id: emails[0]?.lead.id ?? '',
    emails,
    confirmationQueued: emails.some((email) => email.kind === 'confirmation'),
  };
}

async function due(now: number, limit: number) {
  return (await dueEmails(DB, now, limit)).due;
}

async function count(table: string): Promise<number> {
  const row = await DB.prepare(`SELECT count(*) AS n FROM ${table}`).first<{
    n: number;
  }>();
  return row?.n ?? -1;
}

beforeEach(async () => {
  await DB.prepare('DELETE FROM leads').run();
});

describe('storeLead', () => {
  it('returns the queued emails built from memory', async () => {
    const stored = await store(NEW_LEAD, NOW);
    expect(stored.confirmationQueued).toBe(true);
    expect(await count('leads')).toBe(1);
    const found = await getLead(DB, stored.id);
    expect(found?.lead.created_at).toBe(NOW);
    expect(found?.lead.consent_at).toBe(NOW);
    expect(found?.emails.map((e) => [e.kind, e.status, e.attempts])).toEqual([
      ['confirmation', 'pending', 0],
      ['owner', 'pending', 0],
    ]);
    expect(found?.emails.every((e) => e.next_attempt_at === NOW)).toBe(true);
    expect(stored.emails.map((e) => e.outboxId).sort()).toEqual(
      found?.emails.map((e) => e.id).sort(),
    );
    expect(stored.emails.every((e) => e.attempts === 0)).toBe(true);
    expect(stored.emails[0]?.lead).toEqual(found?.lead);
  });

  it('queues no second confirmation for the same address within 24 hours', async () => {
    await store(NEW_LEAD, NOW);
    const second = await store(NEW_LEAD, NOW + DAY - 1);
    expect(second.confirmationQueued).toBe(false);
    const found = await getLead(DB, second.id);
    expect(found?.emails.map((e) => e.kind)).toEqual(['owner']);
    expect(await count('email_outbox')).toBe(3);
  });

  it('queues the confirmation again after 24 hours and 1 ms', async () => {
    await store(NEW_LEAD, NOW);
    const later = await store(NEW_LEAD, NOW + DAY + 1);
    expect(later.confirmationQueued).toBe(true);
  });

  it('does not count a dead or failed confirmation toward the cap', async () => {
    for (const status of ['dead', 'failed']) {
      await DB.prepare('DELETE FROM leads').run();
      const first = await store(NEW_LEAD, NOW);
      await DB.prepare(
        "UPDATE email_outbox SET status = ?1 WHERE lead_id = ?2 AND kind = 'confirmation'",
      )
        .bind(status, first.id)
        .run();
      expect((await store(NEW_LEAD, NOW + 1000)).confirmationQueued).toBe(true);
    }
  });

  it('counts a sent confirmation toward the cap', async () => {
    const first = await store(NEW_LEAD, NOW);
    await DB.prepare(
      "UPDATE email_outbox SET status = 'sent' WHERE lead_id = ?1 AND kind = 'confirmation'",
    )
      .bind(first.id)
      .run();
    expect((await store(NEW_LEAD, NOW + 1000)).confirmationQueued).toBe(false);
  });

  it('caps test and real leads in separate buckets, each once per day', async () => {
    await store({ ...NEW_LEAD, is_test: 1 }, NOW);
    expect(
      (await store({ ...NEW_LEAD, is_test: 0 }, NOW + 1)).confirmationQueued,
    ).toBe(true);
    expect(
      (await store({ ...NEW_LEAD, is_test: 1 }, NOW + 2)).confirmationQueued,
    ).toBe(false);
    expect(
      (await store({ ...NEW_LEAD, is_test: 0 }, NOW + 3)).confirmationQueued,
    ).toBe(false);
  });

  it('treats other addresses independently', async () => {
    await store(NEW_LEAD, NOW);
    const other = await store({ ...NEW_LEAD, email: 'grace@example.com' }, NOW);
    expect(other.confirmationQueued).toBe(true);
  });

  it('counts concurrent submissions once', async () => {
    const results = await Promise.all([
      store(NEW_LEAD, NOW),
      store(NEW_LEAD, NOW),
      store(NEW_LEAD, NOW),
    ]);
    expect(results.filter((r) => r.confirmationQueued)).toHaveLength(1);
  });

  it('rejects an invalid context and leaves no lead behind', async () => {
    await expect(
      store({ ...NEW_LEAD, context: '{not json' }, NOW),
    ).rejects.toThrow();
    expect(await count('leads')).toBe(0);
    expect(await count('email_outbox')).toBe(0);
  });

  it('stores context JSON and nulls', async () => {
    const { id } = await store(
      { ...NEW_LEAD, company: null, context: '{"a":1}', utm_source: 'x' },
      NOW,
    );
    const found = await getLead(DB, id);
    expect(found?.lead.company).toBeNull();
    expect(found?.lead.context).toBe('{"a":1}');
    expect(found?.lead.utm_source).toBe('x');
  });
});

describe('leadStatements confirmation modes', () => {
  async function kinds(mode: 'capped' | 'always' | 'none', now: number) {
    const { statements, emails } = leadStatements(DB, NEW_LEAD, now, mode);
    return emails(await DB.batch(statements)).map((email) => email.kind);
  }

  it("'always' queues a confirmation despite one within 24 hours", async () => {
    await store(NEW_LEAD, NOW);
    expect(await kinds('capped', NOW + 1)).toEqual(['owner']);
    expect(await kinds('always', NOW + 2)).toEqual(['owner', 'confirmation']);
  });

  it("'none' queues only the owner email", async () => {
    expect(await kinds('none', NOW)).toEqual(['owner']);
    expect(await count('email_outbox')).toBe(1);
  });

  it("'capped' behaves like storeLead", async () => {
    expect(await kinds('capped', NOW)).toEqual(['owner', 'confirmation']);
    expect(await kinds('capped', NOW + 1)).toEqual(['owner']);
  });
});

describe('purgeExpired and bookings', () => {
  async function booking(
    id: string,
    createdAt: number,
    leadId: string | null,
    status = 'failed',
  ) {
    await DB.prepare(
      `INSERT INTO bookings (id, created_at, slot_start, slot_end, day, status, email, channel, lead_id)
       VALUES (?1, ?2, ?2, ?2, '2027-01-12', ?4, 'x@example.com', 'web', ?3)`,
    )
      .bind(id, createdAt, leadId, status)
      .run();
  }

  async function ids(): Promise<string[]> {
    const { results } = await DB.prepare(
      'SELECT id FROM bookings ORDER BY id',
    ).all();
    return results.map((row) => String(row.id));
  }

  beforeEach(async () => {
    await DB.prepare('DELETE FROM bookings').run();
  });

  it('deletes unconfirmed attempts after 30 days and keeps younger ones', async () => {
    await booking('old', NOW - 31 * DAY, null, 'expired');
    await booking('young', NOW - 29 * DAY, null, 'expired');
    await purgeExpired(DB, NOW);
    expect(await ids()).toEqual(['young']);
  });

  it('deletes failed and unknown attempts after 30 days even with a lead, and keeps the lead', async () => {
    const failed = await store(NEW_LEAD, NOW - 100 * DAY);
    const unknown = await store(
      { ...NEW_LEAD, email: 'u@example.com' },
      NOW - 100 * DAY,
    );
    await booking('failed', NOW - 31 * DAY, failed.id, 'failed');
    await booking('unknown', NOW - 31 * DAY, unknown.id, 'unknown');
    await booking('recent-failed', NOW - 5 * DAY, failed.id, 'failed');
    await purgeExpired(DB, NOW);
    expect(await ids()).toEqual(['recent-failed']);
    expect(await count('leads')).toBe(2);
  });

  it('keeps a confirmed booking until its lead goes, then deletes it with the lead', async () => {
    const linked = await store(NEW_LEAD, NOW - 100 * DAY);
    await booking('linked', NOW - 100 * DAY, linked.id, 'confirmed');
    await purgeExpired(DB, NOW);
    expect(await ids()).toEqual(['linked']);
    const old = await store(
      { ...NEW_LEAD, email: 'old@example.com' },
      NOW - 731 * DAY,
    );
    await booking('old-linked', NOW - 731 * DAY, old.id, 'confirmed');
    expect(await purgeExpired(DB, NOW)).toBe(1);
    expect(await ids()).toEqual(['linked']);
  });
});

describe('purgeExpired', () => {
  it('deletes leads older than 730 days with their outbox rows', async () => {
    const old = await store(NEW_LEAD, NOW - 731 * DAY);
    const recent = await store(
      { ...NEW_LEAD, email: 'grace@example.com' },
      NOW - 729 * DAY,
    );
    expect(await purgeExpired(DB, NOW)).toBe(1);
    expect(await getLead(DB, old.id)).toBeNull();
    expect((await getLead(DB, recent.id))?.emails).toHaveLength(2);
    expect(await count('email_outbox')).toBe(2);
  });
});

describe('outbox state', () => {
  it('lists due rows with their lead, oldest first, up to the limit', async () => {
    const a = await store(NEW_LEAD, NOW);
    await store({ ...NEW_LEAD, email: 'b@example.com' }, NOW + 1);
    expect(await due(NOW - 1, 10)).toEqual([]);
    const first = await due(NOW, 10);
    expect(first).toHaveLength(2);
    expect(first.every((e) => e.lead.id === a.id)).toBe(true);
    expect(await due(NOW + 1, 3)).toHaveLength(3);
    expect(await due(NOW + 1, 10)).toHaveLength(4);
  });

  it('reports a row that fails validation instead of throwing', async () => {
    const good = await store(NEW_LEAD, NOW);
    const bad = await store({ ...NEW_LEAD, email: 'bad@example.com' }, NOW);
    await DB.prepare("UPDATE leads SET created_at = 'oops' WHERE id = ?1")
      .bind(bad.id)
      .run();
    const result = await dueEmails(DB, NOW, 10);
    expect(result.due.map((e) => e.lead.id)).toEqual([good.id, good.id]);
    expect(result.invalid).toHaveLength(2);
    await markDead(DB, result.invalid, 'invalid_row');
    expect((await dueEmails(DB, NOW, 10)).invalid).toEqual([]);
    const { results } = await DB.prepare(
      'SELECT status, last_error FROM email_outbox WHERE lead_id = ?1',
    )
      .bind(bad.id)
      .all();
    expect(results).toEqual([
      { status: 'dead', last_error: 'invalid_row' },
      { status: 'dead', last_error: 'invalid_row' },
    ]);
  });

  it('defers an email without consuming its attempt', async () => {
    await store(NEW_LEAD, NOW);
    const [email] = await due(NOW, 1);
    if (!email) throw new Error('no due email');
    await claimEmail(DB, email, NOW);
    await deferEmail(DB, email.outboxId, NOW + 600_000, 'resend 429 x');
    const row = await DB.prepare(
      'SELECT status, attempts, next_attempt_at, last_error FROM email_outbox WHERE id = ?1',
    )
      .bind(email.outboxId)
      .first();
    expect(row).toEqual({
      status: 'pending',
      attempts: 0,
      next_attempt_at: NOW + 600_000,
      last_error: 'resend 429 x',
    });
  });

  it('claims once and schedules the next attempt', async () => {
    await store(NEW_LEAD, NOW);
    const [email] = await due(NOW, 1);
    if (!email) throw new Error('no due email');
    expect(await claimEmail(DB, email, NOW)).toBe(true);
    expect(await claimEmail(DB, email, NOW)).toBe(false);
    const row = await DB.prepare(
      'SELECT attempts, next_attempt_at FROM email_outbox WHERE id = ?1',
    )
      .bind(email.outboxId)
      .first();
    expect(row).toEqual({ attempts: 1, next_attempt_at: NOW + 600_000 });
  });

  it('marks sent with the provider id and clears the error', async () => {
    await store(NEW_LEAD, NOW);
    const [email] = await due(NOW, 1);
    if (!email) throw new Error('no due email');
    await markFailed(DB, email.outboxId, 'network');
    await markSent(DB, email.outboxId, NOW + 5, 'em_1');
    const row = await DB.prepare('SELECT * FROM email_outbox WHERE id = ?1')
      .bind(email.outboxId)
      .first();
    expect(row).toMatchObject({
      status: 'sent',
      sent_at: NOW + 5,
      provider_id: 'em_1',
      last_error: null,
    });
  });

  it('turns the sixth failed attempt into dead', async () => {
    await store(NEW_LEAD, NOW);
    const [email] = await due(NOW, 1);
    if (!email) throw new Error('no due email');
    await DB.prepare('UPDATE email_outbox SET attempts = 5 WHERE id = ?1')
      .bind(email.outboxId)
      .run();
    expect(await markFailed(DB, email.outboxId, 'x')).toBe('failed');
    await DB.prepare('UPDATE email_outbox SET attempts = 6 WHERE id = ?1')
      .bind(email.outboxId)
      .run();
    expect(await markFailed(DB, email.outboxId, 'x')).toBe('dead');
    expect(await due(NOW + 365 * DAY, 10)).toHaveLength(1);
  });

  it('follows the backoff table', () => {
    expect([1, 2, 3, 4, 5, 6].map(backoffMs)).toEqual([
      600_000, 1_800_000, 3_600_000, 10_800_000, 21_600_000, 0,
    ]);
  });
});

describe('listing', () => {
  it('lists newest first with email statuses and counts in one go', async () => {
    const first = await store(NEW_LEAD, NOW);
    const second = await store(
      { ...NEW_LEAD, email: 'b@example.com', is_test: 1 },
      NOW + 10,
    );
    const { leads, counts } = await leadsOverview(DB, 100);
    expect(leads.map((r) => r.id)).toEqual([second.id, first.id]);
    expect(leads[0]).toMatchObject({
      owner_email_status: 'pending',
      confirmation_status: 'pending',
      is_test: 1,
    });
    expect(leads[0]).not.toHaveProperty('message');
    expect((await leadsOverview(DB, 1)).leads).toHaveLength(1);
    await DB.prepare(
      "UPDATE email_outbox SET status = 'dead' WHERE lead_id = ?1 AND kind = 'owner'",
    )
      .bind(first.id)
      .run();
    expect((await leadsOverview(DB, 100)).counts).toEqual({
      total: 2,
      test: 1,
      failed: 0,
      dead: 1,
      dead_owner: 1,
    });
    expect(await deadOwnerEmails(DB, 20)).toMatchObject({ count: 1 });
    expect(counts.total).toBe(2);
  });

  it('exports every column and flags truncation', async () => {
    await store(NEW_LEAD, NOW);
    await store({ ...NEW_LEAD, email: 'b@example.com' }, NOW + 10);
    await store({ ...NEW_LEAD, email: 'c@example.com' }, NOW + 20);
    const all = await exportLeads(DB, 3);
    expect(all.truncated).toBe(false);
    expect(all.leads).toHaveLength(3);
    expect(all.leads[0]).toMatchObject({ message: NEW_LEAD.message });
    const capped = await exportLeads(DB, 2);
    expect(capped.truncated).toBe(true);
    expect(capped.leads).toHaveLength(2);
  });

  it('returns null for an unknown lead', async () => {
    expect(await getLead(DB, crypto.randomUUID())).toBeNull();
  });
});
