import { createFileRoute } from '@tanstack/react-router';
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
// the band and what happens next. The free times themselves live on /book, so
// this page ships no slot code of its own.
function Contact() {
  const { locale } = Route.useRouteContext();
  const page = Route.useLoaderData();
  const message = messageParam(Route.useSearch());
  // The booking card above replaces the band's "pick a time" link
  const { voice, book: _book, ...form } = page.form;
  // The site's booking CTA: /book while booking is published, else this page
  const booking = CTA_TARGET.page === 'book';

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
            <div className="contact-book lg:col-span-6">
              <h2 className="text-ui-l font-semibold">{page.slots.title}</h2>
              <p className="text-ui-s text-muted-fg">{page.slots.meta}</p>
              <CtaLink
                cta="contact_book"
                href={navHref(locale, CTA_TARGET)}
                className={PRIMARY_BUTTON}
              >
                {page.slots.seeAvailable}
              </CtaLink>
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
