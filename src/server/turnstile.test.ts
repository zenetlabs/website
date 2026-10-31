import { beforeEach, describe, expect, it, vi } from 'vitest';
import { verifyTurnstile } from '@/server/turnstile';

const fetchMock = vi.fn<typeof fetch>();

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status });
}

function check(remoteIp: string | null = '203.0.113.7') {
  return verifyTurnstile({
    token: 'token',
    action: 'lead',
    secret: 'ts_secret',
    remoteIp,
    fetch: fetchMock,
  });
}

beforeEach(() => fetchMock.mockReset());

describe('verifyTurnstile', () => {
  it.each([
    ['success is false', { success: false }],
    ['the action does not match', { success: true, action: 'login' }],
    ['the action is missing', { success: true, hostname: 'zenetlabs.com' }],
    [
      'the hostname is wrong',
      { success: true, action: 'lead', hostname: 'evil.example' },
    ],
    [
      'the hostname only ends like the preview domain',
      { success: true, action: 'lead', hostname: 'evilzenetlabs.workers.dev' },
    ],
    [
      'the action is the old contact action',
      { success: true, action: 'contact', hostname: 'zenetlabs.com' },
    ],
  ])('rejects when %s', async (_label, verdict) => {
    fetchMock.mockResolvedValueOnce(json(verdict));
    expect(await check()).toBe(false);
  });

  it.each([
    [
      'the testing key flag is set',
      {
        success: true,
        hostname: 'example.com',
        metadata: { result_with_testing_key: true },
      },
    ],
    [
      'the hostname is zenetlabs.com',
      { success: true, action: 'lead', hostname: 'zenetlabs.com' },
    ],
    [
      'the hostname is a workers.dev preview',
      {
        success: true,
        action: 'lead',
        hostname: 'abc123-prod-zenet-web.zenetlabs.workers.dev',
      },
    ],
  ])('accepts when %s', async (_label, verdict) => {
    fetchMock.mockResolvedValueOnce(json(verdict));
    expect(await check()).toBe(true);
  });

  it('rejects when the request times out', async () => {
    fetchMock.mockRejectedValueOnce(
      new DOMException('timeout', 'TimeoutError'),
    );
    expect(await check()).toBe(false);
  });

  it('rejects a non-2xx answer and a malformed body', async () => {
    fetchMock.mockResolvedValueOnce(json({ success: true }, 500));
    expect(await check()).toBe(false);
    fetchMock.mockResolvedValueOnce(new Response('<html>', { status: 200 }));
    expect(await check()).toBe(false);
  });

  it('posts the secret, token and remote ip to siteverify', async () => {
    fetchMock.mockResolvedValueOnce(
      json({ success: true, action: 'lead', hostname: 'zenetlabs.com' }),
    );
    await check();
    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(url).toBe(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
    );
    expect(JSON.parse(String(init?.body))).toEqual({
      secret: 'ts_secret',
      response: 'token',
      remoteip: '203.0.113.7',
    });
  });

  it('omits the remote ip when there is none', async () => {
    fetchMock.mockResolvedValueOnce(json({ success: false }));
    await check(null);
    const init = fetchMock.mock.calls[0]?.[1];
    expect(JSON.parse(String(init?.body))).not.toHaveProperty('remoteip');
  });
});
