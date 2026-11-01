import type { TurnstileInstance } from '@marsidev/react-turnstile';
import { useRouter } from '@tanstack/react-router';
import {
  type FormEvent,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
  useId,
  useRef,
  useState,
} from 'react';
import { BookingCard } from '@/components/chat/booking-card';
import { CONTROL, LazyTurnstile } from '@/components/form-parts';
import {
  PRIMARY_BUTTON,
  SECONDARY_BUTTON_SM,
  TEXT_LINK,
} from '@/components/ui';
import type { ChatCopy } from '@/content/types';
import { CHAT_LIMITS } from '@/lib/chat-events';
import {
  addNotice,
  type ChatItem,
  dismissProposal,
  ensureLocale,
  send,
  useChatState,
} from '@/lib/chat-store';
import type { Locale } from '@/lib/i18n';
import { navHref } from '@/lib/nav';
import { pagePath } from '@/lib/page-registry';
import { PUBLIC_EMAIL } from '@/lib/site';
import { noop } from '@/lib/time';

const TOKEN_TIMEOUT_MS = 30_000;
const LOW_REMAINING = 5;
const FALLBACK: ReadonlySet<string> = new Set([
  'budget',
  'unavailable',
  'session-full',
  'invalid',
  'too-large',
  'origin',
  'unsupported',
]);

function Speaker({ children }: { children: ReactNode }) {
  return <span className="sr-only">{children}: </span>;
}

function Contact({
  locale,
  copy,
  booking,
}: {
  locale: Locale;
  copy: ChatCopy;
  booking: boolean;
}) {
  return (
    <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
      {booking ? (
        <li>
          <a href={pagePath(locale, 'book')} className={TEXT_LINK}>
            {copy.fallback.book}
          </a>
        </li>
      ) : null}
      <li>
        <a
          href={navHref(locale, { page: 'home', section: 'contact' })}
          className={TEXT_LINK}
        >
          {copy.fallback.form}
        </a>
      </li>
      <li>
        <a href={`mailto:${PUBLIC_EMAIL}`} className={TEXT_LINK}>
          {PUBLIC_EMAIL}
        </a>
      </li>
    </ul>
  );
}

function toolLabel(copy: ChatCopy, name: string): string {
  const found = Object.entries(copy.tools).find(([tool]) => tool === name);
  return found?.[1] ?? copy.writing;
}

function labelFor(
  item: Extract<ChatItem, { kind: 'navigate' }>,
  copy: ChatCopy,
) {
  return item.section === null
    ? copy.pages[item.page]
    : copy.sections[item.section];
}

export function ChatPanel({
  locale,
  copy,
  booking,
  onClose,
}: {
  locale: Locale;
  copy: ChatCopy;
  booking: boolean;
  onClose: () => void;
}) {
  const state = useChatState();
  const router = useRouter();
  const [draft, setDraft] = useState('');
  const [ready, setReady] = useState(false);
  const [zone] = useState(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone,
  );
  const widget = useRef<TurnstileInstance>(undefined);
  const dialog = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const titleId = useId();
  const noticeId = useId();
  const inputId = useId();
  const busy = state.status !== 'idle';
  const canSend = !busy && (state.sessionId !== null || ready);
  const welcome = booking ? copy.welcome + copy.welcomeBooking : copy.welcome;
  const suggestions = booking
    ? [...copy.suggestions, copy.suggestionBooking]
    : copy.suggestions;
  const showFallback = state.failure !== null && FALLBACK.has(state.failure);
  const status =
    state.status === 'verifying'
      ? copy.verifying
      : state.status === 'tool' && state.tool !== null
        ? toolLabel(copy, state.tool)
        : state.status === 'writing'
          ? copy.writing
          : '';

  function submit(text: string) {
    if (!canSend || text.trim() === '') return;
    setDraft('');
    void send(text, {
      locale,
      page: location.pathname,
      timeZone: zone,
      newSession: copy.newSession,
      resetToken: () => widget.current?.reset(),
      token: async () => {
        const instance = widget.current;
        if (!instance) throw new Error('no challenge');
        instance.reset();
        instance.execute();
        return instance.getResponsePromise(TOKEN_TIMEOUT_MS);
      },
    });
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    submit(draft);
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (
      event.key !== 'Enter' ||
      event.shiftKey ||
      event.nativeEvent.isComposing
    ) {
      return;
    }
    event.preventDefault();
    submit(draft);
  }

  function open(item: Extract<ChatItem, { kind: 'navigate' }>) {
    return (event: MouseEvent<HTMLAnchorElement>) => {
      if (
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }
      event.preventDefault();
      dialog.current?.close();
      router.history.push(item.href);
    };
  }

  return (
    <dialog
      ref={(element) => {
        dialog.current = element;
        if (element && !element.open) {
          ensureLocale(locale);
          element.showModal();
          input.current?.focus();
        }
      }}
      onClose={onClose}
      aria-labelledby={titleId}
      aria-describedby={noticeId}
      data-chat-panel
      data-chat-state={state.status}
      className="fixed inset-0 m-0 h-dvh max-h-none w-full max-w-none border-0 bg-bg p-0 text-fg md:inset-auto md:right-4 md:bottom-4 md:h-[min(40rem,85dvh)] md:w-[26rem] md:rounded-card md:border md:border-border backdrop:bg-bg/60"
    >
      <div className="flex h-full flex-col">
        <header className="flex items-center justify-between gap-3 border-b border-hairline px-4 py-3">
          <div className="flex items-center gap-2">
            <h2
              id={titleId}
              className="font-sans text-base font-semibold leading-snug tracking-normal"
            >
              {copy.title}
            </h2>
            <span className="rounded-input border border-border px-1.5 py-0.5 font-mono text-xs">
              {copy.badge}
            </span>
          </div>
          <button
            type="button"
            aria-label={copy.close}
            onClick={() => dialog.current?.close()}
            className="inline-flex size-11 items-center justify-center rounded-input hover:bg-surface"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="size-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </header>
        <p
          id={noticeId}
          className="border-b border-hairline px-4 py-2 text-xs leading-snug text-muted-fg"
        >
          {copy.notice}{' '}
          <a href={pagePath(locale, 'privacy')} className={TEXT_LINK}>
            {copy.privacyLink}
          </a>
        </p>
        <div className="flex-1 overflow-y-auto px-4 py-3">
          <div role="log" aria-label={copy.logLabel}>
            <ol className="grid gap-3 text-sm">
              <li className="max-w-[90%] rounded-card bg-surface px-3 py-2">
                <Speaker>{copy.assistant}</Speaker>
                {welcome}
              </li>
              {state.items.map((item) =>
                item.kind === 'navigate' ? (
                  <li key={item.id}>
                    <a
                      href={item.href}
                      onClick={open(item)}
                      className={`${SECONDARY_BUTTON_SM} ${TEXT_LINK}`}
                    >
                      {copy.open.replace('{label}', labelFor(item, copy))}
                    </a>
                  </li>
                ) : item.kind === 'notice' ? (
                  <li key={item.id} className="text-xs text-muted-fg">
                    {item.text}
                  </li>
                ) : (
                  <li
                    key={item.id}
                    data-ai-generated={
                      item.kind === 'assistant' ? 'true' : undefined
                    }
                    className={`max-w-[90%] whitespace-pre-line rounded-card px-3 py-2 ${item.kind === 'user' ? 'ml-auto bg-accent text-accent-fg' : 'bg-surface'}`}
                  >
                    <Speaker>
                      {item.kind === 'user' ? copy.you : copy.assistant}
                    </Speaker>
                    {item.text}
                  </li>
                ),
              )}
              {state.streaming === '' ? null : (
                <li
                  aria-hidden="true"
                  data-streaming
                  className="max-w-[90%] whitespace-pre-line rounded-card bg-surface px-3 py-2"
                >
                  {state.streaming}
                </li>
              )}
            </ol>
          </div>
          {state.items.length === 0 ? (
            <ul className="mt-3 flex flex-wrap gap-2">
              {suggestions.map((suggestion) => (
                <li key={suggestion}>
                  <button
                    type="button"
                    disabled={!canSend}
                    onClick={() => submit(suggestion)}
                    className={SECONDARY_BUTTON_SM}
                  >
                    {suggestion}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          {state.proposal === null ? null : (
            <div className="mt-3">
              <BookingCard
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
          {showFallback || state.cut ? (
            <div
              role="alert"
              className="mt-3 rounded-card border border-border p-3 text-sm"
            >
              <p className="font-medium">
                {showFallback ? copy.fallback.title : copy.errorReply}
              </p>
              {state.failure === 'session-full' ? (
                <p>{copy.fallback.full}</p>
              ) : null}
              <p>{copy.fallback.text}</p>
              <Contact locale={locale} copy={copy} booking={booking} />
            </div>
          ) : null}
          {state.failure === 'rate' ? (
            <p role="alert" className="mt-3 text-sm">
              {copy.errorRate}
            </p>
          ) : null}
          {state.failure === 'captcha' ? (
            <p role="alert" className="mt-3 text-sm">
              {copy.errorCaptcha}
            </p>
          ) : null}
        </div>
        <p role="status" className="min-h-6 px-4 text-xs text-muted-fg">
          {status}
          {status === '' &&
          state.remaining !== null &&
          state.remaining <= LOW_REMAINING
            ? copy.remaining.replace('{n}', String(state.remaining))
            : ''}
        </p>
        <form
          onSubmit={onSubmit}
          className="grid gap-2 border-t border-hairline p-3"
        >
          <label htmlFor={inputId} className="sr-only">
            {copy.inputLabel}
          </label>
          <textarea
            id={inputId}
            ref={input}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={onKeyDown}
            maxLength={CHAT_LIMITS.messageChars}
            rows={2}
            placeholder={copy.placeholder}
            className={`${CONTROL} resize-none`}
          />
          <button
            type="submit"
            disabled={!canSend || draft.trim() === ''}
            className={`${PRIMARY_BUTTON} w-full`}
          >
            {copy.send}
          </button>
        </form>
        <LazyTurnstile
          engaged
          action="chat"
          locale={locale}
          instance={widget}
          onToken={noop}
          onError={noop}
          onLoad={() => setReady(true)}
          options={{ appearance: 'interaction-only', execution: 'execute' }}
        />
      </div>
    </dialog>
  );
}
