import { useSyncExternalStore } from 'react';
import { ChallengeCancelled } from '@/lib/challenge-cancel';
import { postChat } from '@/lib/chat-client';
import type { ChatError, ChatEvent, Proposal } from '@/lib/chat-events';
import { setChatSessionId } from '@/lib/chat-session';
import { offeredTimes, withoutListedTimes } from '@/lib/chat-slot-text';
import type { Locale } from '@/lib/i18n';
import type { NavigateSection } from '@/lib/navigate';
import type { PageId } from '@/lib/page-registry';
import { track } from '@/lib/track';

type ItemBody =
  | { kind: 'user' | 'assistant' | 'notice'; text: string }
  | { kind: 'slots'; zone: string; starts: readonly number[] }
  | {
      kind: 'navigate';
      page: PageId;
      section: NavigateSection | null;
      href: string;
    };

export type ChatItem = ItemBody & { id: number };

type ChatStatus = 'idle' | 'verifying' | 'writing' | 'tool';

export type ChatState = {
  locale: Locale | null;
  sessionId: string | null;
  items: readonly ChatItem[];
  streaming: string;
  status: ChatStatus;
  tool: string | null;
  remaining: number | null;
  proposal: Proposal | null;
  failure: ChatError | null;
  cut: boolean;
  // The times check_availability returned this turn: chips under the reply
  // once it settles; dropped if the turn proposes a booking.
  slots: TurnSlots | null;
  nextId: number;
};

export type TurnSlots = { zone: string; starts: readonly number[] };

export const EMPTY: ChatState = {
  locale: null,
  sessionId: null,
  items: [],
  streaming: '',
  status: 'idle',
  tool: null,
  remaining: null,
  proposal: null,
  failure: null,
  cut: false,
  slots: null,
  nextId: 1,
};

function push(
  state: ChatState,
  item: ItemBody,
): Pick<ChatState, 'items' | 'nextId'> {
  return {
    items: [...state.items, { ...item, id: state.nextId }],
    nextId: state.nextId + 1,
  };
}

// The reply as shown: without the bare list of times the chips carry (the
// prompt asks for none; this is the safety net).
export function shownText(text: string, slots: TurnSlots | null): string {
  return slots === null
    ? text.trim()
    : withoutListedTimes(text, offeredTimes(slots.starts, slots.zone));
}

// The text streamed so far becomes a finished message (the visible swap that
// screen readers announce once), then the turn's chips.
function settle(state: ChatState): ChatState {
  const text = shownText(state.streaming, state.slots);
  const withText =
    text === ''
      ? state
      : { ...state, ...push(state, { kind: 'assistant', text }) };
  const withChips =
    state.slots === null
      ? withText
      : { ...withText, ...push(withText, { kind: 'slots', ...state.slots }) };
  return {
    ...withChips,
    streaming: '',
    slots: null,
    tool: null,
    status: 'idle',
  };
}

export function applyEvent(state: ChatState, event: ChatEvent): ChatState {
  switch (event.t) {
    case 'session':
      return { ...state, sessionId: event.id };
    case 'tool':
      return { ...state, status: 'tool', tool: event.name };
    case 'text':
      return {
        ...state,
        status: 'writing',
        tool: null,
        streaming: state.streaming + event.v,
      };
    case 'navigate':
      return {
        ...state,
        ...push(state, {
          kind: 'navigate',
          page: event.page,
          section: event.section ?? null,
          href: event.href,
        }),
      };
    case 'slots':
      return {
        ...state,
        slots:
          event.starts.length === 0
            ? null
            : { zone: event.zone, starts: event.starts },
      };
    case 'confirm_booking':
      return { ...state, proposal: event.proposal, slots: null };
    case 'error':
      return { ...state, cut: true };
    case 'done':
      return { ...settle(state), remaining: event.remaining };
  }
}

export function begin(
  state: ChatState,
  text: string,
  verifying: boolean,
): ChatState {
  return {
    ...state,
    ...push(state, { kind: 'user', text }),
    status: verifying ? 'verifying' : 'writing',
    failure: null,
    cut: false,
    slots: null,
  };
}

export function fail(state: ChatState, error: ChatError): ChatState {
  return { ...settle(state), failure: error };
}

let state: ChatState = EMPTY;
let controller: AbortController | null = null;
const listeners = new Set<() => void>();

function set(next: ChatState): void {
  state = next;
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function snapshot(): ChatState {
  return state;
}

export function hasChatSession(): boolean {
  return state.sessionId !== null;
}

export function chatIdle(): boolean {
  return state.status === 'idle';
}

export function useChatState(): ChatState {
  return useSyncExternalStore(subscribe, snapshot, snapshot);
}

export function resetChat(locale: Locale): void {
  controller?.abort();
  controller = null;
  setChatSessionId(null);
  set({ ...EMPTY, locale });
}

// A conversation belongs to one language: opening the panel on the other site starts fresh.
export function ensureLocale(locale: Locale): void {
  if (state.locale !== locale) resetChat(locale);
}

export function dismissProposal(): void {
  set({ ...state, proposal: null });
}

// A chip in a chat reply starts the booking card for that time; the visitor
// writes the topic in the card.
export function proposeSlot(start: number): void {
  set({
    ...state,
    proposal: { slot: new Date(start).toISOString(), topic: '' },
  });
}

export function addNotice(text: string): void {
  set({ ...state, proposal: null, ...push(state, { kind: 'notice', text }) });
}

export type SendContext = {
  locale: Locale;
  page: string;
  timeZone: string;
  token: () => Promise<string>;
  resetToken: () => void;
  newSession: string;
};

type Source = { sessionId: string } | { turnstileToken: string };

async function source(
  viaSession: boolean,
  context: SendContext,
): Promise<Source | 'cancelled' | null> {
  if (viaSession && state.sessionId !== null) {
    return { sessionId: state.sessionId };
  }
  try {
    return { turnstileToken: await context.token() };
  } catch (error) {
    return error instanceof ChallengeCancelled ? 'cancelled' : null;
  }
}

// Stops reading the moment the conversation was reset: events of an old stream
// must never land in a fresh chat.
async function consume(
  events: AsyncIterable<ChatEvent>,
  signal: AbortSignal,
): Promise<void> {
  for await (const event of events) {
    if (signal.aborted) return;
    set(applyEvent(state, event));
    if (event.t === 'session') setChatSessionId(event.id);
  }
  if (!signal.aborted && state.status !== 'idle') set(settle(state));
}

export async function send(text: string, context: SendContext): Promise<void> {
  const message = text.trim();
  if (message === '' || state.status !== 'idle') return;
  track('chat_message');
  const abort = new AbortController();
  controller = abort;
  let viaSession = state.sessionId !== null;
  set(begin(state, message, !viaSession));
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const origin = await source(viaSession, context);
    if (origin === 'cancelled') {
      // The visitor closed the panel mid-check: the message stays, unsent,
      // and nothing reports a failed check.
      set(settle(state));
      return;
    }
    if (origin === null) {
      set(fail(state, 'captcha'));
      return;
    }
    set({ ...state, status: 'writing' });
    const response = await postChat(
      {
        locale: context.locale,
        message,
        page: context.page,
        timeZone: context.timeZone,
        ...origin,
      },
      abort.signal,
    );
    if (abort.signal.aborted) return;
    if (response.ok) {
      await consume(response.events, abort.signal);
      return;
    }
    if (response.error === 'session' && viaSession) {
      setChatSessionId(null);
      set({
        ...state,
        sessionId: null,
        ...push(state, { kind: 'notice', text: context.newSession }),
        status: 'verifying',
      });
      viaSession = false;
      continue;
    }
    if (response.error === 'captcha' && !viaSession) {
      context.resetToken();
      continue;
    }
    set(fail(state, response.error));
    return;
  }
  set(fail(state, 'captcha'));
}
