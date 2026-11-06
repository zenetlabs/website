import { useHydrated } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { BandSection } from '@/components/band-section';
import { CtaLink } from '@/components/cta-link';
import { SlotRail } from '@/components/next-slots';
import { EmphasisTitle } from '@/components/section';
import { BAND_CARD, LEAD, TEXT_LINK } from '@/components/ui';
import { CallLink } from '@/components/voice-button';
import type { DoorCopy, HomeContent } from '@/content/types';
import { requestChat } from '@/lib/chat-open';
import type { Locale } from '@/lib/i18n';
import { navHref } from '@/lib/nav';
import { isPublished, type SiteFlags } from '@/lib/page-registry';
import { isPlainClick } from '@/lib/plain-click';
import { PUBLIC_EMAIL, SITE } from '@/lib/site';
import { track } from '@/lib/track';
import { voiceAvailable } from '@/lib/voice-entry';

function DoorText({ copy }: { copy: DoorCopy }) {
  return (
    <>
      <span>
        <span className="block">{copy.title}</span>
        <span className="door-text">{copy.text}</span>
      </span>
      <span aria-hidden="true" className="icon icon-arrow door-arrow" />
    </>
  );
}

function AskDoor({ copy, locale }: { copy: DoorCopy; locale: Locale }) {
  const hydrated = useHydrated();
  return (
    <CtaLink
      cta="close_ask"
      href={navHref(locale, { page: 'contact' })}
      popup={hydrated ? 'dialog' : undefined}
      onClick={(event) => {
        if (!hydrated || !isPlainClick(event)) return;
        event.preventDefault();
        track('chat_open', { entry: 'close' });
        requestChat(null, null);
      }}
      className="door"
    >
      <DoorText copy={copy} />
    </CtaLink>
  );
}

// The close, the desk again on the band: the doors that are live (ask, call),
// the contact form one step away, and, while booking is published, the next
// free times in a card.
export function HomeClose({
  copy,
  doors,
  slots,
  locale,
  site = SITE,
}: {
  copy: HomeContent['contact'];
  doors: HomeContent['doors'];
  slots: HomeContent['desk']['slots'];
  locale: Locale;
  site?: SiteFlags;
}) {
  const booking = isPublished('book', site);
  const list: ReactNode[] = [];
  if (__ASSISTANT__) {
    list.push(
      <li key="ask" data-needs-js>
        <AskDoor copy={doors.ask} locale={locale} />
      </li>,
    );
  }
  if (doors.call && voiceAvailable(locale)) {
    list.push(
      <li key="call" data-needs-js>
        <CallLink locale={locale} cta="close_call" className="door">
          <DoorText copy={doors.call} />
        </CallLink>
      </li>,
    );
  }
  list.push(
    <li key="write">
      <CtaLink
        cta="close_contact"
        href={navHref(locale, { page: 'contact' })}
        className="door"
      >
        <DoorText copy={doors.write} />
      </CtaLink>
    </li>,
  );
  return (
    <BandSection
      id="contact"
      labelledBy="contact-title"
      containerClassName="grid gap-10 lg:grid-cols-12 lg:items-start lg:gap-16"
    >
      <div className={booking ? 'lg:col-span-6' : 'lg:col-span-8'}>
        <h2 id="contact-title">
          <EmphasisTitle parts={copy.title} />
        </h2>
        {copy.lead ? <p className={`mt-5 ${LEAD}`}>{copy.lead}</p> : null}
        <ul
          data-doors
          className={`mt-8 grid gap-3 ${booking ? '' : 'md:grid-cols-2'}`}
        >
          {list}
        </ul>
        <p className="mt-8">
          {copy.mail}{' '}
          <a href={`mailto:${PUBLIC_EMAIL}`} className={TEXT_LINK}>
            {PUBLIC_EMAIL}
          </a>
        </p>
        <p className="mt-2 text-ui-s text-muted-fg">{copy.human}</p>
      </div>
      {booking ? (
        <div className={`lg:col-span-6 ${BAND_CARD}`}>
          <SlotRail
            copy={slots}
            locale={locale}
            booking
            className="slot-card"
          />
        </div>
      ) : null}
    </BandSection>
  );
}
