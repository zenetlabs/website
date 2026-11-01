import { env } from 'cloudflare:workers';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { readSecret } from '@/server/calendar-config';
import { handleVoiceSession, type VoiceDeps } from '@/server/voice/session';
import { TEST_SITE } from '../../../test/google';

const { DB } = env;
const ORIGIN = 'https://zenetlabs.com';
const NOW = Date.UTC(2027, 0, 4, 8, 0);
const API = 'https://elevenlabs.test';
const KEY = 'xi-key-value';

const BODY = {
  locale: 'es',
  page: '/es/precios',
  timeZone: 'Europe/Madrid',
  turnstileToken: 'token',
};

const RESPONSE = z.object({
  ok: z.boolean(),
  error: z.string().optional(),
  token: z.string().optional(),
  sessionId: z.string().optional(),
  maxSeconds: z.number().optional(),
});

type Calls = { siteverify: string[]; tokens: string[] };

let calls: Calls;
let limited: boolean;
type Binding = { get: () => Promise<string> };
let apiKey: Binding;
let toolSecret: Binding;
const value = (text: string): Binding => ({ get: async () => text });
const missing: Binding = {
  get: async () => {
    throw new Error('Secret not found');
  },
};
let turnstile: { success: boolean; action?: string; hostname?: string };
let mint: () => Response | Promise<Response>;
let site = TEST_SITE;
let cap: number;
let background: Promise<unknown>[];

function deps(): VoiceDeps {
  return {
    db: DB,
    site,
    apiOrigin: API,
    dailySessions: cap,
    limiter: { limit: async () => ({ success: !limited }) },
    apiKey: () => readSecret(apiKey),
    toolSecret: () => readSecret(toolSecret),
    turnstileSecret: async () => 'ts-secret',
    now: () => NOW,
    waitUntil: (promise) => {
      background.push(promise);
    },
    fetch: async (input, init) => {
      const url = String(input);
      if (url.startsWith('https://challenges.cloudflare.com/')) {
        calls.siteverify.push(url);
        return Response.json(turnstile);
      }
      calls.tokens.push(
        `${url} ${new Headers(init?.headers).get('xi-api-key')}`,
      );
      return mint();
    },
  };
}

function request(
  body: unknown = BODY,
  headers: Record<string, string> = {},
  url = `${ORIGIN}/api/voice/session`,
): Request {
  return new Request(url, {
    method: 'POST',
    headers: {
      Origin: new URL(url).origin,
      'Content-Type': 'application/json',
      'CF-Connecting-IP': '203.0.113.7',
      ...headers,
    },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

async function call(req: Request = request()) {
  const response = await handleVoiceSession(req, deps());
  await Promise.allSettled(background);
  return { response, body: RESPONSE.parse(await response.json()) };
}

async function rows(): Promise<Array<Record<string, unknown>>> {
  return (await DB.prepare('SELECT * FROM voice_sessions').all()).results;
}

beforeEach(async () => {
  calls = { siteverify: [], tokens: [] };
  background = [];
  limited = false;
  apiKey = value(KEY);
  toolSecret = value('tool-secret');
  turnstile = { success: true, action: 'voice', hostname: 'zenetlabs.com' };
  mint = () => Response.json({ token: 'fake-tok', conversation_id: 'conv-1' });
  site = TEST_SITE;
  cap = 2;
  await DB.prepare('DELETE FROM voice_sessions').run();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('POST /api/voice/session', () => {
  it('mints a token and returns our own session id', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    const { response, body } = await call();
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(body).toMatchObject({
      ok: true,
      token: 'fake-tok',
      maxSeconds: 300,
    });
    expect(calls.tokens).toEqual([
      `${API}/v1/convai/conversation/token?agent_id=agent-es ${KEY}`,
    ]);
    expect(await rows()).toMatchObject([
      {
        id: body.sessionId,
        locale: 'es',
        time_zone: 'Europe/Madrid',
        start_page: '/es/precios',
        conversation_id: 'conv-1',
        day: '2027-01-04',
        is_test: 0,
      },
    ]);
    expect(JSON.stringify(log.mock.calls)).not.toMatch(
      /fake-tok|Madrid|precios/,
    );
  });

  it('marks a session minted on a preview host as a test', async () => {
    const { response } = await call(
      request(
        BODY,
        {},
        'https://pr-1-prod-zenet-web.example.workers.dev/api/voice/session',
      ),
    );
    expect(response.status).toBe(200);
    expect(await rows()).toMatchObject([{ is_test: 1 }]);
  });

  it('answers 403 origin, 415 and 429 with Retry-After before any other work', async () => {
    let result = await call(request(BODY, { Origin: 'https://evil.example' }));
    expect(result.response.status).toBe(403);
    expect(result.body.error).toBe('origin');
    result = await call(request(BODY, { 'Content-Type': 'text/plain' }));
    expect(result.response.status).toBe(415);
    limited = true;
    result = await call();
    expect(result.response.status).toBe(429);
    expect(result.response.headers.get('retry-after')).toBe('60');
    expect(calls.siteverify).toEqual([]);
    expect(await rows()).toEqual([]);
  });

  it('answers 413 for a declared and for a streamed oversize body', async () => {
    const big = { ...BODY, turnstileToken: 'x'.repeat(5000) };
    const declared = await call(request(big, { 'Content-Length': '5000' }));
    expect(declared.response.status).toBe(413);
    const streamed = await call(request(big));
    expect(streamed.response.status).toBe(413);
  });

  it('answers 400 invalid with paths only', async () => {
    const { response, body } = await call(
      request({ ...BODY, locale: 'fr', timeZone: 'Mars/Base' }),
    );
    expect(response.status).toBe(400);
    expect(body.error).toBe('invalid');
    const text = JSON.stringify(
      await handleVoiceSession(request({ ...BODY, locale: 'fr' }), deps()).then(
        (r) => r.json(),
      ),
    );
    expect(text).toContain('locale');
    expect(text).not.toContain('"fr"');
    expect((await call(request('{'))).response.status).toBe(400);
    expect(
      (await call(request({ ...BODY, page: '//evil.example' }))).response
        .status,
    ).toBe(400);
  });

  it.each([
    [
      'a null agent id',
      () => {
        site = {
          ...TEST_SITE,
          voice: { ...TEST_SITE.voice, agents: { en: 'a', es: null } },
        };
      },
    ],
    [
      'a missing API key',
      () => {
        apiKey = missing;
      },
    ],
    [
      'the UNSET placeholder as API key',
      () => {
        apiKey = value('UNSET');
      },
    ],
    [
      'the unconfigured placeholder as API key',
      () => {
        apiKey = value('unconfigured');
      },
    ],
    [
      'an empty API key',
      () => {
        apiKey = value('  ');
      },
    ],
    [
      'a missing tool secret',
      () => {
        toolSecret = missing;
      },
    ],
    [
      'a placeholder tool secret',
      () => {
        toolSecret = value('UNSET');
      },
    ],
  ])(
    'answers 503 unavailable with %s, without a Turnstile or ElevenLabs call',
    async (_label, setup) => {
      const log = vi.spyOn(console, 'error').mockImplementation(() => {});
      setup();
      const { response, body } = await call();
      expect(response.status).toBe(503);
      expect(body.error).toBe('unavailable');
      expect(calls.siteverify).toEqual([]);
      expect(calls.tokens).toEqual([]);
      expect(await rows()).toEqual([]);
      expect(log).toHaveBeenCalledWith('voice: not configured', {
        locale: 'es',
      });
    },
  );

  it('answers 503 and does nothing at all while voice is not published', async () => {
    site = { ...TEST_SITE, voice: { ...TEST_SITE.voice, published: false } };
    const { response, body } = await call();
    expect(response.status).toBe(503);
    expect(body.error).toBe('unavailable');
    expect(calls).toEqual({ siteverify: [], tokens: [] });
    expect(await rows()).toEqual([]);
  });

  it('answers 403 captcha for a failed check or a token minted for another action', async () => {
    turnstile = { success: true, action: 'chat', hostname: 'zenetlabs.com' };
    let result = await call();
    expect(result.response.status).toBe(403);
    expect(result.body.error).toBe('captcha');
    turnstile = { success: false };
    result = await call();
    expect(result.response.status).toBe(403);
    expect(await rows()).toEqual([]);
    expect(calls.tokens).toEqual([]);
  });

  it('answers 503 unavailable when the Turnstile secret cannot be read', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const failing: VoiceDeps = {
      ...deps(),
      turnstileSecret: async () => {
        throw new Error('Secret not found');
      },
    };
    const response = await handleVoiceSession(request(), failing);
    expect(response.status).toBe(503);
  });

  it('answers 503 budget at the daily cap without asking ElevenLabs', async () => {
    expect((await call()).response.status).toBe(200);
    expect((await call()).response.status).toBe(200);
    calls.tokens.length = 0;
    const { response, body } = await call();
    expect(response.status).toBe(503);
    expect(body.error).toBe('budget');
    expect(calls.tokens).toEqual([]);
    expect(await rows()).toHaveLength(2);
  });

  it('deletes the claimed row and answers 503 when the token fails', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    mint = () => new Response('{}', { status: 401 });
    const { response, body } = await call();
    expect(response.status).toBe(503);
    expect(body.error).toBe('unavailable');
    expect(await rows()).toEqual([]);
    expect(log).toHaveBeenCalledWith('voice: token failed', { code: 'auth' });
    expect(JSON.stringify(log.mock.calls)).not.toContain(KEY);
  });

  it('still works when the token has no conversation id', async () => {
    mint = () => Response.json({ token: 'fake-tok' });
    const { response } = await call();
    expect(response.status).toBe(200);
    expect(await rows()).toMatchObject([{ conversation_id: null }]);
  });

  it('counts a preview session against the same daily cap as a live one', async () => {
    const preview =
      'https://pr-1-prod-zenet-web.example.workers.dev/api/voice/session';
    expect((await call(request(BODY, {}, preview))).response.status).toBe(200);
    expect((await call()).response.status).toBe(200);
    const { response, body } = await call(request(BODY, {}, preview));
    expect(response.status).toBe(503);
    expect(body.error).toBe('budget');
  });

  it('answers 503 unavailable, not 500, when D1 fails after Turnstile', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    await DB.prepare(
      'ALTER TABLE voice_sessions RENAME TO voice_sessions_gone',
    ).run();
    try {
      const { response, body } = await call();
      expect(response.status).toBe(503);
      expect(body.error).toBe('unavailable');
      expect(calls.tokens).toEqual([]);
    } finally {
      await DB.prepare(
        'ALTER TABLE voice_sessions_gone RENAME TO voice_sessions',
      ).run();
    }
    expect(log).toHaveBeenCalledWith('voice: session not stored', {
      error: 'Error',
    });
  });
});
