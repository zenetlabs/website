import { type ReactNode, useRef } from 'react';
import { DeskAsk, DeskHead } from '@/components/agent-desk';
import { BandSection } from '@/components/band-section';
import { CtaLink } from '@/components/cta-link';
import { SlotRail } from '@/components/next-slots';
import { EmphasisTitle } from '@/components/section';
import { BAND_CARD, LEAD, TEXT_LINK } from '@/components/ui';
import { CallLink } from '@/components/voice-button';
import type { DeskCopy, DoorCopy, HomeContent } from '@/content/types';
import { deskWords } from '@/lib/desk-words';
import type { Locale } from '@/lib/i18n';
import { navHref } from '@/lib/nav';
import { isPublished, type SiteFlags } from '@/lib/page-registry';
import { PUBLIC_EMAIL, SITE } from '@/lib/site';
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

// The close, the desk again on the band: the live doors (call, write), and a
// card with the desk's chips and composer and, while booking is published, the
// next free times.
export function HomeClose({
  copy,
  doors,
  desk,
  locale,
  site = SITE,
}: {
  copy: HomeContent['contact'];
  doors: HomeContent['doors'];
  desk: DeskCopy;
  locale: Locale;
  site?: SiteFlags;
}) {
  const booking = isPublished('book', site);
  const card = useRef<HTMLDivElement>(null);
  const words = deskWords(desk, booking);
  const list: ReactNode[] = [];
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
      <div className="lg:col-span-6">
        <h2 id="contact-title">
          <EmphasisTitle parts={copy.title} />
        </h2>
        {copy.lead ? <p className={`mt-5 ${LEAD}`}>{copy.lead}</p> : null}
        <ul data-doors className="mt-8 grid gap-3">
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
      <div
        ref={card}
        data-close-desk
        className={`lg:col-span-6 ${BAND_CARD} close-desk`}
      >
        <DeskHead as="h3" title={words.title} badge={desk.intro.badge} />
        <DeskAsk
          copy={desk}
          booking={booking}
          locale={locale}
          entry="close"
          inputId="close-message"
          from={card}
        />
        {booking ? (
          <SlotRail
            copy={desk.slots}
            locale={locale}
            booking
            className="slot-card close-desk-rail"
          />
        ) : null}
      </div>
    </BandSection>
  );
}
