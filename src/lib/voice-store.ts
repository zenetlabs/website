import { useSyncExternalStore } from 'react';
import type { VoiceCopy } from '@/content/types';
import type { Locale } from '@/lib/i18n';
import { track } from '@/lib/track';
import { mintVoiceSession, type VoiceError } from '@/lib/voice-client';
import {
  loadVoiceSdk,
  type VoiceCall,
  type VoiceEnd,
  type VoiceSdk,
} from '@/lib/voice-sdk';
import { bookedLabel, navigateTool } from '@/lib/voice-tools';

type VoicePhase = 'intro' | 'connecting' | 'live' | 'ended' | 'error';
export type VoiceFailure = VoiceError | 'mic' | 'unsupported' | 'call';
type VoiceLine = { id: number; role: 'user' | 'agent'; text: string };
type VoiceNotice = { kind: 'opened' | 'booked'; label: string };

export type VoiceState = {
  phase: VoicePhase;
  failure: VoiceFailure | null;
  muted: boolean;
  mode: 'listening' | 'speaking';
  lines: readonly VoiceLine[];
  notice: VoiceNotice | null;
  nextId: number;
};

export const INITIAL: VoiceState = {
  phase: 'intro',
  failure: null,
  muted: false,
  mode: 'listening',
  lines: [],
  notice: null,
  nextId: 1,
};

export type VoiceEvent =
  | { t: 'start' }
  | { t: 'connected' }
  | { t: 'mode'; mode: 'listening' | 'speaking' }
  | { t: 'message'; role: 'user' | 'agent'; text: string }
  | { t: 'muted'; muted: boolean }
  | { t: 'notice'; notice: VoiceNotice }
  | { t: 'ended' }
  | { t: 'failed'; failure: VoiceFailure }
  | { t: 'reset' };

const MAX_LINES = 200;

export function reduce(state: VoiceState, event: VoiceEvent): VoiceState {
  switch (event.t) {
    case 'start':
      return { ...INITIAL, phase: 'connecting' };
    case 'connected':
      return state.phase === 'connecting' ? { ...state, phase: 'live' } : state;
    case 'mode':
      return { ...state, mode: event.mode };
    case 'message': {
      const text = event.text.trim();
      if (text === '') return state;
      const line = { id: state.nextId, role: event.role, text };
      return {
        ...state,
        lines: [...state.lines, line].slice(-MAX_LINES),
        nextId: state.nextId + 1,
      };
    }
    case 'muted':
      return { ...state, muted: event.muted };
    case 'notice':
      return { ...state, notice: event.notice };
    case 'ended':
      return state.phase === 'error' || state.phase === 'intro'
        ? state
        : { ...state, phase: 'ended', muted: false };
    case 'failed':
      return { ...state, phase: 'error', failure: event.failure, muted: false };
    case 'reset':
      return INITIAL;
  }
}

let state: VoiceState = INITIAL;
let call: VoiceCall | null = null;
let run = 0;
let sdkLoad: Promise<VoiceSdk> | null = null;
const listeners = new Set<() => void>();

function dispatch(event: VoiceEvent): void {
  state = reduce(state, event);
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useVoiceState(): VoiceState {
  return useSyncExternalStore(
    subscribe,
    () => state,
    () => INITIAL,
  );
}

// Called when the panel opens, so the SDK's audio unlock is armed before the
// visitor taps "Start call" (iOS Safari plays nothing otherwise).
export function warmSdk(): Promise<VoiceSdk> {
  sdkLoad ??= loadVoiceSdk();
  sdkLoad.catch(() => {
    sdkLoad = null;
  });
  return sdkLoad;
}

export type MicResult = 'granted' | 'denied' | 'error';

export type StartDeps = {
  locale: Locale;
  page: string;
  timeZone: string;
  copy: Pick<VoiceCopy, 'pages' | 'sections'>;
  supported: () => boolean;
  requestMic: () => Promise<MicResult>;
  token: () => Promise<string>;
  push: (href: string) => void;
  sdk?: () => Promise<VoiceSdk>;
  fetch?: typeof fetch;
};

function outcome(end: VoiceEnd): VoiceEvent {
  return end === 'error' ? { t: 'failed', failure: 'call' } : { t: 'ended' };
}

// The order matters: a denied microphone costs no ElevenLabs session and no
// slot in the day's cap, and nothing is minted before Turnstile passes.
export async function startCall(deps: StartDeps): Promise<void> {
  if (state.phase === 'connecting' || state.phase === 'live') return;
  run += 1;
  const mine = run;
  const current = () => run === mine;
  const emit = (event: VoiceEvent) => {
    if (current()) dispatch(event);
  };
  const fail = (failure: VoiceFailure) => emit({ t: 'failed', failure });
  dispatch({ t: 'start' });

  if (!deps.supported()) return fail('unsupported');
  const mic = await deps.requestMic();
  if (!current()) return;
  if (mic !== 'granted') return fail(mic === 'denied' ? 'mic' : 'call');

  let turnstileToken: string;
  try {
    turnstileToken = await deps.token();
  } catch {
    return fail('captcha');
  }
  if (!current()) return;
  const minted = await mintVoiceSession(
    {
      locale: deps.locale,
      page: deps.page,
      timeZone: deps.timeZone,
      turnstileToken,
    },
    deps.fetch,
  );
  if (!current()) return;
  if (!minted.ok) return fail(minted.error);

  try {
    const sdk = await (deps.sdk ?? warmSdk)();
    if (!current()) return;
    const started = await sdk.start({
      token: minted.token,
      sessionId: minted.sessionId,
      tools: {
        navigate: navigateTool({
          locale: deps.locale,
          copy: deps.copy,
          push: deps.push,
          onOpened: (label) =>
            emit({ t: 'notice', notice: { kind: 'opened', label } }),
        }),
      },
      events: {
        onConnect: () => {
          if (!current()) return;
          dispatch({ t: 'connected' });
          track('voice_call_start');
        },
        onDisconnect: (end) => emit(outcome(end)),
        onMode: (mode) => emit({ t: 'mode', mode }),
        onMessage: (role, text) => emit({ t: 'message', role, text }),
        onToolResult: (name, result) => {
          const label = name === 'book_meeting' ? bookedLabel(result) : null;
          if (!current() || label === null) return;
          dispatch({ t: 'notice', notice: { kind: 'booked', label } });
          track('book_meeting');
          track('generate_lead', { method: 'voice' });
        },
        // An error ends the conversation too: the microphone and the minutes
        // must not keep running behind an error message.
        onError: () => {
          fail('call');
          run += 1;
          const open = call;
          call = null;
          void open?.end().catch(() => undefined);
        },
      },
    });
    if (current()) call = started;
    else await started.end();
  } catch {
    fail('call');
  }
}

export async function endCall(): Promise<void> {
  run += 1;
  const open = call;
  call = null;
  dispatch({ t: 'ended' });
  await open?.end().catch(() => undefined);
}

export function toggleMute(): void {
  const muted = !state.muted;
  call?.setMuted(muted);
  dispatch({ t: 'muted', muted });
}

// Back to the intro, for "Start a new call" and for closing the panel.
export async function resetCall(): Promise<void> {
  await endCall();
  dispatch({ t: 'reset' });
}
