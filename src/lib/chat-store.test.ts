import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ChatEvent, ChatFailure } from '@/lib/chat-events';
import { getChatSessionId, setChatSessionId } from '@/lib/chat-session';
import {
  addNotice,
  applyEvent,
  begin,
  type ChatState,
  dismissProposal,
  EMPTY,
  ensureLocale,
  fail,
  resetChat,
  type SendContext,
  send,
} from '@/lib/chat-store';

const postChat = vi.hoisted(() => vi.fn());
const track = vi.hoisted(() => vi.fn());
vi.mock('@/lib/chat-client', () => ({ postChat }));
vi.mock('@/lib/track', () => ({ track }));

const ID = '5f0c2a52-6f4e-4a6c-9d4e-0b1d7b3b0a11';

function reduce(events: ChatEvent[], from: ChatState = EMPTY): ChatState {
  return events.reduce(applyEvent, from);
}

describe('applyEvent', () => {
  it('keeps the session id', () => {
    expect(reduce([{ t: 'session', id: ID }]).sessionId).toBe(ID);
  });

  it('streams text, shows the tool step, and settles the message on done', () => {
    const writing = reduce([{ t: 'tool', name: 'get_pricing' }]);
    expect(writing).toMatchObject({ status: 'tool', tool: 'get_pricing' });
    const streaming = reduce(
      [
        { t: 'text', v: 'Hello ' },
        { t: 'text', v: 'there.' },
      ],
      writing,
    );
    expect(streaming).toMatchObject({
      status: 'writing',
      tool: null,
      streaming: 'Hello there.',
      items: [],
    });
    const done = applyEvent(streaming, { t: 'done', remaining: 17 });
    expect(done).toMatchObject({
      status: 'idle',
      streaming: '',
      remaining: 17,
    });
    expect(done.items).toEqual([
      { id: 1, kind: 'assistant', text: 'Hello there.' },
    ]);
  });

  it('adds a navigate item and a booking proposal', () => {
    const state = reduce([
      { t: 'navigate', page: 'home', section: 'faq', href: '/#faq' },
      { t: 'navigate', page: 'pricing', href: '/pricing' },
      {
        t: 'confirm_booking',
        proposal: {
          slot: '2027-01-05T01:00:00.000Z',
          topic: 'Automate our inbox',
        },
      },
    ]);
    expect(state.items).toEqual([
      { id: 1, kind: 'navigate', page: 'home', section: 'faq', href: '/#faq' },
      {
        id: 2,
        kind: 'navigate',
        page: 'pricing',
        section: null,
        href: '/pricing',
      },
    ]);
    expect(state.proposal?.topic).toBe('Automate our inbox');
  });

  it('keeps the partial text when the reply is cut', () => {
    const state = reduce([
      { t: 'text', v: 'Half' },
      { t: 'error', code: 'unavailable' },
      { t: 'done', remaining: 5 },
    ]);
    expect(state.cut).toBe(true);
    expect(
      state.items.map((item) => item.kind === 'assistant' && item.text),
    ).toEqual(['Half']);
  });

  it('records the user message and a failure', () => {
    const started = begin(EMPTY, 'Hi', true);
    expect(started).toMatchObject({
      status: 'verifying',
      items: [{ kind: 'user', text: 'Hi' }],
    });
    expect(fail(started, 'budget')).toMatchObject({
      status: 'idle',
      failure: 'budget',
    });
  });
});

function context(overrides: Partial<SendContext> = {}): SendContext {
  return {
    locale: 'en',
    page: '/pricing',
    timeZone: 'UTC',
    token: vi.fn(async () => 'tok'),
    resetToken: vi.fn(),
    newSession: 'new conversation',
    ...overrides,
  };
}

async function* events(...list: ChatEvent[]) {
  for (const event of list) yield event;
}

const ok = (...list: ChatEvent[]) => ({ ok: true, events: events(...list) });
const failure = (error: ChatFailure['error']): ChatFailure => ({
  ok: false,
  error,
});

// The store is module state: read it through a hook-free snapshot.
import { renderHook } from '@testing-library/react';
import { useChatState } from '@/lib/chat-store';

const state = () => renderHook(() => useChatState()).result.current;

beforeEach(() => {
  postChat.mockReset();
  track.mockReset();
  resetChat('en');
});

describe('send', () => {
  it('mints a token for the first message, then sends the session id', async () => {
    const ctx = context();
    postChat.mockResolvedValueOnce(
      ok(
        { t: 'session', id: ID },
        { t: 'text', v: 'Hi.' },
        { t: 'done', remaining: 19 },
      ),
    );
    await send('Hello', ctx);
    expect(ctx.token).toHaveBeenCalledTimes(1);
    expect(postChat.mock.calls[0]?.[0]).toMatchObject({
      locale: 'en',
      message: 'Hello',
      turnstileToken: 'tok',
    });
    expect(postChat.mock.calls[0]?.[0]).not.toHaveProperty('sessionId');
    expect(getChatSessionId()).toBe(ID);
    expect(state().items.map((item) => item.kind)).toEqual([
      'user',
      'assistant',
    ]);

    postChat.mockResolvedValueOnce(ok({ t: 'done', remaining: 18 }));
    await send('Again', ctx);
    expect(ctx.token).toHaveBeenCalledTimes(1);
    expect(postChat.mock.calls[1]?.[0]).toMatchObject({ sessionId: ID });
    expect(postChat.mock.calls[1]?.[0]).not.toHaveProperty('turnstileToken');
    expect(track).toHaveBeenCalledTimes(2);
    expect(track).toHaveBeenCalledWith('chat_message');
  });

  it('ignores an empty message and a send while one is pending', async () => {
    await send('   ', context());
    expect(postChat).not.toHaveBeenCalled();
    let release: (value: unknown) => void = () => {};
    postChat.mockReturnValueOnce(
      new Promise((resolve) => {
        release = resolve;
      }),
    );
    const first = send('one', context());
    await vi.waitFor(() => expect(postChat).toHaveBeenCalledTimes(1));
    await send('two', context());
    expect(postChat).toHaveBeenCalledTimes(1);
    release(ok({ t: 'done', remaining: 1 }));
    await first;
  });

  it('starts a new session once when the old one expired, and says so', async () => {
    const ctx = context();
    postChat.mockResolvedValueOnce(
      ok({ t: 'session', id: ID }, { t: 'done', remaining: 19 }),
    );
    await send('one', ctx);
    postChat
      .mockResolvedValueOnce(failure('session'))
      .mockResolvedValueOnce(
        ok(
          { t: 'session', id: 'new-id' },
          { t: 'text', v: 'Ok.' },
          { t: 'done', remaining: 19 },
        ),
      );
    await send('two', ctx);
    expect(ctx.token).toHaveBeenCalledTimes(2);
    expect(postChat).toHaveBeenCalledTimes(3);
    expect(
      state().items.some(
        (item) => item.kind === 'notice' && item.text === 'new conversation',
      ),
    ).toBe(true);
    expect(state().sessionId).toBe('new-id');
  });

  it('retries a failed challenge once with a fresh token, then reports it', async () => {
    const ctx = context();
    postChat
      .mockResolvedValueOnce(failure('captcha'))
      .mockResolvedValueOnce(ok({ t: 'done', remaining: 19 }));
    await send('hello', ctx);
    expect(ctx.resetToken).toHaveBeenCalledTimes(1);
    expect(state().failure).toBeNull();
    resetChat('en');
    postChat.mockResolvedValue(failure('captcha'));
    await send('hello', ctx);
    expect(state().failure).toBe('captcha');
  });

  it('reports a challenge that never produces a token', async () => {
    await send(
      'hello',
      context({
        token: vi.fn(async () => {
          throw new Error('timeout');
        }),
      }),
    );
    expect(postChat).not.toHaveBeenCalled();
    expect(state()).toMatchObject({ failure: 'captcha', status: 'idle' });
  });

  it.each(['rate', 'budget', 'unavailable', 'session-full'] as const)(
    'shows %s without retrying',
    async (error) => {
      postChat.mockResolvedValue(failure(error));
      await send('hello', context());
      expect(postChat).toHaveBeenCalledTimes(1);
      expect(state()).toMatchObject({ failure: error, status: 'idle' });
    },
  );

  it('settles an unfinished reply when the stream ends without done', async () => {
    postChat.mockResolvedValue(ok({ t: 'text', v: 'Half' }));
    await send('hello', context());
    expect(state()).toMatchObject({ status: 'idle', streaming: '' });
    expect(state().items.at(-1)).toMatchObject({
      kind: 'assistant',
      text: 'Half',
    });
  });
});

describe('a reset during a reply', () => {
  it('lets the old stream write nothing into the new conversation', async () => {
    let release: () => void = () => {};
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    async function* slow() {
      yield { t: 'session', id: 'old' } satisfies ChatEvent;
      await gate;
      yield { t: 'text', v: 'Late words. ' } satisfies ChatEvent;
      yield { t: 'done', remaining: 3 } satisfies ChatEvent;
    }
    postChat.mockResolvedValueOnce({ ok: true, events: slow() });
    const sending = send('hello', context());
    await vi.waitFor(() => expect(getChatSessionId()).toBe('old'));
    resetChat('es');
    release();
    await sending;
    expect(state()).toMatchObject({
      locale: 'es',
      items: [],
      streaming: '',
      sessionId: null,
      status: 'idle',
    });
    expect(getChatSessionId()).toBeNull();
  });
});

describe('resetting', () => {
  it('forgets the conversation and the session id when the language changes', async () => {
    postChat.mockResolvedValueOnce(
      ok({ t: 'session', id: ID }, { t: 'done', remaining: 19 }),
    );
    await send('hello', context());
    ensureLocale('en');
    expect(state().items).toHaveLength(1);
    ensureLocale('es');
    expect(state()).toMatchObject({ locale: 'es', items: [], sessionId: null });
    expect(getChatSessionId()).toBeNull();
  });

  it('closes the proposal when it is dismissed or the booking is done', () => {
    resetChat('en');
    setChatSessionId(null);
    addNotice('Booked.');
    expect(state().items).toEqual([{ id: 1, kind: 'notice', text: 'Booked.' }]);
    dismissProposal();
    expect(state().proposal).toBeNull();
  });
});
