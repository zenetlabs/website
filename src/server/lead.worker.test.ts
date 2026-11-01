import { env } from 'cloudflare:workers';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { LeadRequest } from '@/lib/lead-schema';
import { CONSENT_VERSION, handleLeadPost, type LeadDeps } from '@/server/lead';
import type { LeadRow } from '@/server/lead-store';
import type { ServerConfig, SiteConfig } from '../../site.config';

const { DB } = env;
const ORIGIN = 'https://zenetlabs.com';
const NOW = Date.UTC(2026, 9, 31, 12, 0, 0);

const SERVER: ServerConfig = {
  leads: { notifyTo: 'owner@example.com' },
  resendBaseUrl: 'https://resend.test',
  access: null,
};
const SITE: SiteConfig = {
  url: ORIGIN,
  turnstileSiteKey: 'k',
  cfBeaconToken: '',
  ga4Id: null,
  calculator: { published: false },
};

const BODY: LeadRequest = {
  source: 'form',
  locale: 'en',
  name: 'Ada Lovelace',
  email: 'Ada@Example.com',
  company: 'Analytical Engines',
  message: 'We would like to automate our inbox triage.',
  consent: true,
  turnstileToken: 'token',
  website: '',
  attribution: {
    landing: '/?utm_source=news&utm_medium=email&utm_campaign=r6&gclid=g1',
    referrer: 'https://example.org/post',
    page: '/services/ai-automation',
  },
};

const fetchMock = vi.fn<typeof fetch>();
const limit = vi.fn<LeadDeps['limiter']['limit']>();
const background: Promise<unknown>[] = [];
const waitUntil = vi.fn<(promise: Promise<unknown>) => void>((promise) => {
  background.push(promise);
});
const turnstileSecret = vi.fn<() => Promise<string>>();

function deps(overrides: Partial<LeadDeps> = {}): LeadDeps {
  return {
    db: DB,
    limiter: { limit },
    turnstileSecret,
    resendKey: async () => 're_test',
    fetch: fetchMock,
    waitUntil,
    now: () => NOW,
    server: SERVER,
    site: SITE,
    ...overrides,
  };
}

function post(
  body: unknown = BODY,
  {
    url = `${ORIGIN}/api/lead`,
    headers = {},
    raw,
  }: { url?: string; headers?: Record<string, string>; raw?: string } = {},
): Request {
  return new Request(url, {
    method: 'POST',
    headers: {
      Origin: new URL(url).origin,
      'Content-Type': 'application/json',
      'CF-Connecting-IP': '203.0.113.7',
      ...headers,
    },
    body: raw ?? JSON.stringify(body),
  });
}

function turnstileOk() {
  fetchMock.mockImplementation(async (input) =>
    String(input).includes('siteverify')
      ? Response.json({
          success: true,
          action: 'lead',
          hostname: 'zenetlabs.com',
        })
      : Response.json({ id: 'em_1' }),
  );
}

async function leads(): Promise<LeadRow[]> {
  const { results } = await DB.prepare('SELECT * FROM leads').all<LeadRow>();
  return results;
}

async function fail(response: Response, status: number, error: string) {
  expect(response.status).toBe(status);
  expect(response.headers.get('cache-control')).toBe('no-store');
  expect(await response.json()).toEqual({ ok: false, error });
  expect(await leads()).toEqual([]);
}

beforeEach(async () => {
  fetchMock.mockReset();
  limit.mockReset().mockResolvedValue({ success: true });
  waitUntil.mockClear();
  turnstileSecret.mockReset().mockResolvedValue('ts_secret');
  vi.restoreAllMocks();
  await DB.prepare('DELETE FROM leads').run();
});

afterEach(async () => {
  await Promise.all(background.splice(0));
});

describe('checks in contract order', () => {
  it('403 origin without or with a foreign Origin header', async () => {
    const missing = new Request(`${ORIGIN}/api/lead`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(BODY),
    });
    await fail(await handleLeadPost(missing, deps()), 403, 'origin');
    await fail(
      await handleLeadPost(
        post(BODY, { headers: { Origin: 'https://evil.example' } }),
        deps(),
      ),
      403,
      'origin',
    );
    expect(limit).not.toHaveBeenCalled();
  });

  it('415 for a non-JSON content type', async () => {
    const response = await handleLeadPost(
      post(BODY, { headers: { 'Content-Type': 'text/plain' } }),
      deps(),
    );
    await fail(response, 415, 'unsupported');
    await fail(
      await handleLeadPost(
        post(BODY, { headers: { 'Content-Type': 'application/jsonx' } }),
        deps(),
      ),
      415,
      'unsupported',
    );
  });

  it('accepts a charset on the JSON content type', async () => {
    turnstileOk();
    const response = await handleLeadPost(
      post(BODY, {
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
      }),
      deps(),
    );
    expect(response.status).toBe(200);
  });

  it('429 with Retry-After when the limiter says no, before the body is read', async () => {
    limit.mockResolvedValue({ success: false });
    const request = post(BODY);
    const response = await handleLeadPost(request, deps());
    expect(request.bodyUsed).toBe(false);
    expect(response.headers.get('retry-after')).toBe('60');
    await fail(response, 429, 'rate');
    expect(fetchMock).not.toHaveBeenCalled();
    expect(limit).toHaveBeenCalledWith({ key: '203.0.113.7' });
  });

  it('keys the limiter on unknown without a client address', async () => {
    const request = new Request(`${ORIGIN}/api/lead`, {
      method: 'POST',
      headers: { Origin: ORIGIN, 'Content-Type': 'application/json' },
      body: '{}',
    });
    await handleLeadPost(request, deps());
    expect(limit).toHaveBeenCalledWith({ key: 'unknown' });
  });

  it('413 by Content-Length and by body size', async () => {
    await fail(
      await handleLeadPost(
        post(BODY, { headers: { 'Content-Length': '40000' } }),
        deps(),
      ),
      413,
      'too-large',
    );
    await fail(
      await handleLeadPost(
        post(null, { raw: `{"x":"${'a'.repeat(33_000)}"}` }),
        deps(),
      ),
      413,
      'too-large',
    );
  });

  it('400 for bad JSON and for a bad schema', async () => {
    await fail(
      await handleLeadPost(post(null, { raw: '{nope' }), deps()),
      400,
      'invalid',
    );
    await fail(
      await handleLeadPost(post({ ...BODY, consent: false }), deps()),
      400,
      'invalid',
    );
    await fail(
      await handleLeadPost(post({ ...BODY, source: 'chat' }), deps()),
      400,
      'invalid',
    );
    await fail(
      await handleLeadPost(post(null, { raw: '' }), deps()),
      400,
      'invalid',
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('answers 200 to a filled honeypot with no row, no fetch and no email', async () => {
    const response = await handleLeadPost(
      post({ ...BODY, website: 'http://spam.example' }),
      deps(),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
    expect(await leads()).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(waitUntil).not.toHaveBeenCalled();
  });

  it('reads the Turnstile secret only after origin, content type and rate limit pass', async () => {
    await handleLeadPost(
      post(BODY, { headers: { Origin: 'https://evil.example' } }),
      deps(),
    );
    await handleLeadPost(
      post(BODY, { headers: { 'Content-Type': 'text/plain' } }),
      deps(),
    );
    limit.mockResolvedValueOnce({ success: false });
    await handleLeadPost(post(BODY), deps());
    expect(turnstileSecret).not.toHaveBeenCalled();
    await handleLeadPost(post(null, { raw: '{nope' }), deps());
    expect(turnstileSecret).toHaveBeenCalledTimes(1);
  });

  it('503 when the Turnstile secret throws synchronously', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    turnstileSecret.mockImplementation(() => {
      throw new Error('store down');
    });
    await fail(await handleLeadPost(post(), deps()), 503, 'unavailable');
    expect(error).toHaveBeenCalledWith('lead: secret unavailable');
  });

  it('503 when the Turnstile secret cannot be read', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    turnstileSecret.mockRejectedValue(new Error('store down'));
    await fail(await handleLeadPost(post(), deps()), 503, 'unavailable');
    expect(error).toHaveBeenCalledWith('lead: secret unavailable');
  });

  it('403 when Turnstile rejects the token', async () => {
    fetchMock.mockResolvedValue(Response.json({ success: false }));
    await fail(await handleLeadPost(post(), deps()), 403, 'captcha');
  });

  it('503 when D1 throws, logging the error name only', async () => {
    turnstileOk();
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const response = await handleLeadPost(
      post(),
      deps({ db: env.UNMIGRATED_DB }),
    );
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ ok: false, error: 'unavailable' });
    expect(JSON.stringify(error.mock.calls)).not.toContain('ada@');
    expect(error).toHaveBeenCalledWith('lead: store failed', expect.anything());
    expect(waitUntil).not.toHaveBeenCalled();
  });
});

describe('attribution hardening', () => {
  it.each([
    [
      'landing',
      { landing: '/a\nBcc: evil@example.com', referrer: '', page: '/' },
    ],
    ['page', { landing: '', referrer: '', page: '/a\r\nX: y' }],
    [
      'referrer',
      { landing: '', referrer: 'https://a.example/\nBcc: x', page: '/' },
    ],
    [
      'a backslash landing',
      { landing: '/\\evil.example', referrer: '', page: '/' },
    ],
  ])('400 for a forged %s', async (_label, attribution) => {
    turnstileOk();
    await fail(
      await handleLeadPost(post({ ...BODY, attribution }), deps()),
      400,
      'invalid',
    );
  });

  it('stores the normalised referrer', async () => {
    turnstileOk();
    await handleLeadPost(
      post({
        ...BODY,
        attribution: {
          landing: '',
          referrer: 'HTTPS://Example.ORG/a b?q=1',
          page: '/',
        },
      }),
      deps(),
    );
    expect((await leads())[0]?.referrer).toBe('https://example.org/a%20b?q=1');
  });
});

describe('success', () => {
  it('stores the lead with parsed attribution and hands delivery to waitUntil', async () => {
    turnstileOk();
    const response = await handleLeadPost(post(), deps());
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(await response.json()).toEqual({ ok: true });

    const [lead] = await leads();
    expect(lead).toMatchObject({
      locale: 'en',
      source: 'form',
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      company: 'Analytical Engines',
      consent_version: CONSENT_VERSION,
      consent_at: NOW,
      created_at: NOW,
      utm_source: 'news',
      utm_medium: 'email',
      utm_campaign: 'r6',
      utm_term: null,
      utm_content: null,
      gclid: 'g1',
      referrer: 'https://example.org/post',
      landing_page:
        '/?utm_source=news&utm_medium=email&utm_campaign=r6&gclid=g1',
      submit_page: '/services/ai-automation',
      context: null,
      chat_session_id: null,
      is_test: 0,
    });
    expect(waitUntil).toHaveBeenCalledTimes(1);
    await waitUntil.mock.calls[0]?.[0];
    const sentTo = fetchMock.mock.calls
      .filter(([url]) => String(url).endsWith('/emails'))
      .map(([, init]) => JSON.parse(String(init?.body)).to[0])
      .sort();
    expect(sentTo).toEqual(['ada@example.com', 'owner@example.com']);
  });

  it('sends the remote ip and the lead action to Turnstile', async () => {
    turnstileOk();
    await handleLeadPost(post(), deps());
    const init = fetchMock.mock.calls[0]?.[1];
    expect(JSON.parse(String(init?.body))).toEqual({
      secret: 'ts_secret',
      response: 'token',
      remoteip: '203.0.113.7',
    });
  });

  it('keeps no referrer for a non-http URL and a null company when empty', async () => {
    turnstileOk();
    await handleLeadPost(
      post({
        ...BODY,
        company: '',
        attribution: {
          landing: '',
          referrer: 'javascript:alert(1)',
          page: '/',
        },
      }),
      deps(),
    );
    const [lead] = await leads();
    expect(lead).toMatchObject({
      referrer: null,
      company: null,
      landing_page: null,
      utm_source: null,
    });
  });

  it('drops UTM values that are too long', async () => {
    turnstileOk();
    await handleLeadPost(
      post({
        ...BODY,
        attribution: {
          landing: `/?utm_source=${'a'.repeat(201)}&utm_medium=a%0Ab&utm_term=ok`,
          referrer: '',
          page: '/',
        },
      }),
      deps(),
    );
    const [lead] = await leads();
    expect(lead).toMatchObject({
      utm_source: null,
      utm_medium: null,
      utm_term: 'ok',
    });
  });

  it.each([
    ['https://zenetlabs.com', 'Ada', 0],
    ['https://zenetlabs.com', '[TEST] Ada', 1],
    ['https://abc-prod-zenet-web.zenetlabs.workers.dev', 'Ada', 1],
    ['http://localhost:4173', 'Ada', 1],
  ])('marks %s with name %s as is_test %i', async (origin, name, isTest) => {
    turnstileOk();
    await handleLeadPost(
      post({ ...BODY, name }, { url: `${origin}/api/lead` }),
      deps(),
    );
    expect((await leads())[0]?.is_test).toBe(isTest);
  });

  it('survives a limiter outage', async () => {
    turnstileOk();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    limit.mockRejectedValue(new Error('down'));
    expect((await handleLeadPost(post(), deps())).status).toBe(200);
  });
});
