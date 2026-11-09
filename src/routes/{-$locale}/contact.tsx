import { createFileRoute, useHydrated } from '@tanstack/react-router';
import { lazy, Suspense } from 'react';
import { ContactSection } from '@/components/contact-section';
import { CtaLink } from '@/components/cta-link';
import { Process } from '@/components/process';
import { Container, EmphasisTitle } from '@/components/section';
import { sectionFrame } from '@/components/section-frame';
import { LEAD, PRIMARY_BUTTON } from '@/components/ui';
import { VoiceCallout } from '@/components/voice-button';
import { loadContactContent } from '@/content/load';
import { messageParam } from '@/lib/contact-message';
import { CTA_TARGET, navHref } from '@/lib/nav';
import { contactStructuredData } from '@/lib/page-structured-data';
import { contentHead } from '@/lib/pages';

const TINT = sectionFrame('tint');

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
  loader: ({ context }) => loadContactContent(context.locale),
  head: ({ match, loaderData }) =>
    loaderData
      ? contentHead(match.context.locale, 'contact', loaderData.meta)
      : {},
  scripts: ({ match, loaderData }) =>
    loaderData ? contactStructuredData(match.context.locale, loaderData) : [],
  component: Contact,
});

// The desk as a page: booking first (while it is published), then the form on
// the band and what happens next.
function Contact() {
  const { locale } = Route.useRouteContext();
  const page = Route.useLoaderData();
  const hydrated = useHydrated();
  const message = messageParam(Route.useSearch());
  // The booking card above replaces the band's "pick a time" link
  const { voice, book: _book, ...form } = page.form;
  // The site's booking CTA: /book while booking is published, else this page
  const booking = CTA_TARGET.page === 'book';
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
          <a href="#contact" className="font-semibold text-link underline">
            {page.slots.message}
          </a>
        </p>
      </div>
    </>
  );

  return (
    <>
      <section data-ground={TINT.ground} className={TINT.bg}>
        <Container className="page-hero lg:items-center">
          <div className={booking ? 'lg:col-span-6' : 'lg:col-span-8'}>
            <h1 className="max-w-4xl">
              <EmphasisTitle parts={page.title} />
            </h1>
            <p className={`mt-6 ${LEAD}`}>{page.lead}</p>
          </div>
          {booking ? (
            <div className="contact-book lg:col-span-6" data-slot-rail="live">
              {hydrated ? (
                <Suspense fallback={waiting}>
                  <LazyContactSlots
                    copy={page.slots}
                    locale={locale}
                    fallback={waiting}
                  />
                </Suspense>
              ) : (
                waiting
              )}
            </div>
          ) : null}
        </Container>
      </section>
      <ContactSection
        copy={form}
        prefill={message === null ? undefined : { message, method: 'form' }}
        after={
          voice ? (
            <VoiceCallout text={voice.text} button={voice.button} />
          ) : null
        }
      />
      <Process id="next" copy={page.next} />
    </>
  );
}
