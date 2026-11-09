import { createFileRoute } from '@tanstack/react-router';
import { CtaSection } from '@/components/cta-section';
import { OfferCard, Ticket, Tiers } from '@/components/offer-system';
import { PageIntro } from '@/components/page-intro';
import { Container } from '@/components/section';
import { sectionFrame } from '@/components/section-frame';
import { StickyZone } from '@/components/sticky-cta';
import { LEAD } from '@/components/ui';
import { loadServicesHubContent } from '@/content/load';
import type { HubCardPage } from '@/content/types';
import { PAGE_FLOWS } from '@/lib/offer-flows';
import {
  pagePath,
  SERVICE_PAGE_IDS,
  type ServicePageId,
  serviceOf,
} from '@/lib/page-registry';
import { servicesHubStructuredData } from '@/lib/page-structured-data';
import { contentHead } from '@/lib/pages';

export const Route = createFileRoute('/{-$locale}/services/')({
  staticData: { page: 'services' },
  loader: ({ context }) => loadServicesHubContent(context.locale),
  head: ({ match, loaderData }) =>
    loaderData
      ? contentHead(match.context.locale, 'services', loaderData.hub.meta)
      : {},
  scripts: ({ match, loaderData }) =>
    loaderData
      ? servicesHubStructuredData(match.context.locale, loaderData.hub)
      : [],
  component: ServicesHub,
});

function isHubCard(page: ServicePageId): page is HubCardPage {
  return page !== 'diagnostic' && page !== 'maintenance';
}

function ServicesHub() {
  const { locale } = Route.useRouteContext();
  const { hub, services } = Route.useLoaderData();
  const pricing = pagePath(locale, 'pricing');
  const main = SERVICE_PAGE_IDS.filter(isHubCard);
  const also = sectionFrame('tint');

  return (
    <>
      <section data-ground="paper">
        <Container className="grid gap-6 pt-5 pb-6 md:gap-14 md:pt-14">
          <PageIntro title={hub.title} lead={hub.lead} />
          <Ticket
            service={services.diagnostic}
            locale={locale}
            pills={[hub.startHere]}
            book={hub.book}
            plan={hub.plan}
            heading="h2"
          />
        </Container>
      </section>
      {/* The bar waits until the ticket has offered its own booking button */}
      <StickyZone locale={locale}>
        <section aria-label={hub.meta.title} data-ground="paper">
          <Container className="grid gap-6 pb-section">
            <ul className="offer-row offer-row-hub">
              {main.map((page) => {
                const service = services[serviceOf(page)];
                const { name, summary } = hub.cards[page];
                return (
                  <OfferCard
                    key={page}
                    service={service}
                    flow={PAGE_FLOWS[page]}
                    locale={locale}
                    heading="h2"
                    href={pagePath(locale, page)}
                    name={name}
                    summary={summary}
                  />
                );
              })}
            </ul>
          </Container>
        </section>
        <section
          aria-labelledby="also-title"
          data-ground={also.ground}
          className={also.bg}
        >
          <Container className={also.pad}>
            <div className="offer-head">
              <h2 id="also-title" className="max-w-[12em] lg:col-span-7">
                {hub.also.title}
              </h2>
              <p className={`${LEAD} lg:col-span-5 lg:justify-self-end`}>
                {hub.also.lead}
              </p>
            </div>
            <div className="offer-alongside offer-alongside-care">
              {(['maintenance', 'growth'] as const).map((id) => (
                <Tiers
                  key={id}
                  service={services[id]}
                  locale={locale}
                  priceLabel={hub.labels.price}
                />
              ))}
            </div>
          </Container>
        </section>
      </StickyZone>
      <CtaSection
        cta="services"
        copy={hub.start}
        locale={locale}
        secondary={{ label: hub.pricing, href: pricing }}
      />
    </>
  );
}
