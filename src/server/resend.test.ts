import { beforeEach, describe, expect, it, vi } from 'vitest';
import { type OutgoingEmail, sendEmail } from '@/server/resend';

const fetchMock = vi.fn<typeof fetch>();

const MESSAGE: OutgoingEmail = {
  from: 'Zenet Labs <noreply@zenetlabs.com>',
  to: 'owner@example.com',
  replyTo: 'ada@example.com',
  subject: 'Subject',
  text: 'Body',
};

function send() {
  return sendEmail({
    apiKey: 're_test',
    baseUrl: 'https://api.resend.test',
    idempotencyKey: 'lead-email/out-1',
    message: MESSAGE,
    fetch: fetchMock,
  });
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status });
}

beforeEach(() => {
  fetchMock.mockReset();
  vi.restoreAllMocks();
});

describe('sendEmail', () => {
  it('posts the exact request with an idempotency key', async () => {
    fetchMock.mockResolvedValueOnce(json({ id: 'em_1' }));
    expect(await send()).toEqual({ ok: true, id: 'em_1' });
    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(url).toBe('https://api.resend.test/emails');
    expect(init?.method).toBe('POST');
    const headers = new Headers(init?.headers);
    expect(headers.get('Authorization')).toBe('Bearer re_test');
    expect(headers.get('Content-Type')).toBe('application/json');
    expect(headers.get('Idempotency-Key')).toBe('lead-email/out-1');
    expect(JSON.parse(String(init?.body))).toEqual({
      from: 'Zenet Labs <noreply@zenetlabs.com>',
      to: ['owner@example.com'],
      reply_to: ['ada@example.com'],
      subject: 'Subject',
      text: 'Body',
    });
  });

  it('treats a replayed 2xx as sent', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ id: 'em_1' }), {
        status: 200,
        headers: { 'idempotent-replayed': 'true' },
      }),
    );
    expect(await send()).toEqual({ ok: true, id: 'em_1' });
  });

  it('keeps a null id when a 2xx body has none', async () => {
    fetchMock.mockResolvedValueOnce(new Response('', { status: 200 }));
    expect(await send()).toEqual({ ok: true, id: null });
  });

  it('treats 409 invalid_idempotent_request as a failure, never as sent', async () => {
    fetchMock.mockResolvedValueOnce(
      json(
        { name: 'invalid_idempotent_request', message: 'ada@example.com' },
        409,
      ),
    );
    expect(await send()).toEqual({
      ok: false,
      error: 'resend 409 invalid_idempotent_request',
      throttled: false,
    });
  });

  it.each([
    [
      409,
      { name: 'concurrent_idempotent_requests' },
      'resend 409 concurrent_idempotent_requests',
    ],
    [429, { name: 'rate_limit_exceeded' }, 'resend 429 rate_limit_exceeded'],
    [
      500,
      { name: 'internal_server_error' },
      'resend 500 internal_server_error',
    ],
    [422, { name: 'validation_error' }, 'resend 422 validation_error'],
    [401, { name: 'missing_api_key' }, 'resend 401 missing_api_key'],
  ])('maps %i to a failure code', async (status, body, expected) => {
    fetchMock.mockResolvedValueOnce(json(body, status));
    expect(await send()).toEqual({
      ok: false,
      error: expected,
      throttled: status === 429,
    });
  });

  it('never copies the message or an odd name into the error', async () => {
    fetchMock.mockResolvedValueOnce(
      json({ name: 'bad ada@example.com', message: 'ada@example.com' }, 422),
    );
    const result = await send();
    expect(result).toEqual({
      ok: false,
      error: 'resend 422 unknown',
      throttled: false,
    });
  });

  it('maps a non-JSON error body to unknown', async () => {
    fetchMock.mockResolvedValueOnce(new Response('<html>', { status: 502 }));
    expect(await send()).toEqual({
      ok: false,
      error: 'resend 502 unknown',
      throttled: false,
    });
  });

  it('maps a network failure and a timeout', async () => {
    fetchMock.mockRejectedValueOnce(
      new TypeError('connect ECONNREFUSED ada@example.com'),
    );
    expect(await send()).toEqual({
      ok: false,
      error: 'network',
      throttled: false,
    });
    fetchMock.mockRejectedValueOnce(new DOMException('slow', 'TimeoutError'));
    expect(await send()).toEqual({
      ok: false,
      error: 'timeout',
      throttled: false,
    });
  });
});
