import { useRef } from 'react';
import { DeskAsk, DeskHead } from '@/components/desk-ask';
import { SlotRail } from '@/components/next-slots';
import { CallLink } from '@/components/voice-button';
import type { DeskCopy } from '@/content/types';
import { deskWords } from '@/lib/desk-words';
import type { Locale } from '@/lib/i18n';
import { isPublished } from '@/lib/page-registry';
import { SITE } from '@/lib/site';
import { voiceAvailable } from '@/lib/voice-entry';

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
