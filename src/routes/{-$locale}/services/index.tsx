import { createFileRoute } from '@tanstack/react-router';
import { CtaLink } from '@/components/cta-link';
import { CtaSection } from '@/components/cta-section';
import { Container, EmphasisTitle } from '@/components/section';
import { sectionFrame } from '@/components/section-frame';
import { ServiceRow } from '@/components/service-ladder';
import { StickyZone } from '@/components/sticky-cta';
import { LEAD, SECONDARY_BUTTON } from '@/components/ui';
import { loadServicesHubContent } from '@/content/load';
import { formatPriceSummary } from '@/lib/money';
import { CTA_TARGET, navHref } from '@/lib/nav';
import {
  pagePath,
  pagesForService,
  SERVICE_PAGE_IDS,
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

function ServicesHub() {
  const { locale } = Route.useRouteContext();
  const { hub, services } = Route.useLoaderData();
  const pricing = pagePath(locale, 'pricing');
  const unpaged = Object.values(services).filter(
    (service) =>
      service.id !== 'diagnostic' && pagesForService(service.id).length === 0,
  );
  const { diagnostic } = services;
  const also = sectionFrame('compact');

  return (
    <>
      <section data-ground="paper">
        <Container className="py-12 md:py-24">
          <h1 className="max-w-4xl">
            <EmphasisTitle parts={hub.title} marker />
          </h1>
          <p className={`mt-6 ${LEAD}`}>{hub.lead}</p>
        </Container>
      </section>
      <StickyZone locale={locale}>
        <Container className="pb-section-compact md:pb-12">
          <ul className="grid border-t border-hairline">
            <ServiceRow
              heading="h2"
              href={`${pricing}#diagnostic`}
              name={diagnostic.name}
              summary={diagnostic.summary}
              price={formatPriceSummary(locale, diagnostic.prices)}
              featured={{
                badge: hub.startHere,
                action: (
                  <p className="pt-1 pb-5">
                    <CtaLink
                      cta="start_here"
                      href={navHref(locale, CTA_TARGET)}
                      className={`${SECONDARY_BUTTON} max-sm:w-full`}
                    >
                      {hub.book}
                    </CtaLink>
                  </p>
                ),
              }}
            />
          </ul>
        </Container>
        <Container className="pb-section">
          <ul className="grid border-t border-hairline">
            {SERVICE_PAGE_IDS.map((page) => (
              <ServiceRow
                key={page}
                heading="h2"
                href={pagePath(locale, page)}
                name={hub.cards[page].name}
                summary={hub.cards[page].summary}
                price={formatPriceSummary(
                  locale,
                  services[serviceOf(page)].prices,
                )}
              />
            ))}
          </ul>
        </Container>
        <section
          aria-labelledby="also-title"
          data-ground={also.ground}
          className={also.bg}
        >
          <Container className={`${also.pad} pb-section`}>
            <h2 id="also-title" className="max-w-3xl text-h2-compact">
              {hub.also.title}
            </h2>
            <p className={`mt-4 ${LEAD}`}>{hub.also.lead}</p>
            <ul className="mt-8 grid border-t border-hairline md:mt-10">
              {unpaged.map((service) => (
                <ServiceRow
                  key={service.id}
                  href={`${pricing}#${service.id}`}
                  name={service.name}
                  summary={service.summary}
                  price={formatPriceSummary(locale, service.prices)}
                />
              ))}
            </ul>
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
