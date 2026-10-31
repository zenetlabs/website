import { createFileRoute } from '@tanstack/react-router';
import { CtaSection } from '@/components/cta-section';
import { BulletList } from '@/components/lists';
import { Container, EmphasisTitle } from '@/components/section';
import { CARD, EYEBROW, TEXT_LINK } from '@/components/ui';
import { loadPricingContent } from '@/content/load';
import { formatPrice } from '@/lib/money';
import { navHref } from '@/lib/nav';
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
  const { page, services, hub } = Route.useLoaderData();

  return (
    <>
      <Container className="py-16 md:py-24">
        <p className={EYEBROW}>{page.eyebrow}</p>
        <h1 className="mt-6 max-w-4xl text-balance">
          <EmphasisTitle parts={page.title} marker />
        </h1>
        <p className="mt-8 max-w-2xl text-lg text-muted-fg">{page.lead}</p>
        <p className={`mt-6 ${EYEBROW}`}>{page.taxNote}</p>
      </Container>
      <Container className="grid gap-6 pb-20 md:pb-28">
        {Object.values(services).map((service) => {
          const detail = page.details[service.id];
          const pages = pagesForService(service.id);
          return (
            <article
              key={service.id}
              id={service.id}
              className={`${CARD} grid gap-8 p-8 md:grid-cols-12 md:gap-10`}
            >
              <div className="md:col-span-5">
                <h2 className="text-balance text-3xl md:text-4xl">
                  {service.name}
                </h2>
                <p className="mt-4 text-muted-fg">{service.summary}</p>
                <dl className="mt-6 grid gap-3">
                  {service.prices.map((price) => (
                    <div key={price.id}>
                      <dt className={EYEBROW}>
                        {price.label ?? page.labels.price}
                      </dt>
                      <dd className="font-mono text-lg">
                        {formatPrice(locale, price)}
                        {price.note ? (
                          <span className="block font-sans text-sm text-muted-fg">
                            {price.note}
                          </span>
                        ) : null}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
              <div className="md:col-span-7">
                <p className={EYEBROW}>{page.labels.includes}</p>
                <BulletList items={detail.includes} className="mt-4" />
                {detail.timeline ? (
                  <p className="mt-6">
                    <span className={EYEBROW}>{page.labels.timeline}</span>{' '}
                    {detail.timeline}
                  </p>
                ) : null}
                {pages.length > 0 ? (
                  <p className="mt-6">
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
      </Container>
      <section aria-labelledby="how-title" className="border-t border-hairline">
        <Container className="py-20 md:py-28">
          <h2 id="how-title">{page.how.title}</h2>
          <ol className="mt-10 grid max-w-3xl list-decimal gap-4 pl-6 text-lg text-muted-fg marker:font-mono">
            {page.how.items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ol>
        </Container>
      </section>
      <CtaSection
        copy={page.cta}
        locale={locale}
        secondary={{
          label: page.cta.faq,
          href: navHref(locale, { page: 'home', section: 'faq' }),
        }}
      />
    </>
  );
}
