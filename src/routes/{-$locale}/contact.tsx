import { createFileRoute, useHydrated } from '@tanstack/react-router';
import { lazy, Suspense } from 'react';
import { AgentDesk } from '@/components/agent-desk';
import { ContactSection } from '@/components/contact-section';
import { CtaLink } from '@/components/cta-link';
import { PageHero } from '@/components/page-hero';
import { Process } from '@/components/process';
import { PRIMARY_BUTTON } from '@/components/ui';
import { VoiceCallout } from '@/components/voice-button';
import { loadContactContent, loadDeskClose } from '@/content/load';
import { messageParam } from '@/lib/contact-message';
import { CTA_TARGET, navHref } from '@/lib/nav';
import { contactStructuredData } from '@/lib/page-structured-data';
import { contentHead } from '@/lib/pages';

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

// The desk as a page: the desk and, while booking is published, its times in
// the hero; the form on the band; what happens next. A prefilled arrival has
// no desk: the form holding the text is the one place to write.
function Contact() {
  const { locale } = Route.useRouteContext();
  const { page, desk } = Route.useLoaderData();
  const hydrated = useHydrated();
  const message = messageParam(Route.useSearch());
  const { voice, book, ...rest } = page.form;
  // The desk's booking card replaces the band's "pick a time" link; without
  // the desk (a prefilled arrival) the link stays
  const form = message === null ? rest : { ...rest, book };
  // The site's booking CTA: /book while booking is published, else this page
  const booking = CTA_TARGET.page === 'book';
  const waiting = (
    <>
      <div className="desk-rail-head">
        <h3 className="text-ui-l font-semibold">{page.slots.title}</h3>
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

  const rail = booking ? (
    <div className="contact-book" data-slot-rail="live">
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
  ) : null;

  return (
    <>
      <PageHero
        title={page.title}
        lead={page.lead}
        stage={
          message === null ? (
            <AgentDesk copy={desk} locale={locale} footer={rail} contact />
          ) : undefined
        }
      />
      <ContactSection
        copy={form}
        prefill={message === null ? undefined : { message, method: 'form' }}
        after={
          voice ? (
            <VoiceCallout text={voice.text} button={voice.button} />
          ) : null
        }
      />
      <Process
        id="next"
        copy={page.next}
        rail
        stub={page.next.steps.findIndex((step) => step.id === 'diagnostic')}
      />
    </>
  );
}
