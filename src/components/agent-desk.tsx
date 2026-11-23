import { useHydrated } from '@tanstack/react-router';
import {
  type FormEvent,
  type MouseEvent,
  type ReactNode,
  type RefObject,
  useRef,
} from 'react';
import { SlotRail } from '@/components/next-slots';
import { CallLink } from '@/components/voice-button';
import type { DeskCopy } from '@/content/types';
import { CHAT_LIMITS } from '@/lib/assistant-limits';
import { requestChat } from '@/lib/chat-open';
import { prefetchChat } from '@/lib/chat-prefetch';
import { deskWords } from '@/lib/desk-words';
import type { Locale } from '@/lib/i18n';
import { contactWithMessage, navHref } from '@/lib/nav';
import { isPublished } from '@/lib/page-registry';
import { isPlainClick } from '@/lib/plain-click';
import { SITE } from '@/lib/site';
import { type ChatEntry, track } from '@/lib/track';
import { voiceAvailable } from '@/lib/voice-entry';

// The mark, the name and, while the assistant is published, its badge: the
// head of the hero desk and of the home close card.
export function DeskHead({
  as: Heading,
  id,
  title,
  badge,
  children,
}: {
  as: 'h2' | 'h3';
  id?: string;
  title: string;
  badge: string;
  children?: ReactNode;
}) {
  return (
    <div className="desk-head">
      <span aria-hidden="true" className="desk-mark" />
      <div className="desk-id">
        <Heading id={id} className="desk-name">
          {title}
        </Heading>
        {__ASSISTANT__ ? <span className="desk-badge">{badge}</span> : null}
      </div>
      {children}
    </div>
  );
}

// The chips and the composer, on the hero desk and again in the home close.
// Both work on the server render, as links and a GET form to the contact page.
// Once hydrated, and only while the assistant is published, they open the chat
// panel out of `from` with the visitor's message already sent.
export function DeskAsk({
  copy,
  booking,
  locale,
  entry,
  inputId,
  from,
}: {
  copy: DeskCopy;
  booking: boolean;
  locale: Locale;
  entry: Extract<ChatEntry, 'desk' | 'close'>;
  inputId: string;
  from: RefObject<HTMLElement | null>;
}) {
  const hydrated = useHydrated();
  const pressed = useRef(false);
  const { intro } = copy;
  const words = deskWords(copy, booking);
  const live = __ASSISTANT__ && hydrated;

  const prefetch = () => {
    if (__ASSISTANT__) void prefetchChat(locale).catch(() => undefined);
  };

  // Only a pointer opens the panel out of its box; from the keyboard
  // (Enter, or a chip activated with a key) it appears at once.
  function openChat(message: string | null, pointer: boolean) {
    track('chat_open', { entry });
    requestChat(message, pointer ? from.current : null);
  }

  function onChip(event: MouseEvent<HTMLAnchorElement>, suggestion: string) {
    if (!live || !isPlainClick(event)) return;
    event.preventDefault();
    openChat(suggestion, event.detail > 0);
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    if (!live) return;
    event.preventDefault();
    const form = event.currentTarget;
    const message = new FormData(form).get('message');
    openChat(typeof message === 'string' ? message : null, pressed.current);
    pressed.current = false;
    form.reset();
  }

  return (
    <>
      <ul className="desk-chips">
        {intro.suggestions.map((suggestion) => (
          <li key={suggestion}>
            <a
              href={contactWithMessage(locale, suggestion)}
              aria-haspopup={live ? 'dialog' : undefined}
              onClick={(event) => onChip(event, suggestion)}
              onPointerEnter={prefetch}
              onFocus={prefetch}
              className="desk-chip"
            >
              {suggestion}
            </a>
          </li>
        ))}
      </ul>
      <form
        method="get"
        action={navHref(locale, { page: 'contact' })}
        onSubmit={onSubmit}
        onPointerEnter={prefetch}
        onFocus={prefetch}
        className="desk-composer"
      >
        <label htmlFor={inputId} className="sr-only">
          {words.label}
        </label>
        <input
          id={inputId}
          name="message"
          type="text"
          autoComplete="off"
          enterKeyHint="send"
          maxLength={CHAT_LIMITS.messageChars}
          placeholder={words.placeholder}
          className="desk-input"
        />
        <button
          type="submit"
          aria-label={intro.send}
          onPointerDown={() => {
            pressed.current = true;
          }}
          className="desk-send"
        >
          <span aria-hidden="true" className="icon icon-send size-5" />
        </button>
      </form>
    </>
  );
}

// The home hero's working desk: one surface. The call door is a link to
// contact on the server render too.
export function AgentDesk({
  copy,
  locale,
}: {
  copy: DeskCopy;
  locale: Locale;
}) {
  const desk = useRef<HTMLElement>(null);
  const { call } = copy;
  const booking = isPublished('book', SITE);
  const words = deskWords(copy, booking);

  return (
    <section ref={desk} aria-labelledby="desk-title" data-desk className="desk">
      <DeskHead
        as="h2"
        id="desk-title"
        title={words.title}
        badge={copy.intro.badge}
      >
        {__ASSISTANT__ && call && voiceAvailable(locale) ? (
          <CallLink
            locale={locale}
            cta="desk_call"
            label={call.label}
            data-needs-js
            className="chat-talk"
          >
            <span aria-hidden="true" className="icon icon-phone" />
            <span className="max-sm:hidden">{call.button}</span>
          </CallLink>
        ) : null}
      </DeskHead>
      <div className="desk-body">
        <p className="desk-bubble">{words.welcome}</p>
        <DeskAsk
          copy={copy}
          booking={booking}
          locale={locale}
          entry="desk"
          inputId="desk-message"
          from={desk}
        />
      </div>
      <SlotRail copy={copy.slots} locale={locale} booking={booking} />
    </section>
  );
}
