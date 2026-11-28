import { createFileRoute, useHydrated } from '@tanstack/react-router';
import { lazy, type MouseEvent, type ReactNode, Suspense } from 'react';
import { AgentDesk } from '@/components/agent-desk';
import { BandSection } from '@/components/band-section';
import { type ContactDoorItem, ContactDoors } from '@/components/contact-doors';
import { ContactForm } from '@/components/contact-form';
import { CONTACT_FRAME, ContactIntro } from '@/components/contact-intro';
import { CtaLink } from '@/components/cta-link';
import { PageHero } from '@/components/page-hero';
import { Process } from '@/components/process';
import { BAND_CARD, PRIMARY_BUTTON } from '@/components/ui';
import { VoiceCallout } from '@/components/voice-button';
import { loadContactContent, loadDeskClose } from '@/content/load';
import { doorPanelId, doorTabId, showContactForm } from '@/lib/contact-door';
import { messageParam } from '@/lib/contact-message';
import { CTA_TARGET, navHref } from '@/lib/nav';
import { contactStructuredData } from '@/lib/page-structured-data';
import { contentHead } from '@/lib/pages';
import { isPlainClick } from '@/lib/plain-click';
import { track } from '@/lib/track';

// The live times load only after hydration, load and idle, in a chunk of their
// own: the server render and the fallback are the link to all times.
const LazyContactSlots = lazy(() =>
  import('@/components/contact-slots').then(({ ContactSlots }) => ({
    default: ContactSlots,
  })),
);

export const Route = createFileRoute('/{-$locale}/contact')({
  staticData: { page: 'contact' },
  validateSearch: (raw: Record<string, unknown>) => raw,
  loader: async ({ context }) => {
    const [page, close] = await Promise.all([
      loadContactContent(context.locale),
      loadDeskClose(context.locale),
    ]);
    return { page, desk: close.desk };
  },
  head: ({ match, loaderData }) =>
    loaderData
      ? contentHead(match.context.locale, 'contact', loaderData.page.meta)
      : {},
  scripts: ({ match, loaderData }) =>
    loaderData
      ? contactStructuredData(match.context.locale, loaderData.page)
      : [],
  component: Contact,
});

// Three doors on the band, one open: the message form by default, the booking
// times (while booking is published) and the AI desk (while the assistant is).
// A prefilled arrival opens the message door with the text in the form.
function Contact() {
  const { locale } = Route.useRouteContext();
  const { page, desk } = Route.useLoaderData();
  const hydrated = useHydrated();
  const message = messageParam(Route.useSearch());
  const { voice, ...form } = page.form;
  // The site's booking CTA: /book while booking is published, else this page
  const booking = CTA_TARGET.page === 'book';

  function openMessage(event: MouseEvent<HTMLAnchorElement>) {
    if (!hydrated || !isPlainClick(event)) return;
    event.preventDefault();
    track('cta_click', { cta_id: 'contact_door_message' });
    showContactForm();
    document.getElementById(doorTabId('message'))?.focus();
  }

  const items: ContactDoorItem[] = [];
  if (booking) {
    const waiting = (
      <>
        <div className="desk-rail-head">
          <h2 className="text-ui-l font-semibold">{page.slots.title}</h2>
          <p className="desk-rail-meta" data-slot-meta>
            {page.slots.meta}
          </p>
        </div>
        <div className="grid gap-2" data-slot-fallback="waiting">
          <CtaLink
            cta="contact_book"
            href={navHref(locale, CTA_TARGET)}
            className={PRIMARY_BUTTON}
          >
            {page.slots.seeAvailable}
          </CtaLink>
          <p className="slot-alt">
            <a
              href={`#${doorPanelId('message')}`}
              onClick={openMessage}
              className="font-semibold text-link underline"
            >
              {page.slots.message}
            </a>
          </p>
        </div>
      </>
    );
    const card = (content: ReactNode) => (
      <div className={`contact-book ${BAND_CARD}`} data-slot-rail="live">
        {content}
      </div>
    );
    items.push({
      id: 'book',
      copy: page.doors.book,
      icon: <span aria-hidden="true" className="icon icon-calendar" />,
      before: card(waiting),
      panel: card(
        hydrated ? (
          <Suspense fallback={waiting}>
            <LazyContactSlots
              copy={page.slots}
              locale={locale}
              fallback={waiting}
            />
          </Suspense>
        ) : (
          waiting
        ),
      ),
    });
  }
  items.push({
    id: 'message',
    copy: page.doors.message,
    icon: <span aria-hidden="true" className="icon icon-send" />,
    panel: (
      <div className={CONTACT_FRAME}>
        <ContactIntro copy={form} id="contact-title" />
        <div className="lg:col-span-7">
          <ContactForm
            prefill={message === null ? undefined : { message, method: 'form' }}
          />
          {voice ? (
            <VoiceCallout text={voice.text} button={voice.button} />
          ) : null}
        </div>
      </div>
    ),
  });
  if (__ASSISTANT__) {
    items.push({
      id: 'ai',
      copy: page.doors.ai,
      icon: <span aria-hidden="true" className="desk-mark" />,
      panel: (
        <div className="contact-ai scope-page">
          <AgentDesk copy={desk} locale={locale} footer={null} contact />
        </div>
      ),
    });
  }

  return (
    <>
      <PageHero compact title={page.title} lead={page.lead} />
      <BandSection id="contact" compact>
        <ContactDoors items={items} labelledBy="page-title" />
      </BandSection>
      <Process
        id="next"
        copy={page.next}
        stub={page.next.steps.findIndex((step) => step.id === 'diagnostic')}
      />
    </>
  );
}
