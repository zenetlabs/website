import { type ReactNode, useRef } from 'react';
import { BandSection } from '@/components/band-section';
import { CtaLink } from '@/components/cta-link';
import { DeskAsk, DeskHead } from '@/components/desk-ask';
import { SlotRail } from '@/components/next-slots';
import { BAND_CARD, LEAD, TEXT_LINK } from '@/components/ui';
import { CallLink } from '@/components/voice-button';
import type {
  AssistantIntro,
  DeskCopy,
  DoorCopy,
  FaqItem,
  HomeContent,
  PageCta,
} from '@/content/types';
import { deskWords } from '@/lib/desk-words';
import { faqChips } from '@/lib/faq-chips';
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
// next free times. An inner page passes its `cta` and, for the chips, the
// questions it answers (`faq`: its first two), or no questions for the desk's
// own; home passes its own `title`, `lead` and, in tests, `chips`.
export function DeskClose({
  title,
  lead,
  cta,
  mail,
  human,
  doors,
  desk,
  faq,
  chips = faq ? faqChips(faq.items) : undefined,
  locale,
  site = SITE,
}: {
  title?: ReactNode;
  lead?: string;
  cta?: Pick<PageCta, 'title' | 'text'>;
  mail: string;
  human: string;
  doors: HomeContent['doors'];
  desk: DeskCopy;
  chips?: AssistantIntro['suggestions'];
  faq?: { items: readonly FaqItem[] };
  locale: Locale;
  site?: SiteFlags;
}) {
  const booking = isPublished('book', site);
  const card = useRef<HTMLDivElement>(null);
  const words = deskWords(desk, booking);
  const asked = chips
    ? { ...desk, intro: { ...desk.intro, suggestions: chips } }
    : desk;
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
        <h2 id="contact-title">{cta ? cta.title : title}</h2>
        {cta || lead ? (
          <p className={`mt-5 ${LEAD}`}>{cta ? cta.text : lead}</p>
        ) : null}
        <ul data-doors className="mt-8 grid gap-3">
          {list}
        </ul>
        <p className="mt-8">
          {mail}{' '}
          <a href={`mailto:${PUBLIC_EMAIL}`} className={TEXT_LINK}>
            {PUBLIC_EMAIL}
          </a>
        </p>
        <p className="mt-2 text-ui-s text-muted-fg">{human}</p>
      </div>
      <div
        ref={card}
        data-close-desk
        data-page-chips={chips ? '' : undefined}
        className={`lg:col-span-6 ${BAND_CARD} close-desk`}
      >
        <DeskHead as="h3" title={words.title} badge={desk.intro.badge} />
        <DeskAsk
          copy={asked}
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
            whenNear
            className="slot-card close-desk-rail"
          />
        ) : null}
      </div>
    </BandSection>
  );
}
