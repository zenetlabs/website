import { useHydrated } from '@tanstack/react-router';
import { type FormEvent, type MouseEvent, useRef } from 'react';
import { FounderPortrait } from '@/components/companies-strip';
import { SlotRail } from '@/components/next-slots';
import { CallLink } from '@/components/voice-button';
import type { DeskCopy, Founder } from '@/content/types';
import { CHAT_LIMITS } from '@/lib/assistant-limits';
import { requestChat } from '@/lib/chat-open';
import { prefetchChat } from '@/lib/chat-prefetch';
import type { Locale } from '@/lib/i18n';
import { contactWithMessage, navHref } from '@/lib/nav';
import { isPublished, pagePath } from '@/lib/page-registry';
import { isPlainClick } from '@/lib/plain-click';
import { SITE } from '@/lib/site';
import { track } from '@/lib/track';
import { voiceAvailable } from '@/lib/voice-entry';

// The person behind the agent: the founder, in the amber of a person, linked
// to the page about him.
function Handoff({
  founder,
  line,
  locale,
}: {
  founder: Founder;
  line: string;
  locale: Locale;
}) {
  return (
    <a href={pagePath(locale, 'about')} className="handoff">
      <FounderPortrait founder={founder} className="" />
      <span className="text-ui-s leading-snug">
        <span className="font-semibold">{founder.name}</span>, {founder.role}
        <span className="block text-fg-soft">{line}</span>
      </span>
    </a>
  );
}

// The home hero's working desk. Every control works on the server render: the
// chips and the composer are links and a GET form to the contact page, the
// call door is a link there too. Once hydrated, and only while the assistant
// is published, they open the chat panel from the desk's own box with the
// visitor's message already sent.
export function AgentDesk({
  copy,
  locale,
  founder,
}: {
  copy: DeskCopy;
  locale: Locale;
  founder: Founder;
}) {
  const hydrated = useHydrated();
  const desk = useRef<HTMLElement>(null);
  const pressed = useRef(false);
  const { intro, human, call } = copy;
  const booking = isPublished('book', SITE);
  const live = __ASSISTANT__ && hydrated;
  // While the assistant is dark the desk says who really answers: a person,
  // by email. Only a live assistant offers to find a time.
  const words = __ASSISTANT__
    ? {
        title: intro.title,
        welcome: booking ? intro.welcome + intro.welcomeBooking : intro.welcome,
        label: copy.label,
        placeholder: intro.placeholder,
      }
    : human;

  const prefetch = () => {
    if (__ASSISTANT__) void prefetchChat(locale).catch(() => undefined);
  };

  // Only a pointer opens the panel out of the desk; from the keyboard
  // (Enter, or a chip activated with a key) it appears at once.
  function openChat(message: string | null, pointer: boolean) {
    track('chat_open', { entry: 'desk' });
    requestChat(message, pointer ? desk.current : null);
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
    <div className="desk-wrap">
      <section
        ref={desk}
        aria-labelledby="desk-title"
        data-desk
        className="desk"
      >
        <div className="desk-head">
          <span aria-hidden="true" className="desk-mark" />
          <h2 id="desk-title" className="desk-name">
            {words.title}
          </h2>
          {__ASSISTANT__ ? (
            <span className="desk-badge">{intro.badge}</span>
          ) : null}
        </div>
        <div className="desk-body">
          <p className="desk-bubble">{words.welcome}</p>
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
            <label htmlFor="desk-message" className="sr-only">
              {words.label}
            </label>
            <input
              id="desk-message"
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
        </div>
        {call && voiceAvailable(locale) ? (
          <div className="desk-call" data-desk-call data-needs-js>
            <span className="desk-wave">
              <span aria-hidden="true" className="icon icon-wave size-5" />
            </span>
            <p className="text-ui-s text-fg-soft">{call.text}</p>
            <CallLink
              locale={locale}
              cta="desk_call"
              className="desk-call-button"
            >
              <span aria-hidden="true" className="icon icon-phone size-5" />
              {call.button}
            </CallLink>
          </div>
        ) : null}
        <SlotRail copy={copy.slots} locale={locale} booking={booking} />
      </section>
      <Handoff founder={founder} line={copy.handoff} locale={locale} />
    </div>
  );
}
