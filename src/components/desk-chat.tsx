import type { RefObject } from 'react';
import { DeskAsk, DeskHead } from '@/components/desk-ask';
import { CallLink } from '@/components/voice-button';
import type { DeskCopy } from '@/content/types';
import { deskWords } from '@/lib/desk-words';
import type { Locale } from '@/lib/i18n';
import { voiceAvailable } from '@/lib/voice-entry';

// The hero desk's head and conversation: the name and badge, the Call door
// (a link to contact on the server render too), the greeting, the chips and
// the composer. Home's desk and the contact page's desk share it.
export function DeskChat({
  copy,
  locale,
  booking,
  from,
}: {
  copy: DeskCopy;
  locale: Locale;
  booking: boolean;
  from: RefObject<HTMLElement | null>;
}) {
  const { call } = copy;
  const words = deskWords(copy, booking);
  return (
    <>
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
          from={from}
        />
      </div>
    </>
  );
}
