// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { mintVoiceSession } from '@/lib/voice-client';

const BODY = {
  locale: 'es',
  page: '/es',
  timeZone: 'Europe/Madrid',
  turnstileToken: 't',
} as const;

const reply = (body: unknown, status = 200) =>
  vi.fn<typeof fetch>(async () => Response.json(body, { status }));

describe('mintVoiceSession', () => {
  it('posts the request as JSON and returns the minted session', async () => {
    const send = reply({
      ok: true,
      token: 'tok',
      sessionId: 's1',
      maxSeconds: 300,
    });
    expect(await mintVoiceSession(BODY, send)).toEqual({
      ok: true,
      token: 'tok',
      sessionId: 's1',
      maxSeconds: 300,
    });
    const [url, init] = send.mock.calls[0] ?? [];
    expect(url).toBe('/api/voice/session');
    expect(init?.method).toBe('POST');
    expect(JSON.parse(String(init?.body))).toEqual(BODY);
  });

  it.each([
    'origin',
    'unsupported',
    'rate',
    'too-large',
    'invalid',
    'captcha',
    'budget',
    'unavailable',
  ])('passes the %s error through', async (error) => {
    expect(
      await mintVoiceSession(BODY, reply({ ok: false, error }, 503)),
    ).toEqual({
      ok: false,
      error,
    });
  });

  it.each([
    ['an unknown error', { ok: false, error: 'teapot' }],
    ['a success without a token', { ok: true, sessionId: 's', maxSeconds: 1 }],
    ['an empty token', { ok: true, token: '', sessionId: 's', maxSeconds: 1 }],
    ['a success without a session', { ok: true, token: 't', maxSeconds: 1 }],
    ['a string', 'ok'],
    ['null', null],
    ['an inherited key', { ok: false, error: 'toString' }],
  ])('reads %s as unavailable', async (_label, body) => {
    expect(await mintVoiceSession(BODY, reply(body))).toEqual({
      ok: false,
      error: 'unavailable',
    });
  });

  it('reads a page that is not JSON, and a network failure, as unavailable', async () => {
    expect(
      await mintVoiceSession(
        BODY,
        async () => new Response('<html>', { status: 502 }),
      ),
    ).toEqual({ ok: false, error: 'unavailable' });
    expect(
      await mintVoiceSession(BODY, async () => {
        throw new TypeError('offline');
      }),
    ).toEqual({ ok: false, error: 'unavailable' });
  });
});
