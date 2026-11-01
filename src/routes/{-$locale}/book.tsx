import { createFileRoute } from '@tanstack/react-router';
import { lazy, Suspense, useSyncExternalStore } from 'react';
import { BookingForm } from '@/components/booking-form';
import { Breadcrumb, FactList, HeroHeading } from '@/components/page-blocks';
import { Container } from '@/components/section';
import { TEXT_LINK } from '@/components/ui';
import { ZoneSelect } from '@/components/zone-select';
import { DEFAULT_ZONE } from '@/content/booking-rules';
import { loadBookContent } from '@/content/load';
import { bookAvailability } from '@/lib/book-availability';
import { contentRouteOptions } from '@/lib/content-route';
import type { Locale } from '@/lib/i18n';
import { formatPrice } from '@/lib/money';
import { pagePath } from '@/lib/page-registry';
import { breadcrumbStructuredData } from '@/lib/page-structured-data';
import { SITE_NAME } from '@/lib/seo';
import { PUBLIC_EMAIL } from '@/lib/site';
import { canonicalZone } from '@/lib/slots';

const LazyContactForm = lazy(() =>
  import('@/components/contact-form').then(({ ContactForm }) => ({
    default: ContactForm,
  })),
);

async function loadBook(locale: Locale) {
  const [content, availability] = await Promise.all([
    loadBookContent(locale),
    bookAvailability(),
  ]);
  return { ...content, availability };
}

export const Route = createFileRoute('/{-$locale}/book')({
  ...contentRouteOptions('book', loadBook, (locale, { copy }) =>
    breadcrumbStructuredData(locale, 'book', copy.meta.title),
  ),
  validateSearch: (raw: Record<string, unknown>) => raw,
  component: Book,
});

function noSubscription() {
  return () => {};
}

let detectedZone: string | null | undefined;

function browserZone(): string | null {
  if (detectedZone === undefined) {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    detectedZone = canonicalZone(zone);
  }
  return detectedZone;
}

function requestedZone(search: Record<string, unknown>): string | null {
  const { tz } = search;
  return typeof tz === 'string' ? canonicalZone(tz) : null;
}

function Book() {
  const { locale } = Route.useRouteContext();
  const { copy, services, availability } = Route.useLoaderData();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const detected = useSyncExternalStore(
    noSubscription,
    browserZone,
    () => null,
  );
  const zone = requestedZone(search) ?? detected ?? DEFAULT_ZONE[locale];
  const diagnostic = formatPrice(locale, services.diagnostic.prices[0]);
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
          <HeroHeading
            eyebrow={copy.eyebrow}
            title={copy.title}
            lead={copy.lead}
            afterBreadcrumb
          />
          <FactList
            facts={copy.facts.map((fact) => ({
              ...fact,
              value: fact.value.replace('{diagnostic}', diagnostic),
            }))}
          />
        </Container>
      </section>
      {open ? (
        <section data-booking="open" className="border-t border-hairline">
          <Container className="grid max-w-3xl gap-8 py-16 md:py-20">
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
            <BookingForm
              copy={copy}
              locale={locale}
              zone={zone}
              slots={availability.slots}
            />
          </Container>
        </section>
      ) : (
        <section
          data-booking="unavailable"
          aria-labelledby="book-fallback"
          className="border-t border-hairline"
        >
          <Container className="grid max-w-3xl gap-6 py-16 md:py-20">
            <h2 id="book-fallback">{fallback.title}</h2>
            <p className="text-muted-fg">{fallback.text}</p>
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
