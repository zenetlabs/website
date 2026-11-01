import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { voiceCopy } from '@/content/en/voice';
import type {
  VoiceCall,
  VoiceEvents,
  VoiceSdk,
  VoiceStart,
} from '@/lib/voice-sdk';
import {
  endCall,
  INITIAL,
  reduce,
  resetCall,
  type StartDeps,
  startCall,
  toggleMute,
  useVoiceState,
  type VoiceEvent,
  type VoiceState,
  warmSdk,
} from '@/lib/voice-store';

const track = vi.hoisted(() => vi.fn());
const mint = vi.hoisted(() => vi.fn());
vi.mock('@/lib/track', () => ({ track }));
vi.mock('@/lib/voice-client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/voice-client')>()),
  mintVoiceSession: mint,
}));

function fold(...events: VoiceEvent[]): VoiceState {
  return events.reduce(reduce, INITIAL);
}

describe('reduce', () => {
  it('goes from connecting to live to ended', () => {
    expect(fold({ t: 'start' }).phase).toBe('connecting');
    expect(fold({ t: 'start' }, { t: 'connected' }).phase).toBe('live');
    expect(fold({ t: 'start' }, { t: 'connected' }, { t: 'ended' }).phase).toBe(
      'ended',
    );
  });

  it('ignores connected outside connecting, and ended in the intro or after a failure', () => {
    expect(fold({ t: 'connected' }).phase).toBe('intro');
    expect(fold({ t: 'ended' }).phase).toBe('intro');
    const failed = fold(
      { t: 'start' },
      { t: 'failed', failure: 'call' },
      { t: 'ended' },
    );
    expect(failed).toMatchObject({ phase: 'error', failure: 'call' });
  });

  it('records the mode, the mute flag and notices', () => {
    const state = fold(
      { t: 'start' },
      { t: 'mode', mode: 'speaking' },
      { t: 'muted', muted: true },
      { t: 'notice', notice: { kind: 'opened', label: 'Pricing' } },
    );
    expect(state).toMatchObject({
      mode: 'speaking',
      muted: true,
      notice: { kind: 'opened', label: 'Pricing' },
    });
  });

  it('keeps trimmed messages in order with their roles, drops empty ones and caps the list', () => {
    let state = fold(
      { t: 'start' },
      { t: 'message', role: 'agent', text: '  Hello  ' },
      { t: 'message', role: 'user', text: '   ' },
      { t: 'message', role: 'user', text: 'Hi' },
    );
    expect(state.lines.map(({ role, text }) => [role, text])).toEqual([
      ['agent', 'Hello'],
      ['user', 'Hi'],
    ]);
    for (let n = 0; n < 250; n += 1) {
      state = reduce(state, { t: 'message', role: 'user', text: `m${n}` });
    }
    expect(state.lines).toHaveLength(200);
    expect(state.lines.at(-1)?.text).toBe('m249');
  });

  it('clears the mute flag when the call ends or fails, and a new start clears the old call', () => {
    const live = fold(
      { t: 'start' },
      { t: 'connected' },
      { t: 'muted', muted: true },
    );
    expect(reduce(live, { t: 'ended' }).muted).toBe(false);
    expect(reduce(live, { t: 'failed', failure: 'call' }).muted).toBe(false);
    const again = reduce(
      reduce(live, { t: 'message', role: 'user', text: 'x' }),
      { t: 'start' },
    );
    expect(again).toMatchObject({
      phase: 'connecting',
      lines: [],
      muted: false,
    });
  });

  it('resets to the intro', () => {
    expect(fold({ t: 'start' }, { t: 'reset' })).toEqual(INITIAL);
  });
});

type Script = {
  events: VoiceEvents;
  start: VoiceStart;
  call: VoiceCall & { ended: number; muted: boolean[] };
};

function scriptedSdk(failStart = false): {
  sdk: VoiceSdk;
  script: () => Script;
} {
  let captured: Script | null = null;
  const sdk: VoiceSdk = {
    async start(start) {
      if (failStart) throw new Error('webrtc blocked');
      const muted: boolean[] = [];
      const call = {
        ended: 0,
        muted,
        end: async () => {
          call.ended += 1;
        },
        setMuted: (value: boolean) => {
          muted.push(value);
        },
      };
      captured = { events: start.events, start, call };
      return call;
    },
  };
  return {
    sdk,
    script: () => {
      if (!captured) throw new Error('not started');
      return captured;
    },
  };
}

function deps(overrides: Partial<StartDeps> = {}): StartDeps {
  return {
    locale: 'en',
    page: '/',
    timeZone: 'Europe/Madrid',
    copy: voiceCopy,
    supported: () => true,
    requestMic: async () => 'granted',
    token: async () => 'turnstile',
    push: vi.fn(),
    ...overrides,
  };
}

const MINTED = {
  ok: true,
  token: 'fake-voice-token-1',
  sessionId: 's1',
  maxSeconds: 300,
};

const hook = () => renderHook(() => useVoiceState());

beforeEach(async () => {
  track.mockReset();
  mint.mockReset().mockResolvedValue(MINTED);
  await act(() => resetCall());
});

afterEach(async () => {
  await act(() => resetCall());
});

describe('startCall', () => {
  it('asks for the microphone before Turnstile and the mint, then starts the SDK with the session', async () => {
    const order: string[] = [];
    const { sdk, script } = scriptedSdk();
    const { result } = hook();
    await act(() =>
      startCall(
        deps({
          requestMic: async () => {
            order.push('mic');
            return 'granted';
          },
          token: async () => {
            order.push('token');
            return 'turnstile';
          },
          sdk: async () => sdk,
        }),
      ),
    );
    expect(order).toEqual(['mic', 'token']);
    expect(mint).toHaveBeenCalledWith(
      {
        locale: 'en',
        page: '/',
        timeZone: 'Europe/Madrid',
        turnstileToken: 'turnstile',
      },
      undefined,
    );
    expect(script().start).toMatchObject({
      token: 'fake-voice-token-1',
      sessionId: 's1',
    });
    expect(result.current.phase).toBe('connecting');
    act(() => script().events.onConnect());
    expect(result.current.phase).toBe('live');
    expect(track).toHaveBeenCalledWith('voice_call_start');
  });

  it('stops at a denied microphone with no Turnstile and no mint', async () => {
    const token = vi.fn(async () => 'turnstile');
    const { result } = hook();
    await act(() =>
      startCall(deps({ requestMic: async () => 'denied', token })),
    );
    expect(result.current).toMatchObject({ phase: 'error', failure: 'mic' });
    expect(token).not.toHaveBeenCalled();
    expect(mint).not.toHaveBeenCalled();
  });

  it('reads another microphone error as a call failure, and an unsupported browser before asking', async () => {
    const { result } = hook();
    await act(() => startCall(deps({ requestMic: async () => 'error' })));
    expect(result.current.failure).toBe('call');
    const requestMic = vi.fn(async () => 'granted' as const);
    await act(() => resetCall());
    await act(() => startCall(deps({ supported: () => false, requestMic })));
    expect(result.current.failure).toBe('unsupported');
    expect(requestMic).not.toHaveBeenCalled();
  });

  it('fails with captcha when Turnstile rejects, without minting', async () => {
    const { result } = hook();
    await act(() =>
      startCall(
        deps({
          token: async () => {
            throw new Error('timeout');
          },
        }),
      ),
    );
    expect(result.current.failure).toBe('captcha');
    expect(mint).not.toHaveBeenCalled();
  });

  it.each(['budget', 'rate', 'unavailable', 'captcha'] as const)(
    'shows the %s answer of the server and loads no SDK',
    async (error) => {
      mint.mockResolvedValue({ ok: false, error });
      const sdk = vi.fn(async () => scriptedSdk().sdk);
      const { result } = hook();
      await act(() => startCall(deps({ sdk })));
      expect(result.current).toMatchObject({ phase: 'error', failure: error });
      expect(sdk).not.toHaveBeenCalled();
    },
  );

  it('fails with call when the SDK cannot start', async () => {
    const { sdk } = scriptedSdk(true);
    const { result } = hook();
    await act(() => startCall(deps({ sdk: async () => sdk })));
    expect(result.current).toMatchObject({ phase: 'error', failure: 'call' });
  });

  it('shows the transcript, modes and a navigation notice', async () => {
    const { sdk, script } = scriptedSdk();
    const push = vi.fn();
    const { result } = hook();
    await act(() => startCall(deps({ sdk: async () => sdk, push })));
    act(() => {
      script().events.onConnect();
      script().events.onMessage('agent', 'Hello');
      script().events.onMode('speaking');
    });
    expect(result.current.lines).toMatchObject([
      { role: 'agent', text: 'Hello' },
    ]);
    expect(result.current.mode).toBe('speaking');
    await act(() => script().start.tools.navigate({ page: 'pricing' }));
    expect(push).toHaveBeenCalledWith('/pricing');
    expect(result.current.notice).toEqual({
      kind: 'opened',
      label: voiceCopy.pages.pricing,
    });
    expect(result.current.phase).toBe('live');
  });

  it('records a booking only from the booked result of book_meeting, once, with both events', async () => {
    const { sdk, script } = scriptedSdk();
    const { result } = hook();
    await act(() => startCall(deps({ sdk: async () => sdk })));
    act(() => script().events.onConnect());
    const booked = JSON.stringify({
      ok: true,
      result: { status: 'booked', label: 'Tue 3 Nov' },
    });
    act(() => {
      script().events.onToolResult('get_pricing', booked);
      script().events.onToolResult(
        'book_meeting',
        JSON.stringify({
          ok: true,
          result: { status: 'rejected', reason: 'limit' },
        }),
      );
      script().events.onToolResult('book_meeting', '{"ok":true,"result":{"sta');
    });
    expect(result.current.notice).toBeNull();
    expect(track).not.toHaveBeenCalledWith('book_meeting');
    act(() => script().events.onToolResult('book_meeting', booked));
    expect(result.current.notice).toEqual({
      kind: 'booked',
      label: 'Tue 3 Nov',
    });
    expect(track).toHaveBeenCalledWith('book_meeting');
    expect(track).toHaveBeenCalledWith('generate_lead', { method: 'voice' });
  });

  it('ends on a disconnect by the agent and fails on one by error', async () => {
    const first = scriptedSdk();
    const { result } = hook();
    await act(() => startCall(deps({ sdk: async () => first.sdk })));
    act(() => first.script().events.onConnect());
    act(() => first.script().events.onDisconnect('agent'));
    expect(result.current.phase).toBe('ended');
    await act(() => resetCall());
    const second = scriptedSdk();
    await act(() => startCall(deps({ sdk: async () => second.sdk })));
    act(() => second.script().events.onConnect());
    act(() => second.script().events.onDisconnect('error'));
    expect(result.current).toMatchObject({ phase: 'error', failure: 'call' });
  });

  it('ends the SDK conversation when the SDK reports an error', async () => {
    const { sdk, script } = scriptedSdk();
    const { result } = hook();
    await act(() => startCall(deps({ sdk: async () => sdk })));
    act(() => script().events.onConnect());
    act(() => script().events.onError());
    await act(() => new Promise((resolve) => setTimeout(resolve, 0)));
    expect(result.current).toMatchObject({ phase: 'error', failure: 'call' });
    expect(script().call.ended).toBe(1);
  });

  it('ends a conversation whose error came before the SDK finished starting', async () => {
    let release: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const { sdk, script } = scriptedSdk();
    const slow: VoiceSdk = {
      start: async (start) => {
        const call = await sdk.start(start);
        start.events.onError();
        await gate;
        return call;
      },
    };
    const { result } = hook();
    let pending: Promise<void> = Promise.resolve();
    act(() => {
      pending = startCall(deps({ sdk: async () => slow }));
    });
    await act(() => new Promise((resolve) => setTimeout(resolve, 0)));
    release();
    await act(() => pending);
    expect(result.current).toMatchObject({ phase: 'error', failure: 'call' });
    expect(script().call.ended).toBe(1);
  });

  it('mutes and unmutes the call, and ends it once', async () => {
    const { sdk, script } = scriptedSdk();
    const { result } = hook();
    await act(() => startCall(deps({ sdk: async () => sdk })));
    act(() => script().events.onConnect());
    act(() => toggleMute());
    expect(result.current.muted).toBe(true);
    act(() => toggleMute());
    expect(script().call.muted).toEqual([true, false]);
    await act(() => endCall());
    await act(() => endCall());
    expect(script().call.ended).toBe(1);
    expect(result.current.phase).toBe('ended');
  });

  it('ends a call that was started after the visitor had already hung up', async () => {
    let release: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const { sdk, script } = scriptedSdk();
    const slow: VoiceSdk = {
      start: async (start) => {
        await gate;
        return sdk.start(start);
      },
    };
    const { result } = hook();
    let pending: Promise<void> = Promise.resolve();
    act(() => {
      pending = startCall(deps({ sdk: async () => slow }));
    });
    await act(() => new Promise((resolve) => setTimeout(resolve, 0)));
    await act(() => endCall());
    release();
    await act(() => pending);
    expect(script().call.ended).toBe(1);
    expect(result.current.phase).toBe('ended');
  });

  it('does not start a second call while one is live', async () => {
    const { sdk } = scriptedSdk();
    const sdkLoader = vi.fn(async () => sdk);
    hook();
    await act(() => startCall(deps({ sdk: sdkLoader })));
    await act(() => startCall(deps({ sdk: sdkLoader })));
    expect(sdkLoader).toHaveBeenCalledTimes(1);
  });
});

describe('warmSdk', () => {
  it('loads the SDK once and keeps the promise', async () => {
    const first = warmSdk();
    expect(warmSdk()).toBe(first);
    expect(await first).toHaveProperty('start');
  });
});
