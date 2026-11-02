import { createFileRoute } from '@tanstack/react-router';
import { CtaSection } from '@/components/cta-section';
import { Container, EmphasisTitle } from '@/components/section';
import { ServiceRow } from '@/components/service-ladder';
import { LEAD } from '@/components/ui';
import { loadServicesHubContent } from '@/content/load';
import { formatPriceSummary } from '@/lib/money';
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
    (service) => pagesForService(service.id).length === 0,
  );

  return (
    <>
      <Container className="py-16 md:py-24">
        <h1 className="max-w-4xl">
          <EmphasisTitle parts={hub.title} marker />
        </h1>
        <p className={`mt-6 ${LEAD}`}>{hub.lead}</p>
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
        className="border-t border-hairline"
      >
        <Container className="py-section">
          <h2 id="also-title" className="max-w-3xl">
            {hub.also.title}
          </h2>
          <p className={`mt-5 ${LEAD}`}>{hub.also.lead}</p>
          <ul className="mt-10 grid border-t border-hairline">
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
      <CtaSection
        cta="services"
        copy={hub.start}
        locale={locale}
        secondary={{ label: hub.pricing, href: pricing }}
      />
    </>
  );
}
