import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { type TurnstileCheck, verifyTurnstile } from '@/server/turnstile';

const fetchMock = vi.fn<typeof fetch>();
const NOW = Date.UTC(2027, 0, 4, 8, 0);
const ISSUED = new Date(NOW - 10_000).toISOString();

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status });
}

function pass(overrides: Record<string, unknown> = {}) {
  return {
    success: true,
    action: 'book-page',
    hostname: 'zenetlabs.com',
    challenge_ts: ISSUED,
    ...overrides,
  };
}

function check(overrides: Partial<TurnstileCheck> = {}) {
  return verifyTurnstile({
    token: 'token',
    action: 'book-page',
    hostname: 'zenetlabs.com',
    secret: 'ts_secret',
    remoteIp: '203.0.113.7',
    fetch: fetchMock,
    now: NOW,
    testingKeys: false,
    ...overrides,
  });
}

function bodies(): Record<string, unknown>[] {
  return fetchMock.mock.calls.map(([, init]) => JSON.parse(String(init?.body)));
}

beforeEach(() => {
  fetchMock.mockReset();
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => vi.restoreAllMocks());

describe('verifyTurnstile', () => {
  it('passes a token for this action, this exact host and a recent challenge', async () => {
    fetchMock.mockResolvedValueOnce(json(pass()));
    expect(await check()).toBeNull();
  });

  it.each([
    ['action', 'another surface', { action: 'book-chat' }],
    ['action', 'the old shared action', { action: 'book' }],
    ['action', 'a missing action', { action: undefined }],
    ['hostname', 'a foreign host', { hostname: 'evil.example' }],
    ['hostname', 'a parent of the host', { hostname: 'www.zenetlabs.com' }],
    [
      'hostname',
      'another preview host',
      { hostname: 'abc-prod-zenet-web.zenetlabs.workers.dev' },
    ],
    [
      'age',
      'a challenge older than 300 s',
      {
        challenge_ts: new Date(NOW - 301_000).toISOString(),
      },
    ],
    [
      'age',
      'a challenge from the future',
      {
        challenge_ts: new Date(NOW + 31_000).toISOString(),
      },
    ],
    ['age', 'no challenge time', { challenge_ts: undefined }],
    ['invalid', 'success false', { success: false }],
    [
      'duplicate',
      'a replayed token',
      {
        success: false,
        'error-codes': ['timeout-or-duplicate'],
      },
    ],
  ])('rejects with %s for %s', async (reason, _label, overrides) => {
    fetchMock.mockResolvedValueOnce(json(pass(overrides)));
    expect(await check()).toBe(reason);
  });

  it('accepts a challenge a little ahead of our clock', async () => {
    fetchMock.mockResolvedValueOnce(
      json(pass({ challenge_ts: new Date(NOW + 20_000).toISOString() })),
    );
    expect(await check()).toBeNull();
  });

  it('accepts a testing-key result only where the config allows it', async () => {
    const testing = {
      success: true,
      hostname: 'example.com',
      action: 'test',
      metadata: { result_with_testing_key: true },
    };
    fetchMock.mockResolvedValueOnce(json(testing));
    expect(await check()).toBe('invalid');
    fetchMock.mockResolvedValueOnce(json(testing));
    expect(await check({ testingKeys: true })).toBeNull();
  });

  it('checks the hostname of the request, preview hosts included', async () => {
    const preview = 'abc123-prod-zenet-web.zenetlabs.workers.dev';
    fetchMock.mockResolvedValueOnce(json(pass({ hostname: preview })));
    expect(await check({ hostname: preview })).toBeNull();
  });

  it('retries once with the same idempotency key on a network error, a 5xx or internal-error', async () => {
    for (const first of [
      () => Promise.reject(new TypeError('network')),
      async () => json({}, 502),
      async () => json({ success: false, 'error-codes': ['internal-error'] }),
    ]) {
      fetchMock.mockReset();
      fetchMock.mockImplementationOnce(first);
      fetchMock.mockResolvedValueOnce(json(pass()));
      expect(await check()).toBeNull();
      const [one, two] = bodies();
      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(typeof one?.idempotency_key).toBe('string');
      expect(two?.idempotency_key).toBe(one?.idempotency_key);
    }
  });

  it('gives up as a network failure after the one retry', async () => {
    fetchMock.mockRejectedValue(new DOMException('timeout', 'TimeoutError'));
    expect(await check()).toBe('network');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('never retries a definite answer', async () => {
    fetchMock.mockResolvedValueOnce(
      json({ success: false, 'error-codes': ['timeout-or-duplicate'] }),
    );
    expect(await check()).toBe('duplicate');
    fetchMock.mockResolvedValueOnce(json({ success: true }, 400));
    expect(await check()).toBe('invalid');
    fetchMock.mockResolvedValueOnce(new Response('<html>', { status: 200 }));
    expect(await check()).toBe('invalid');
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('uses a fresh idempotency key for each verification', async () => {
    fetchMock.mockResolvedValue(json(pass()));
    await check();
    await check();
    const [one, two] = bodies();
    expect(one?.idempotency_key).not.toBe(two?.idempotency_key);
  });

  it('posts the secret, token and remote ip, and logs the reason, never the token', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    fetchMock.mockResolvedValueOnce(json(pass({ action: 'lead' })));
    await check({ token: 'secret-token-value' });
    const [url] = fetchMock.mock.calls[0] ?? [];
    expect(url).toBe(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
    );
    expect(bodies()[0]).toMatchObject({
      secret: 'ts_secret',
      response: 'secret-token-value',
      remoteip: '203.0.113.7',
    });
    expect(warn).toHaveBeenCalledWith('turnstile: rejected', {
      reason: 'action',
    });
    expect(JSON.stringify(warn.mock.calls)).not.toContain('secret-token');
  });

  it('omits the remote ip when there is none', async () => {
    fetchMock.mockResolvedValueOnce(json({ success: false }));
    await check({ remoteIp: null });
    expect(bodies()[0]).not.toHaveProperty('remoteip');
  });
});
