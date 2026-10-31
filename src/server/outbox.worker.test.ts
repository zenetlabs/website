import { env } from 'cloudflare:workers';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { storeLead } from '@/server/lead-store';
import { deliver, deliverDue, type OutboxDeps } from '@/server/outbox';
import type { ServerConfig, SiteConfig } from '../../site.config';
import { NEW_LEAD } from '../../test/leads';

const NOW = Date.UTC(2026, 9, 31, 12, 0, 0);
const MIN = 60_000;
const { DB } = env;

const SERVER: ServerConfig = {
  leads: { notifyTo: 'owner@example.com' },
  resendBaseUrl: 'https://resend.test',
  access: null,
};
const SITE: SiteConfig = {
  url: 'https://zenetlabs.com',
  turnstileSiteKey: 'k',
  cfBeaconToken: '',
};

const fetchMock = vi.fn<typeof fetch>();

function deps(overrides: Partial<OutboxDeps> = {}): OutboxDeps {
  return {
    db: DB,
    resendKey: async () => 're_test',
    fetch: fetchMock,
    server: SERVER,
    site: SITE,
    ...overrides,
  };
}

function ok(id = 'em_1'): Response {
  return new Response(JSON.stringify({ id }), { status: 200 });
}

function fail(status = 500): Response {
  return new Response(JSON.stringify({ name: 'internal_server_error' }), {
    status,
  });
}

type OutboxState = {
  kind: string;
  status: string;
  attempts: number;
  next_attempt_at: number;
  last_error: string | null;
  provider_id: string | null;
  sent_at: number | null;
};

async function states(leadId: string): Promise<OutboxState[]> {
  const { results } = await DB.prepare(
    'SELECT kind, status, attempts, next_attempt_at, last_error, provider_id, sent_at FROM email_outbox WHERE lead_id = ?1 ORDER BY kind',
  )
    .bind(leadId)
    .all<OutboxState>();
  return results;
}

function sentBodies() {
  return fetchMock.mock.calls.map(([, init]) => ({
    key: new Headers(init?.headers).get('Idempotency-Key'),
    body: String(init?.body),
  }));
}

beforeEach(async () => {
  fetchMock.mockReset();
  await DB.prepare('DELETE FROM leads').run();
});

afterEach(() => vi.restoreAllMocks());

async function store(lead: Parameters<typeof storeLead>[1], now: number) {
  const emails = await storeLead(DB, lead, now);
  return { id: emails[0]?.lead.id ?? '', emails };
}

describe('deliver', () => {
  it('sends both emails and records the provider ids', async () => {
    const { id, emails } = await store(NEW_LEAD, NOW);
    fetchMock
      .mockResolvedValueOnce(ok('em_a'))
      .mockResolvedValueOnce(ok('em_b'));
    await deliver(deps(), emails, NOW);
    const rows = await states(id);
    expect(rows.map((r) => [r.kind, r.status, r.attempts, r.sent_at])).toEqual([
      ['confirmation', 'sent', 1, NOW],
      ['owner', 'sent', 1, NOW],
    ]);
    expect(rows.map((r) => r.provider_id).sort()).toEqual(['em_a', 'em_b']);
    const recipients = fetchMock.mock.calls
      .map(([, init]) => JSON.parse(String(init?.body)).to[0])
      .sort();
    expect(recipients).toEqual(['ada@example.com', 'owner@example.com']);
  });

  it('only delivers the emails it is given', async () => {
    const a = await store(NEW_LEAD, NOW);
    const b = await store({ ...NEW_LEAD, email: 'b@example.com' }, NOW);
    fetchMock.mockImplementation(async () => ok());
    await deliver(deps(), a.emails, NOW);
    expect((await states(b.id)).every((r) => r.status === 'pending')).toBe(
      true,
    );
  });

  it('reads the Resend key once per run, and not at all without emails', async () => {
    const resendKey = vi.fn(async () => 're_test');
    const { emails } = await store(NEW_LEAD, NOW);
    fetchMock.mockImplementation(async () => ok());
    await deliver(deps({ resendKey }), emails, NOW);
    expect(resendKey).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    resendKey.mockClear();
    await deliver(deps({ resendKey }), [], NOW);
    await deliverDue(deps({ resendKey }), NOW);
    expect(resendKey).not.toHaveBeenCalled();
  });

  it('does not read the key when every claim is lost', async () => {
    const resendKey = vi.fn(async () => 're_test');
    const { emails } = await store(NEW_LEAD, NOW);
    await DB.prepare('UPDATE email_outbox SET attempts = 1').run();
    await deliver(deps({ resendKey }), emails, NOW);
    expect(resendKey).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('failures and backoff', () => {
  it('fails, then retries on the 10 min, 30 min, 1 h, 3 h and 6 h table, and dies on the sixth', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const { id } = await store(NEW_LEAD, NOW);
    await DB.prepare(
      "DELETE FROM email_outbox WHERE kind = 'confirmation'",
    ).run();
    fetchMock.mockImplementation(async () => fail());

    const waits = [10, 30, 60, 180, 360];
    let now = NOW;
    for (const [index, wait] of waits.entries()) {
      await deliverDue(deps(), now);
      const [row] = await states(id);
      expect(row).toMatchObject({
        status: 'failed',
        attempts: index + 1,
        next_attempt_at: now + wait * MIN,
        last_error: 'resend 500 internal_server_error',
      });
      await deliverDue(deps(), now + wait * MIN - 1);
      expect((await states(id))[0]?.attempts).toBe(index + 1);
      now += wait * MIN;
    }
    await deliverDue(deps(), now);
    expect((await states(id))[0]).toMatchObject({
      status: 'dead',
      attempts: 6,
    });
    const callsAtDeath = fetchMock.mock.calls.length;
    await deliverDue(deps(), now + 365 * 24 * 60 * MIN);
    expect(fetchMock.mock.calls).toHaveLength(callsAtDeath);
    expect(now - NOW).toBeLessThan(11 * 60 * MIN);
  });

  it('logs ids and codes only, never the address or the name', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { id } = await store(NEW_LEAD, NOW);
    await DB.prepare('UPDATE email_outbox SET attempts = 5').run();
    fetchMock.mockImplementation(
      async () =>
        new Response(
          JSON.stringify({
            name: 'validation_error',
            message: 'bad ada@example.com Ada',
          }),
          { status: 422 },
        ),
    );
    await deliverDue(deps(), NOW);
    const logged = JSON.stringify(error.mock.calls);
    expect(logged).toContain('lead-email: dead');
    expect(logged).toContain(id);
    expect(logged).toContain('resend 422 validation_error');
    expect(logged).not.toContain('@');
    expect(logged).not.toContain('Ada');
    expect(logged).not.toContain('Lovelace');
  });

  it('records secret when the Resend key cannot be read, then recovers', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const { id } = await store(NEW_LEAD, NOW);
    await deliverDue(
      deps({
        resendKey: async () => {
          throw new Error('store down');
        },
      }),
      NOW,
    );
    expect(fetchMock).not.toHaveBeenCalled();
    expect((await states(id)).map((r) => [r.status, r.last_error])).toEqual([
      ['failed', 'secret'],
      ['failed', 'secret'],
    ]);
    fetchMock.mockImplementation(async () => ok());
    await deliverDue(deps(), NOW + 10 * MIN);
    expect((await states(id)).map((r) => r.status)).toEqual(['sent', 'sent']);
  });

  it('survives one failing email without losing the other', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const { id } = await store(NEW_LEAD, NOW);
    fetchMock.mockImplementation(async (_url, init) =>
      String(init?.body).includes('"to":["ada@example.com"]') ? fail() : ok(),
    );
    await deliverDue(deps(), NOW);
    expect((await states(id)).map((r) => [r.kind, r.status])).toEqual([
      ['confirmation', 'failed'],
      ['owner', 'sent'],
    ]);
  });
});

describe('idempotency and the claim', () => {
  it('keeps the key and the payload byte-identical across attempts', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    await store(NEW_LEAD, NOW);
    fetchMock
      .mockImplementationOnce(async () => fail())
      .mockImplementationOnce(async () => fail())
      .mockImplementation(async () => ok());
    await deliverDue(deps(), NOW);
    await deliverDue(deps(), NOW + 10 * MIN);
    const all = sentBodies();
    expect(all).toHaveLength(4);
    const keys = new Set(all.map((call) => call.key));
    expect(keys.size).toBe(2);
    for (const key of keys) {
      expect(key).toMatch(/^lead-email\/[0-9a-f-]{36}\/[0-9a-f]{12}$/);
      const bodies = all.filter((call) => call.key === key).map((c) => c.body);
      expect(bodies).toHaveLength(2);
      expect(new Set(bodies).size).toBe(1);
    }
  });

  it('sends once when two deliveries race on one row', async () => {
    const { id, emails } = await store(NEW_LEAD, NOW);
    const owner = emails.filter((email) => email.kind === 'owner');
    fetchMock.mockImplementation(async () => ok());
    await Promise.all([
      deliver(deps(), owner, NOW),
      deliver(deps(), owner, NOW),
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect((await states(id)).find((r) => r.kind === 'owner')).toMatchObject({
      status: 'sent',
      attempts: 1,
    });
  });

  it.each([
    ['invalid_idempotent_request', 'resend 409 invalid_idempotent_request'],
    [
      'concurrent_idempotent_requests',
      'resend 409 concurrent_idempotent_requests',
    ],
  ])(
    'treats a 409 %s as a failure to retry, never as sent',
    async (name, code) => {
      const error = vi.spyOn(console, 'error').mockImplementation(() => {});
      const { id } = await store(NEW_LEAD, NOW);
      fetchMock.mockImplementation(
        async () => new Response(JSON.stringify({ name }), { status: 409 }),
      );
      await deliverDue(deps(), NOW);
      expect((await states(id)).map((r) => [r.status, r.last_error])).toEqual([
        ['failed', code],
        ['failed', code],
      ]);
      expect(JSON.stringify(error.mock.calls)).toContain(code);
      expect((await states(id)).every((r) => r.provider_id === null)).toBe(
        true,
      );
    },
  );

  it('uses a new idempotency key when the rendered email changes', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    await store(NEW_LEAD, NOW);
    await DB.prepare(
      "DELETE FROM email_outbox WHERE kind = 'confirmation'",
    ).run();
    fetchMock
      .mockImplementationOnce(async () => fail())
      .mockImplementation(async () => ok());
    await deliverDue(deps(), NOW);
    await DB.prepare(
      "UPDATE leads SET message = 'A corrected message for you'",
    ).run();
    await deliverDue(deps(), NOW + 10 * MIN);
    const [first, second] = sentBodies();
    expect(first?.key?.split('/').slice(0, 2)).toEqual(
      second?.key?.split('/').slice(0, 2),
    );
    expect(first?.key).not.toBe(second?.key);
  });
});

describe('deliverDue', () => {
  it('takes only due rows, at most ten', async () => {
    for (let index = 0; index < 8; index += 1) {
      await store({ ...NEW_LEAD, email: `p${index}@example.com` }, NOW);
    }
    await storeLead(
      DB,
      { ...NEW_LEAD, email: 'later@example.com' },
      NOW + 5 * MIN,
    );
    fetchMock.mockImplementation(async () => ok());
    await deliverDue(deps(), NOW);
    expect(fetchMock).toHaveBeenCalledTimes(10);
    await deliverDue(deps(), NOW);
    expect(fetchMock).toHaveBeenCalledTimes(16);
    await deliverDue(deps(), NOW);
    expect(fetchMock).toHaveBeenCalledTimes(16);
    await deliverDue(deps(), NOW + 5 * MIN);
    expect(fetchMock).toHaveBeenCalledTimes(18);
  });

  it('defers on a Resend 429 without using an attempt, and stops the run', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const a = await store(NEW_LEAD, NOW);
    const b = await store({ ...NEW_LEAD, email: 'b@example.com' }, NOW + 1);
    fetchMock.mockImplementation(async () => fail(429));
    await deliverDue(deps(), NOW + 1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const rows = [...(await states(a.id)), ...(await states(b.id))];
    expect(rows.filter((r) => r.attempts === 0)).toHaveLength(4);
    const deferred = rows.filter((r) => r.last_error !== null);
    expect(deferred).toHaveLength(1);
    expect(deferred[0]).toMatchObject({
      status: 'pending',
      attempts: 0,
      next_attempt_at: NOW + 1 + 10 * MIN,
      last_error: 'resend 429 internal_server_error',
    });
    expect(JSON.stringify(error.mock.calls)).toContain('lead-email: throttled');

    fetchMock.mockReset().mockImplementation(async () => ok());
    await deliverDue(deps(), NOW + 1 + 10 * MIN);
    const after = [...(await states(a.id)), ...(await states(b.id))];
    expect(after.every((r) => r.status === 'sent')).toBe(true);
  });

  it('marks a row that fails validation dead by id and still sends the rest', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const good = await store(NEW_LEAD, NOW);
    const bad = await store({ ...NEW_LEAD, email: 'bad@example.com' }, NOW);
    await DB.prepare("UPDATE leads SET created_at = 'oops' WHERE id = ?1")
      .bind(bad.id)
      .run();
    fetchMock.mockImplementation(async () => ok());
    await deliverDue(deps(), NOW);
    expect((await states(good.id)).map((r) => r.status)).toEqual([
      'sent',
      'sent',
    ]);
    expect((await states(bad.id)).map((r) => [r.status, r.last_error])).toEqual(
      [
        ['dead', 'invalid_row'],
        ['dead', 'invalid_row'],
      ],
    );
    const logged = JSON.stringify(error.mock.calls);
    expect(logged).toContain('lead-email: invalid row');
    expect(logged).not.toContain('@');
  });
});
