// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { conversationToken } from '@/server/voice/elevenlabs';

const KEY = 'xi-secret-key-value';

function call(send: typeof fetch) {
  return conversationToken({
    apiOrigin: 'https://api.elevenlabs.test',
    apiKey: KEY,
    agentId: 'agent id/1',
    fetch: send,
  });
}

describe('conversationToken', () => {
  it('asks for the agent with the key in the header and no participant name', async () => {
    const send = vi.fn<typeof fetch>(async () =>
      Response.json({ token: 'tok', conversation_id: 'conv' }),
    );
    expect(await call(send)).toEqual({
      ok: true,
      token: 'tok',
      conversationId: 'conv',
    });
    const [url, init] = send.mock.calls[0] ?? [];
    expect(url).toBe(
      'https://api.elevenlabs.test/v1/convai/conversation/token?agent_id=agent%20id%2F1',
    );
    expect(String(url)).not.toContain('participant_name');
    expect(init?.headers).toEqual({ 'xi-api-key': KEY });
  });

  it('accepts a response without a conversation id', async () => {
    const result = await call(async () => Response.json({ token: 'tok' }));
    expect(result).toEqual({ ok: true, token: 'tok', conversationId: null });
  });

  it.each([
    [401, 'auth'],
    [403, 'auth'],
    [404, 'agent'],
    [422, 'invalid'],
    [429, 'quota'],
    [500, 'http_500'],
  ])('maps HTTP %i to %s', async (status, code) => {
    const result = await call(async () => new Response('{}', { status }));
    expect(result).toEqual({ ok: false, code });
  });

  it('rejects a response that is not a token', async () => {
    for (const body of [{}, { token: '' }, { token: 5 }, 'text']) {
      const result = await call(async () => Response.json(body));
      expect(result).toEqual({ ok: false, code: 'response' });
    }
    const broken = await call(async () => new Response('<html>'));
    expect(broken).toEqual({ ok: false, code: 'response' });
  });

  it('reports a network failure and a timeout as codes', async () => {
    expect(
      await call(async () => {
        throw new TypeError('fetch failed');
      }),
    ).toEqual({ ok: false, code: 'network' });
    expect(
      await call(async () => {
        throw new DOMException('slow', 'TimeoutError');
      }),
    ).toEqual({ ok: false, code: 'timeout' });
  });

  it('never logs the key or the token', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    const info = vi.spyOn(console, 'log').mockImplementation(() => {});
    await call(async () => new Response('{}', { status: 401 }));
    await call(async () => Response.json({ token: 'tok-secret' }));
    for (const spy of [log, info]) {
      expect(JSON.stringify(spy.mock.calls)).not.toMatch(
        /xi-secret-key-value|tok-secret/,
      );
    }
    log.mockRestore();
    info.mockRestore();
  });
});
