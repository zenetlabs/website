import { afterEach, describe, expect, it, vi } from 'vitest';
import { postChat } from '@/lib/chat-client';
import type { ChatEvent, ChatRequestBody } from '@/lib/chat-events';

const BODY: ChatRequestBody = {
  locale: 'en',
  message: 'hi',
  page: '/',
  timeZone: 'UTC',
  sessionId: '5f0c2a52-6f4e-4a6c-9d4e-0b1d7b3b0a11',
};

function stream(...chunks: string[]): Response {
  const encoder = new TextEncoder();
  return new Response(
    new ReadableStream({
      start(controller) {
        for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
        controller.close();
      },
    }),
    { headers: { 'Content-Type': 'application/x-ndjson; charset=utf-8' } },
  );
}

async function collect(response: Awaited<ReturnType<typeof postChat>>) {
  if (!response.ok) throw new Error(`failed: ${response.error}`);
  const events: ChatEvent[] = [];
  for await (const event of response.events) events.push(event);
  return events;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('postChat', () => {
  it('reads events split across chunks, with CRLF and a missing final newline', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        stream(
          '{"t":"session","id":"a"}\r\n{"t":"te',
          'xt","v":"Hel',
          'lo "}\n{"t":"done","remaining":3}',
        ),
      ),
    );
    expect(
      await collect(await postChat(BODY, new AbortController().signal)),
    ).toEqual([
      { t: 'session', id: 'a' },
      { t: 'text', v: 'Hello ' },
      { t: 'done', remaining: 3 },
    ]);
  });

  it('ignores a malformed or unknown line', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        stream(
          'not json\n{"t":"mystery"}\n{"t":"navigate","page":"nope","href":"/"}\n{"t":"done","remaining":1}\n',
        ),
      ),
    );
    expect(
      await collect(await postChat(BODY, new AbortController().signal)),
    ).toEqual([{ t: 'done', remaining: 1 }]);
  });

  it('ends a stream that stops before done with an error event', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => stream('{"t":"text","v":"Half"}\n')),
    );
    expect(
      await collect(await postChat(BODY, new AbortController().signal)),
    ).toEqual([
      { t: 'text', v: 'Half' },
      { t: 'error', code: 'unavailable' },
    ]);
  });

  it('turns a connection that breaks mid-stream into an error event', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(
            new ReadableStream({
              start(controller) {
                controller.enqueue(
                  new TextEncoder().encode('{"t":"text","v":"x"}\n'),
                );
                controller.error(new TypeError('reset'));
              },
            }),
            { headers: { 'Content-Type': 'application/x-ndjson' } },
          ),
      ),
    );
    const events = await collect(
      await postChat(BODY, new AbortController().signal),
    );
    expect(events.at(-1)).toEqual({ t: 'error', code: 'unavailable' });
  });

  it.each([
    [404, { ok: false, error: 'session' }, 'session'],
    [409, { ok: false, error: 'session-full' }, 'session-full'],
    [503, { ok: false, error: 'budget' }, 'budget'],
    [403, { ok: false, error: 'captcha' }, 'captcha'],
    [503, { ok: false, error: 'something-new' }, 'unavailable'],
  ])('maps a %d JSON body to %s', async (status, json, error) => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Response.json(json, { status })),
    );
    expect(await postChat(BODY, new AbortController().signal)).toEqual({
      ok: false,
      error,
    });
  });

  it('maps a bare 429 to rate and a network failure to unavailable', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('slow down', { status: 429 })),
    );
    expect(await postChat(BODY, new AbortController().signal)).toEqual({
      ok: false,
      error: 'rate',
    });
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new TypeError('offline');
      }),
    );
    expect(await postChat(BODY, new AbortController().signal)).toEqual({
      ok: false,
      error: 'unavailable',
    });
  });

  it('posts JSON to /api/chat', async () => {
    const fetchMock = vi.fn(async () => stream('{"t":"done","remaining":1}\n'));
    vi.stubGlobal('fetch', fetchMock);
    await collect(await postChat(BODY, new AbortController().signal));
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/chat',
      expect.objectContaining({ method: 'POST', body: JSON.stringify(BODY) }),
    );
  });
});
