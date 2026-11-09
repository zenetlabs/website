import { createFileRoute } from '@tanstack/react-router';
import { lazy, Suspense, useSyncExternalStore } from 'react';
import { BookingConfirm } from '@/components/booking-confirm';
import { BookingForm } from '@/components/booking-form';
import { BookingPerson } from '@/components/booking-person';
import { Breadcrumb, FactList, HeroHeading } from '@/components/page-blocks';
import { Container } from '@/components/section';
import { sectionFrame } from '@/components/section-frame';
import { BAND_CARD, H3, LEAD, TEXT_LINK } from '@/components/ui';
import { ZoneSelect } from '@/components/zone-select';
import { DEFAULT_ZONE } from '@/content/booking-rules';
import { loadBookConfirmCopy, loadBookContent } from '@/content/load';
import type { BookingConfirmCopy } from '@/content/types';
import { bookAvailability, bookConfirmation } from '@/lib/book-availability';
import type { PageAvailability } from '@/lib/booking-client';
import { detectedZone } from '@/lib/browser-zone';
import type { ConfirmView } from '@/lib/confirm-view';
import { contentRouteOptions } from '@/lib/content-route';
import type { Locale } from '@/lib/i18n';
import { pagePath } from '@/lib/page-registry';
import { breadcrumbStructuredData } from '@/lib/page-structured-data';
import { SITE_NAME } from '@/lib/seo';
import { PUBLIC_EMAIL } from '@/lib/site';
import { canonicalZone } from '@/lib/slots';
import { zoneLabel } from '@/lib/zone-label';

const BAND = sectionFrame('band');

const LazyContactForm = lazy(() =>
  import('@/components/contact-form').then(({ ContactForm }) => ({
    default: ContactForm,
  })),
);

type ConfirmDeps = { confirm: string | null; outcome: string | null };

const NO_CONFIRM: ConfirmDeps = { confirm: null, outcome: null };

type Confirmation = {
  token: string;
  outcome: string | null;
  view: ConfirmView;
  copy: BookingConfirmCopy;
};

// An emailed link (?confirm=) shows its confirm view instead of the form, and
// the calendar is not asked for slots at all.
async function loadBook(
  locale: Locale,
  { confirm, outcome }: ConfirmDeps = NO_CONFIRM,
): Promise<
  Awaited<ReturnType<typeof loadBookContent>> & {
    availability: PageAvailability;
    confirmation: Confirmation | null;
    diagnostic: string;
  }
> {
  // The diagnostic's price is formatted here, through a lazy module, so
  // `money` stays out of the page's first JavaScript (the server render
  // carries the result).
  const price = import('@/lib/diagnostic-price');
  if (confirm !== null) {
    const [content, view, copy] = await Promise.all([
      loadBookContent(locale),
      bookConfirmation(confirm, outcome),
      loadBookConfirmCopy(locale),
    ]);
    return {
      ...content,
      availability: { status: 'unavailable' },
      confirmation: { token: confirm, outcome, view, copy },
      diagnostic: (await price).diagnosticPrice(locale, content.services),
    };
  }
  const [content, availability] = await Promise.all([
    loadBookContent(locale),
    bookAvailability(),
  ]);
  return {
    ...content,
    availability,
    confirmation: null,
    diagnostic: (await price).diagnosticPrice(locale, content.services),
  };
}

function textParam(value: unknown): string | null {
  return typeof value === 'string' && value !== '' ? value : null;
}

export const Route = createFileRoute('/{-$locale}/book')({
  ...contentRouteOptions('book', loadBook, (locale, { copy }) =>
    breadcrumbStructuredData(locale, 'book', copy.meta.title),
  ),
  validateSearch: (raw: Record<string, unknown>) => raw,
  loaderDeps: ({ search }): ConfirmDeps => ({
    confirm: textParam(search.confirm),
    outcome: textParam(search.outcome),
  }),
  loader: ({ context, deps }) => loadBook(context.locale, deps),
  component: Book,
});

function noSubscription() {
  return () => {};
}

function requestedSlot(search: Record<string, unknown>): number | null {
  const { slot } = search;
  const start = typeof slot === 'string' ? Number(slot) : slot;
  return typeof start === 'number' && Number.isSafeInteger(start)
    ? start
    : null;
}

function requestedZone(search: Record<string, unknown>): string | null {
  const { tz } = search;
  return typeof tz === 'string' ? canonicalZone(tz) : null;
}

function Book() {
  const { locale } = Route.useRouteContext();
  const { copy, availability, confirmation, diagnostic } =
    Route.useLoaderData();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const detected = useSyncExternalStore(
    noSubscription,
    detectedZone,
    () => null,
  );
  const zone = requestedZone(search) ?? detected ?? DEFAULT_ZONE[locale];
  const open = availability.status === 'ok' && availability.slots.length > 0;
  const fallback = availability.status === 'ok' ? copy.empty : copy.unavailable;

  return (
    <>
      <section aria-labelledby="service-title">
        <Container className="py-16 md:py-24">
          <Breadcrumb
            page="book"
            locale={locale}
            names={{ home: SITE_NAME, book: copy.meta.title }}
            label={copy.breadcrumb.label}
          />
          <HeroHeading title={copy.title} lead={copy.lead} afterBreadcrumb />
          <FactList
            facts={copy.facts.map((fact) => ({
              ...fact,
              value: fact.value.replace('{diagnostic}', diagnostic),
            }))}
          />
        </Container>
      </section>
      {confirmation ? (
        <section
          data-booking="confirm"
          data-ground={BAND.ground}
          className={BAND.bg}
        >
          <Container width="narrow" className={BAND.pad}>
            <div className={BAND_CARD}>
              <BookingConfirm
                confirm={confirmation.copy}
                zones={copy.zone}
                locale={locale}
                token={confirmation.token}
                outcome={confirmation.outcome}
                view={confirmation.view}
              />
            </div>
          </Container>
        </section>
      ) : open ? (
        <section
          data-booking="open"
          data-ground={BAND.ground}
          className={BAND.bg}
        >
          <Container width="narrow" className={BAND.pad}>
            <div className={`grid gap-6 ${BAND_CARD}`}>
              <BookingPerson locale={locale} />
              <div className="book-head">
                <div>
                  <h2 className={H3}>{copy.picker.legend}</h2>
                  <p className="mt-1 text-ui-s text-muted-fg">
                    {copy.zone.legend.replace(
                      '{zone}',
                      zoneLabel(copy.zone, zone),
                    )}
                  </p>
                </div>
                <ZoneSelect
                  zone={zone}
                  action={pagePath(locale, 'book')}
                  copy={copy.zone}
                  onChange={(tz) =>
                    navigate({
                      search: (previous) => ({ ...previous, tz }),
                      replace: true,
                      resetScroll: false,
                    })
                  }
                />
              </div>
              <BookingForm
                copy={copy}
                locale={locale}
                zone={zone}
                slots={availability.slots}
                preselect={requestedSlot(search)}
              />
            </div>
          </Container>
        </section>
      ) : (
        <section
          data-booking="unavailable"
          aria-labelledby="book-fallback"
          data-ground={BAND.ground}
          className={BAND.bg}
        >
          <Container width="narrow" className={`grid gap-6 ${BAND.pad}`}>
            <h2 id="book-fallback">{fallback.title}</h2>
            <p className={LEAD}>{fallback.text}</p>
            <Suspense fallback={null}>
              <LazyContactForm />
            </Suspense>
            <p>
              {copy.contactMail}{' '}
              <a href={`mailto:${PUBLIC_EMAIL}`} className={TEXT_LINK}>
                {PUBLIC_EMAIL}
              </a>
            </p>
          </Container>
        </section>
      )}
    </>
  );
}
