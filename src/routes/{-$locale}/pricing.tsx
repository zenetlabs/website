import { createFileRoute } from '@tanstack/react-router';
import { CalculatorCallout } from '@/components/calculator-callout';
import { CtaLink } from '@/components/cta-link';
import { CtaSection } from '@/components/cta-section';
import { Faq } from '@/components/faq';
import { BulletList } from '@/components/lists';
import { Container, EmphasisTitle } from '@/components/section';
import { sectionFrame } from '@/components/section-frame';
import { StickyZone } from '@/components/sticky-cta';
import {
  EYEBROW,
  FEATURED_BADGE,
  LEAD,
  SECONDARY_BUTTON,
  TEXT_LINK,
} from '@/components/ui';
import { loadPricingContent } from '@/content/load';
import { formatPrice } from '@/lib/money';
import { CTA_TARGET, navHref } from '@/lib/nav';
import { pagePath, pagesForService } from '@/lib/page-registry';
import { pricingStructuredData } from '@/lib/page-structured-data';
import { contentHead } from '@/lib/pages';

export const Route = createFileRoute('/{-$locale}/pricing')({
  staticData: { page: 'pricing' },
  loader: ({ context }) => loadPricingContent(context.locale),
  head: ({ match, loaderData }) =>
    loaderData
      ? contentHead(match.context.locale, 'pricing', loaderData.page.meta)
      : {},
  scripts: ({ match, loaderData }) =>
    loaderData
      ? pricingStructuredData(
          match.context.locale,
          loaderData.page,
          loaderData.services,
        )
      : [],
  component: Pricing,
});

function Pricing() {
  const { locale } = Route.useRouteContext();
  const { page, services, hub, faq } = Route.useLoaderData();
  const how = sectionFrame('default');

  return (
    <>
      <section data-ground="paper">
        <Container className="py-12 md:py-24">
          <h1 className="max-w-4xl">
            <EmphasisTitle parts={page.title} />
          </h1>
          <p className={`mt-6 ${LEAD}`}>{page.lead}</p>
          <p className="mt-4 text-ui-s text-muted-fg">{page.taxNote}</p>
        </Container>
      </section>
      <StickyZone locale={locale}>
        <CalculatorCallout copy={page.calculator} locale={locale} />
        <section aria-label={page.catalog} data-ground="paper">
          <Container className="py-section-compact md:py-section">
            <div className="grid border-t border-hairline">
              {Object.values(services).map((service) => {
                const detail = page.details[service.id];
                const pages = pagesForService(service.id);
                const featured = service.id === 'diagnostic';
                return (
                  <article
                    key={service.id}
                    data-service={service.id}
                    className={`grid gap-6 border-b border-hairline py-8 last:border-b-0 md:grid-cols-12 md:gap-x-10 md:py-12 ${featured ? '-mx-4 bg-highlight-soft px-4 md:-mx-6 md:px-6' : ''}`}
                  >
                    <div className="md:col-span-5">
                      {featured ? (
                        <p className="mb-4">
                          <span className={FEATURED_BADGE}>
                            {page.labels.startHere}
                          </span>
                        </p>
                      ) : null}
                      <h2 className="text-h2-compact">{service.name}</h2>
                      <p className="mt-3 text-fg-soft md:mt-4">
                        {service.summary}
                      </p>
                      <dl className="mt-5 grid gap-3 md:mt-6">
                        {service.prices.map((price) => (
                          <div key={price.id}>
                            <dt className={EYEBROW}>
                              {price.label ?? page.labels.price}
                            </dt>
                            <dd className="mt-0.5 text-xl font-semibold">
                              {formatPrice(locale, price)}
                              {price.note ? (
                                <span className="block font-sans text-ui-s text-muted-fg">
                                  {price.note}
                                </span>
                              ) : null}
                            </dd>
                          </div>
                        ))}
                      </dl>
                      {featured ? (
                        <p className="mt-6">
                          <CtaLink
                            cta="start_here"
                            href={navHref(locale, CTA_TARGET)}
                            className={`${SECONDARY_BUTTON} max-sm:w-full`}
                          >
                            {page.labels.book}
                          </CtaLink>
                        </p>
                      ) : null}
                    </div>
                    <div className="md:col-span-7">
                      <p className={EYEBROW}>{page.labels.includes}</p>
                      <BulletList
                        items={detail.includes}
                        marker="tick"
                        className="mt-4"
                      />
                      {detail.timeline ? (
                        <p className="mt-6">
                          <span className={EYEBROW}>
                            {page.labels.timeline}
                          </span>{' '}
                          {detail.timeline}
                        </p>
                      ) : null}
                      {pages.length > 0 ? (
                        <p className="mt-4 md:mt-6">
                          <span className={EYEBROW}>{page.labels.more}</span>{' '}
                          {pages.map((target, index) => (
                            <span key={target}>
                              {index > 0 ? ' · ' : ''}
                              <a
                                href={pagePath(locale, target)}
                                className={TEXT_LINK}
                              >
                                {hub.cards[target].name}
                              </a>
                            </span>
                          ))}
                        </p>
                      ) : null}
                    </div>
                  </article>
                );
              })}
            </div>
          </Container>
        </section>
        <section aria-labelledby="how-title" data-ground={how.ground}>
          <Container className={how.pad}>
            <h2 id="how-title">{page.how.title}</h2>
            <ol className="timeline timeline-stack mt-8 max-w-[60ch] text-fg-soft md:mt-12">
              {page.how.items.map((item) => (
                <li key={item} className="text-ui-l">
                  {item}
                </li>
              ))}
            </ol>
          </Container>
        </section>
        <Faq copy={page.faq} items={faq} />
      </StickyZone>
      <CtaSection cta="pricing" copy={page.cta} locale={locale} />
    </>
  );
}
