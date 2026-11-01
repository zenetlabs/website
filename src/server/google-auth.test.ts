// @vitest-environment node
import { decodeProtectedHeader, jwtVerify } from 'jose';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  accessToken,
  clearTokenCache,
  GOOGLE_SCOPES,
} from '@/server/google-auth';
import { signingCredentials } from '../../test/google';

const TOKEN_URL = 'https://oauth.test/token';
const NOW = Date.UTC(2026, 10, 1, 12);

function ok(token = 'ya29.secret-token') {
  return Response.json({ access_token: token, expires_in: 3600 });
}

beforeEach(() => clearTokenCache());
afterEach(() => vi.restoreAllMocks());

describe('accessToken', () => {
  it('exchanges a signed JWT with the documented claims', async () => {
    const { credentials, publicKey } = await signingCredentials();
    const send = vi.fn<typeof fetch>(async () => ok());
    const result = await accessToken({
      credentials,
      tokenUrl: TOKEN_URL,
      fetch: send,
      now: NOW,
    });

    expect(result).toEqual({ ok: true, token: 'ya29.secret-token' });
    const [url, init] = send.mock.calls[0] ?? [];
    expect(url).toBe(TOKEN_URL);
    expect(init?.method).toBe('POST');
    const form = new URLSearchParams(String(init?.body));
    expect(form.get('grant_type')).toBe(
      'urn:ietf:params:oauth:grant-type:jwt-bearer',
    );
    const assertion = form.get('assertion') ?? '';
    expect(decodeProtectedHeader(assertion)).toEqual({
      alg: 'RS256',
      typ: 'JWT',
      kid: credentials.private_key_id,
    });
    const { payload } = await jwtVerify(assertion, publicKey, {
      issuer: credentials.client_email,
      subject: credentials.subject,
      audience: TOKEN_URL,
      currentDate: new Date(NOW),
    });
    expect(payload.scope).toBe(GOOGLE_SCOPES.join(' '));
    expect(GOOGLE_SCOPES.join(' ')).not.toContain(',');
    expect((payload.exp ?? 0) - (payload.iat ?? 0)).toBe(3600);
  });

  it('reuses the token inside its lifetime and refreshes five minutes early', async () => {
    const { credentials } = await signingCredentials();
    const send = vi.fn<typeof fetch>(async () => ok());
    const args = { credentials, tokenUrl: TOKEN_URL, fetch: send };
    await accessToken({ ...args, now: NOW });
    await accessToken({ ...args, now: NOW + 3_000_000 });
    expect(send).toHaveBeenCalledTimes(1);
    await accessToken({ ...args, now: NOW + 3_301_000 });
    expect(send).toHaveBeenCalledTimes(2);
  });

  it('shares one exchange between concurrent callers', async () => {
    const { credentials } = await signingCredentials();
    let release: () => void = () => {};
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const send = vi.fn<typeof fetch>(async () => {
      await gate;
      return ok();
    });
    const args = { credentials, tokenUrl: TOKEN_URL, fetch: send, now: NOW };
    const calls = Promise.all([
      accessToken(args),
      accessToken(args),
      accessToken(args),
    ]);
    release();
    const results = await calls;
    expect(send).toHaveBeenCalledTimes(1);
    expect(results.every((result) => result.ok)).toBe(true);
  });

  it('starts a fresh exchange when the shared one never settled (a cancelled request)', async () => {
    const { credentials } = await signingCredentials();
    const hung = vi.fn<typeof fetch>(() => new Promise<Response>(() => {}));
    const args = { credentials, tokenUrl: TOKEN_URL, now: NOW };
    void accessToken({ ...args, fetch: hung });
    await vi.waitFor(() => expect(hung).toHaveBeenCalledTimes(1));
    const later = vi.fn<typeof fetch>(async () => ok('fresh'));
    // Inside the timeout window the hung exchange is still shared.
    const sharing = accessToken({ ...args, fetch: later, now: NOW + 5_000 });
    expect(later).not.toHaveBeenCalled();
    void sharing;
    // Past timeout plus margin it is presumed dead and replaced.
    await expect(
      accessToken({ ...args, fetch: later, now: NOW + 7_001 }),
    ).resolves.toEqual({ ok: true, token: 'fresh' });
    expect(later).toHaveBeenCalledTimes(1);
  });

  it('remembers a failure for the failure TTL, then tries again', async () => {
    const { credentials } = await signingCredentials();
    const send = vi.fn<typeof fetch>(async () =>
      Response.json({ error: 'unauthorized_client' }, { status: 400 }),
    );
    const args = {
      credentials,
      tokenUrl: TOKEN_URL,
      fetch: send,
      failureTtlMs: 45_000,
    };
    const first = await accessToken({ ...args, now: NOW });
    const second = await accessToken({ ...args, now: NOW + 44_000 });
    expect(second).toEqual(first);
    expect(send).toHaveBeenCalledTimes(1);
    send.mockImplementation(async () => ok());
    await expect(
      accessToken({ ...args, now: NOW + 46_000 }),
    ).resolves.toMatchObject({ ok: true });
    expect(send).toHaveBeenCalledTimes(2);
  });

  it('does not remember failures by default', async () => {
    const { credentials } = await signingCredentials();
    const send = vi.fn<typeof fetch>(
      async () => new Response('x', { status: 500 }),
    );
    const args = { credentials, tokenUrl: TOKEN_URL, fetch: send, now: NOW };
    await accessToken(args);
    await accessToken(args);
    expect(send).toHaveBeenCalledTimes(2);
  });

  it('keeps separate tokens per account and subject', async () => {
    const first = await signingCredentials();
    const second = await signingCredentials();
    const send = vi.fn<typeof fetch>(async () => ok());
    await accessToken({
      credentials: first.credentials,
      tokenUrl: TOKEN_URL,
      fetch: send,
      now: NOW,
    });
    await accessToken({
      credentials: second.credentials,
      tokenUrl: TOKEN_URL,
      fetch: send,
      now: NOW,
    });
    expect(send).toHaveBeenCalledTimes(2);
  });

  it.each([
    ['unauthorized_client', 400, 'auth_unauthorized_client'],
    ['access_denied', 400, 'auth_access_denied'],
    ['invalid_grant', 400, 'auth_invalid_grant'],
    ['something_else', 400, 'auth_http_400'],
  ])('maps Google error %s to %s', async (error, status, code) => {
    const { credentials } = await signingCredentials();
    const send = async () => Response.json({ error }, { status });
    await expect(
      accessToken({ credentials, tokenUrl: TOKEN_URL, fetch: send, now: NOW }),
    ).resolves.toEqual({ ok: false, code });
  });

  it('maps a 500, a network error and a timeout', async () => {
    const { credentials } = await signingCredentials();
    const run = (send: typeof fetch) =>
      accessToken({ credentials, tokenUrl: TOKEN_URL, fetch: send, now: NOW });
    await expect(
      run(async () => new Response('x', { status: 500 })),
    ).resolves.toEqual({
      ok: false,
      code: 'auth_http_500',
    });
    await expect(
      run(async () => {
        throw new TypeError('offline');
      }),
    ).resolves.toEqual({ ok: false, code: 'network' });
    await expect(
      run(async () => {
        throw new DOMException('timed out', 'TimeoutError');
      }),
    ).resolves.toEqual({ ok: false, code: 'timeout' });
  });

  it('rejects a malformed success body and an unusable key', async () => {
    const { credentials } = await signingCredentials();
    await expect(
      accessToken({
        credentials,
        tokenUrl: TOKEN_URL,
        fetch: async () => Response.json({}),
        now: NOW,
      }),
    ).resolves.toEqual({ ok: false, code: 'auth_response' });
    const bad = {
      ...credentials,
      private_key_id: 'other',
      private_key:
        '-----BEGIN PRIVATE KEY-----\nnope\n-----END PRIVATE KEY-----',
    };
    await expect(
      accessToken({
        credentials: bad,
        tokenUrl: TOKEN_URL,
        fetch: async () => ok(),
        now: NOW,
      }),
    ).resolves.toEqual({ ok: false, code: 'auth_key' });
  });

  it('never logs the key or the token', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    const out = vi.spyOn(console, 'log').mockImplementation(() => {});
    const { credentials } = await signingCredentials();
    await accessToken({
      credentials,
      tokenUrl: TOKEN_URL,
      fetch: async () => ok(),
      now: NOW,
    });
    await accessToken({
      credentials,
      tokenUrl: TOKEN_URL,
      fetch: async () => new Response('x', { status: 500 }),
      now: NOW + 4_000_000,
    });
    expect(log).not.toHaveBeenCalled();
    expect(out).not.toHaveBeenCalled();
  });
});
