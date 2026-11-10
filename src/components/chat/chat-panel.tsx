import { useRouter } from '@tanstack/react-router';
import {
  type FormEvent,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
  type Ref,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import { AiNotice, CloseIcon } from '@/components/chat/ai-notice';
import { BookingCard } from '@/components/chat/booking-card';
import { ChatSlots } from '@/components/chat/chat-slots';
import { usePanelMotion } from '@/components/chat/panel-motion';
import { ContactLinks } from '@/components/contact-links';
import { LazyTurnstile } from '@/components/form-parts';
import { useChallengeOnDemand } from '@/components/use-challenge-on-demand';
import type { ChatCopy } from '@/content/types';
import { CHAT_LIMITS } from '@/lib/assistant-limits';
import {
  addNotice,
  type ChatItem,
  type ChatState,
  chatIdle,
  dismissProposal,
  ensureLocale,
  hasChatSession,
  proposeSlot,
  send,
  shownText,
  useChatState,
} from '@/lib/chat-store';
import type { Locale } from '@/lib/i18n';
import { pagePath } from '@/lib/page-registry';
import { isPlainClick } from '@/lib/plain-click';
import { openVoice, voiceAvailable } from '@/lib/voice-entry';

const LOW_REMAINING = 5;
const CHALLENGE_WAIT_MS = 20_000;
const FALLBACK: ReadonlySet<string> = new Set([
  'budget',
  'unavailable',
  'session-full',
  'invalid',
  'too-large',
  'origin',
  'unsupported',
]);

type NavigateItem = Extract<ChatItem, { kind: 'navigate' }>;

function Speaker({ children }: { children: ReactNode }) {
  return <span className="sr-only">{children}: </span>;
}

function toolLabel(copy: ChatCopy, name: string): string {
  const found = Object.entries(copy.tools).find(([tool]) => tool === name);
  return found?.[1] ?? copy.writing;
}

function labelFor(item: NavigateItem, copy: ChatCopy) {
  return item.section === null
    ? copy.pages[item.page]
    : copy.sections[item.section];
}

function statusText(state: ChatState, copy: ChatCopy, queued: boolean): string {
  if (state.status === 'verifying' || (queued && state.status === 'idle')) {
    return copy.verifying;
  }
  if (state.status === 'tool' && state.tool !== null) {
    return toolLabel(copy, state.tool);
  }
  return state.status === 'writing' ? copy.writing : '';
}

function isSendKey(event: KeyboardEvent<HTMLTextAreaElement>): boolean {
  return (
    event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing
  );
}

function subscribeOnline(listener: () => void): () => void {
  addEventListener('online', listener);
  addEventListener('offline', listener);
  return () => {
    removeEventListener('online', listener);
    removeEventListener('offline', listener);
  };
}

function online(): boolean {
  return navigator.onLine;
}

function alwaysOnline(): boolean {
  return true;
}

function ChatHeader({
  copy,
  titleId,
  canTalk,
  onTalk,
  onClose,
}: {
  copy: ChatCopy;
  titleId: string;
  canTalk: boolean;
  onTalk: () => void;
  onClose: () => void;
}) {
  return (
    <header className="chat-head">
      <span aria-hidden="true" className="desk-mark" />
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-0.5">
        <h2 id={titleId} className="desk-name leading-tight">
          {copy.title}
        </h2>
        <span className="desk-badge">{copy.badge}</span>
      </div>
      {canTalk ? (
        <button
          type="button"
          onClick={onTalk}
          aria-label={copy.talk}
          title={copy.talk}
          className="chat-talk"
        >
          <span aria-hidden="true" className="icon icon-phone" />
        </button>
      ) : null}
      <button
        type="button"
        aria-label={copy.close}
        onClick={onClose}
        className="chat-close"
      >
        <CloseIcon />
      </button>
    </header>
  );
}

// The person behind the agent, in a person's amber: a call with the founder
// while booking is published, the contact page otherwise.
function ChatPerson({
  copy,
  locale,
  booking,
}: {
  copy: ChatCopy;
  locale: Locale;
  booking: boolean;
}) {
  return (
    <div className="chat-person" data-chat-person>
      <span aria-hidden="true" className="monogram size-10">
        <span className="icon icon-human size-5" />
      </span>
      <p className="min-w-0 flex-[1_1_11rem] text-ui-s leading-snug">
        {copy.person.text}
      </p>
      <a
        href={pagePath(locale, booking ? 'book' : 'contact')}
        className="chat-person-link"
      >
        {booking ? copy.person.book : copy.person.write}
      </a>
    </div>
  );
}

function ChatLog({
  copy,
  locale,
  welcome,
  state,
  typing,
  onNavigate,
  onPickSlot,
  onOpen,
}: {
  copy: ChatCopy;
  locale: Locale;
  welcome: string;
  state: ChatState;
  typing: string;
  onNavigate: (
    item: NavigateItem,
    event: MouseEvent<HTMLAnchorElement>,
  ) => void;
  onPickSlot: (start: number) => void;
  onOpen: (href: string, event: MouseEvent<HTMLAnchorElement>) => void;
}) {
  // The turn's chips show once the reply settles (a booking proposed later in
  // the turn drops them); the list the chips carry never shows in the text.
  const streamed = shownText(state.streaming, state.slots);
  return (
    <div role="log" aria-label={copy.logLabel}>
      <ol className="grid gap-3">
        <li className="chat-msg" data-from="agent">
          <Speaker>{copy.assistant}</Speaker>
          {welcome}
        </li>
        {state.items.map((item) => {
          switch (item.kind) {
            case 'navigate':
              return (
                <li key={item.id}>
                  <a
                    href={item.href}
                    onClick={(event) => onNavigate(item, event)}
                    className="chat-link"
                  >
                    {copy.open.replace('{label}', labelFor(item, copy))}
                    <span aria-hidden="true" className="icon icon-arrow" />
                  </a>
                </li>
              );
            case 'notice':
              return (
                <li key={item.id} className="chat-note">
                  {item.text}
                </li>
              );
            case 'slots':
              return (
                <li key={item.id}>
                  <ChatSlots
                    copy={copy}
                    locale={locale}
                    zone={item.zone}
                    starts={item.starts}
                    onPick={onPickSlot}
                    onOpen={onOpen}
                  />
                </li>
              );
            default:
              return (
                <li
                  key={item.id}
                  data-ai-generated={
                    item.kind === 'assistant' ? 'true' : undefined
                  }
                  data-from={item.kind === 'user' ? 'user' : 'agent'}
                  className="chat-msg"
                >
                  <Speaker>
                    {item.kind === 'user' ? copy.you : copy.assistant}
                  </Speaker>
                  {item.text}
                </li>
              );
          }
        })}
        {streamed === '' ? null : (
          <li
            aria-hidden="true"
            data-streaming
            data-from="agent"
            className="chat-msg"
          >
            {streamed}
          </li>
        )}
        {typing === '' || streamed !== '' ? null : (
          <li aria-hidden="true" data-chat-typing className="chat-typing">
            <span className="chat-dots">
              <span />
              <span />
              <span />
            </span>
            {typing}
          </li>
        )}
      </ol>
    </div>
  );
}

function ChatSuggestions({
  suggestions,
  canSend,
  onPick,
}: {
  suggestions: readonly string[];
  canSend: boolean;
  onPick: (suggestion: string) => void;
}) {
  return (
    <ul className="mt-3 flex flex-wrap gap-2">
      {suggestions.map((suggestion) => (
        <li key={suggestion}>
          <button
            type="button"
            disabled={!canSend}
            onClick={() => onPick(suggestion)}
            className="desk-chip text-left"
          >
            {suggestion}
          </button>
        </li>
      ))}
    </ul>
  );
}

function lastUserText(state: ChatState): string | null {
  const item = state.items.findLast((entry) => entry.kind === 'user');
  return item?.kind === 'user' ? item.text : null;
}

function ChatAlerts({
  copy,
  locale,
  booking,
  state,
  unsent,
  challengeFailed,
}: {
  copy: ChatCopy;
  locale: Locale;
  booking: boolean;
  state: ChatState;
  unsent: string | null;
  challengeFailed: boolean;
}) {
  const showFallback = state.failure !== null && FALLBACK.has(state.failure);
  // The contact link carries what the visitor typed, so it is never lost.
  const message = unsent ?? lastUserText(state);
  return (
    <>
      {showFallback || state.cut ? (
        <div role="alert" className="chat-alert" data-chat-alert="fallback">
          <p className="font-semibold text-fg">
            {showFallback ? copy.fallback.title : copy.errorReply}
          </p>
          {state.failure === 'session-full' ? (
            <p>{copy.fallback.full}</p>
          ) : null}
          <p>{copy.fallback.text}</p>
          <ContactLinks
            locale={locale}
            booking={booking}
            labels={copy.fallback}
            message={message}
          />
        </div>
      ) : null}
      {state.failure === 'rate' ? (
        <p role="alert" className="chat-alert" data-chat-alert="rate">
          {copy.errorRate}
        </p>
      ) : null}
      {state.failure === 'captcha' || challengeFailed ? (
        <div role="alert" className="chat-alert" data-chat-alert="captcha">
          <p>{copy.errorCaptcha}</p>
          <ContactLinks
            locale={locale}
            booking={booking}
            labels={copy.fallback}
            message={message}
          />
        </div>
      ) : null}
    </>
  );
}

// Read aloud once per change; the same words show in the typing bubble.
function ChatStatusLine({
  copy,
  state,
  status,
  offline,
}: {
  copy: ChatCopy;
  state: ChatState;
  status: string;
  offline: boolean;
}) {
  const low =
    state.remaining !== null && state.remaining <= LOW_REMAINING
      ? copy.remaining.replace('{n}', String(state.remaining))
      : '';
  const visible = offline ? copy.offline : status === '' ? low : '';
  return (
    <p
      role="status"
      data-chat-status={offline ? 'offline' : undefined}
      className={visible === '' ? 'sr-only' : 'chat-status'}
    >
      {visible === '' ? status : visible}
    </p>
  );
}

function ChatComposer({
  copy,
  inputId,
  inputRef,
  draft,
  canSubmit,
  locked,
  onDraftChange,
  onSubmit,
}: {
  copy: ChatCopy;
  inputId: string;
  inputRef: Ref<HTMLTextAreaElement>;
  draft: string;
  canSubmit: boolean;
  // A message waiting for the challenge: no edit may be lost meanwhile.
  locked: boolean;
  onDraftChange: (value: string) => void;
  onSubmit: () => void;
}) {
  function onFormSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit();
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (!isSendKey(event)) return;
    event.preventDefault();
    onSubmit();
  }

  return (
    <form onSubmit={onFormSubmit} className="chat-composer">
      <label htmlFor={inputId} className="sr-only">
        {copy.inputLabel}
      </label>
      <div className="desk-composer chat-box">
        <textarea
          id={inputId}
          ref={inputRef}
          value={draft}
          onChange={(event) => onDraftChange(event.target.value)}
          onKeyDown={onKeyDown}
          maxLength={CHAT_LIMITS.messageChars}
          readOnly={locked}
          rows={1}
          placeholder={copy.placeholder}
          className="chat-input"
        />
        <button
          type="submit"
          disabled={!canSubmit}
          aria-label={copy.send}
          className="desk-send"
        >
          <span aria-hidden="true" className="icon icon-send size-5" />
        </button>
      </div>
    </form>
  );
}

export function ChatPanel({
  locale,
  copy,
  booking,
  initialMessage = null,
  from = null,
  onClose,
}: {
  locale: Locale;
  copy: ChatCopy;
  booking: boolean;
  initialMessage?: string | null;
  from?: Element | null;
  onClose: () => void;
}) {
  const state = useChatState();
  const router = useRouter();
  // The desk's message waits in the composer until it is sent, so a slow or
  // failed challenge never loses it.
  const [draft, setDraft] = useState(initialMessage ?? '');
  // The challenge has loaded: read only when a message is sent.
  const ready = useRef(false);
  const [queued, setQueued] = useState(false);
  const [noticeOpen, setNoticeOpen] = useState<boolean | null>(null);
  const [challengeFailed, setChallengeFailed] = useState(false);
  const isOnline = useSyncExternalStore(subscribeOnline, online, alwaysOnline);
  const [zone] = useState(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone,
  );
  const challenge = useChallengeOnDemand(challengeDown);
  const input = useRef<HTMLTextAreaElement>(null);
  const pendingMessage = useRef(initialMessage);
  const queueTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const motion = usePanelMotion(from);
  const { dialogRef, content, dismiss } = motion;
  const opened = useRef(false);
  const titleId = useId();
  const noticeId = useId();
  const inputId = useId();
  const busy = state.status !== 'idle';
  const canSend = () => !busy && (state.sessionId !== null || ready.current);
  // A message typed before the challenge has loaded waits for it, shown as the
  // check it is, instead of a send button that does nothing.
  // Once the challenge has failed only a session can carry a message: the
  // captcha alert (with the draft in its contact link) takes over.
  const canQueue =
    !busy &&
    !queued &&
    isOnline &&
    (state.sessionId !== null || !challengeFailed);
  const status = statusText(state, copy, queued);
  const notice = noticeOpen ?? state.items.length === 0;
  const welcome = booking ? copy.welcome + copy.welcomeBooking : copy.welcome;
  const suggestions = booking
    ? [...copy.suggestions, copy.suggestionBooking]
    : copy.suggestions;

  function canSendText(text: string) {
    return canQueue && text.trim() !== '';
  }

  function submit(text: string) {
    if (!canSendText(text)) return;
    if (canSend()) {
      sendText(text);
      return;
    }
    pendingMessage.current = text;
    setQueued(true);
    // A challenge that never loads must not leave the message checking forever.
    clearTimeout(queueTimer.current);
    queueTimer.current = setTimeout(challengeDown, CHALLENGE_WAIT_MS);
  }

  // The challenge failed or never loaded: nothing waits for it any more, and
  // the typed message stays in the composer and in the alert's contact link.
  function challengeDown() {
    clearTimeout(queueTimer.current);
    pendingMessage.current = null;
    setQueued(false);
    setChallengeFailed(true);
  }

  // The desk's message goes out like a typed one once a session or a
  // Turnstile token can carry it. While a reply is still streaming it stays
  // in the composer for the visitor to send.
  function sendPending() {
    clearTimeout(queueTimer.current);
    const text = pendingMessage.current;
    setQueued(false);
    if (text === null) return;
    pendingMessage.current = null;
    if (chatIdle()) sendText(text);
  }

  function openPanel(dialog: HTMLDialogElement) {
    ensureLocale(locale);
    dialog.showModal();
    input.current?.focus();
    motion.grow(dialog);
    if (hasChatSession()) sendPending();
  }

  function sendText(text: string) {
    setDraft('');
    void send(text, {
      locale,
      page: location.pathname,
      timeZone: zone,
      newSession: copy.newSession,
      resetToken: () => challenge.widget.current?.reset(),
      token: challenge.token,
    });
  }

  // A page opened from the chat: inside the app, so the conversation stays.
  function open(href: string, event: MouseEvent<HTMLAnchorElement>) {
    if (!isPlainClick(event)) return;
    event.preventDefault();
    dialogRef.current?.close();
    router.history.push(href);
  }

  function navigate(item: NavigateItem, event: MouseEvent<HTMLAnchorElement>) {
    open(item.href, event);
  }

  return (
    <dialog
      ref={(element) => {
        dialogRef.current = element;
        // Once per mount: a render between close() and the close event must
        // not open it again.
        if (element && !opened.current) {
          opened.current = true;
          openPanel(element);
        }
      }}
      onCancel={(event) => {
        if (!motion.moves()) return;
        event.preventDefault();
        dismiss();
      }}
      onClose={() => {
        // A check still running goes with the panel: no failure on reopening.
        challenge.cancel();
        onClose();
      }}
      aria-labelledby={titleId}
      aria-describedby={noticeId}
      data-chat-panel
      data-chat-state={state.status}
      className="chat-panel"
    >
      <div ref={content} className="flex h-full min-h-0 flex-col">
        <ChatHeader
          copy={copy}
          titleId={titleId}
          canTalk={voiceAvailable(locale)}
          onTalk={() => {
            dialogRef.current?.close();
            openVoice(locale, (href) => router.history.push(href));
          }}
          onClose={dismiss}
        />
        <AiNotice
          copy={copy}
          locale={locale}
          noticeId={noticeId}
          open={notice}
          onToggle={() => setNoticeOpen(!notice)}
          privacyInText={copy.privacyShort}
        />
        {/* Reversed, so the newest message and the streaming reply stay in
            view as the conversation grows; short logs still start at the top. */}
        <div className="chat-scroll">
          <div className="mb-auto">
            <ChatLog
              copy={copy}
              locale={locale}
              welcome={welcome}
              state={state}
              typing={status}
              onNavigate={navigate}
              onOpen={open}
              onPickSlot={(start) => {
                proposeSlot(start);
              }}
            />
            {state.items.length === 0 ? (
              <>
                <ChatSuggestions
                  suggestions={suggestions}
                  canSend={canQueue}
                  onPick={submit}
                />
                <ChatPerson copy={copy} locale={locale} booking={booking} />
              </>
            ) : null}
            {state.proposal === null ? null : (
              <div className="mt-3">
                <BookingCard
                  key={state.proposal.slot}
                  proposal={state.proposal}
                  copy={copy.booking}
                  locale={locale}
                  zone={zone}
                  sessionId={state.sessionId}
                  onDone={(when) => {
                    addNotice(copy.booking.done.replace('{when}', when));
                    input.current?.focus();
                  }}
                  onCancel={() => {
                    dismissProposal();
                    input.current?.focus();
                  }}
                />
              </div>
            )}
            <ChatAlerts
              copy={copy}
              locale={locale}
              booking={booking}
              state={state}
              unsent={draft.trim() === '' ? null : draft.trim()}
              challengeFailed={challengeFailed}
            />
          </div>
        </div>
        <ChatStatusLine
          copy={copy}
          state={state}
          status={status}
          offline={!isOnline}
        />
        <ChatComposer
          copy={copy}
          inputId={inputId}
          inputRef={input}
          draft={draft}
          canSubmit={canSendText(draft)}
          locked={queued}
          onDraftChange={setDraft}
          onSubmit={() => submit(draft)}
        />
        <LazyTurnstile
          engaged
          action="chat"
          locale={locale}
          {...challenge.widgetProps}
          onLoad={() => {
            ready.current = true;
            sendPending();
          }}
          options={{ appearance: 'interaction-only', execution: 'execute' }}
        />
      </div>
    </dialog>
  );
}
