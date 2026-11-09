import { createFileRoute } from '@tanstack/react-router';
import { CalculatorCallout } from '@/components/calculator-callout';
import { CtaSection } from '@/components/cta-section';
import { Faq } from '@/components/faq';
import { BulletList } from '@/components/lists';
import { OfferCard, Ticket, Tiers } from '@/components/offer-system';
import { PageIntro } from '@/components/page-intro';
import { Container } from '@/components/section';
import { sectionFrame } from '@/components/section-frame';
import { StickyZone } from '@/components/sticky-cta';
import { TEXT_LINK } from '@/components/ui';
import { loadPricingContent } from '@/content/load';
import type { ServiceId } from '@/content/types';
import { BUILDS } from '@/lib/offer-flows';
import {
  pagePath,
  pagesForService,
  type ServicePageId,
} from '@/lib/page-registry';
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

function MoreAbout({
  id,
  label,
  names,
}: {
  id: ServiceId;
  label: string;
  names: (page: ServicePageId) => { href: string; name: string };
}) {
  const pages = pagesForService(id);
  if (pages.length === 0) return null;
  return (
    <p className="text-ui-s">
      <span className="text-muted-fg">{label}</span>{' '}
      {pages.map((target, index) => {
        const { href, name } = names(target);
        return (
          <span key={target}>
            {index > 0 ? ' · ' : ''}
            <a href={href} className={TEXT_LINK}>
              {name}
            </a>
          </span>
        );
      })}
    </p>
  );
}

function Pricing() {
  const { locale } = Route.useRouteContext();
  const { page, services, hub, faq } = Route.useLoaderData();
  const { details, labels } = page;
  const names = (target: ServicePageId) => ({
    href: pagePath(locale, target),
    name: hub.cards[target].name,
  });
  const how = sectionFrame('tint');
  const diagnostic = details.diagnostic;

  return (
    <>
      <section data-ground="paper">
        <Container className="grid gap-6 pt-6 pb-6 md:gap-14 md:pt-14">
          <PageIntro title={page.title} lead={page.lead} note={page.taxNote} />
          <Ticket
            service={services.diagnostic}
            locale={locale}
            pills={[
              labels.startHere,
              ...(diagnostic.timeline ? [diagnostic.timeline] : []),
            ]}
            book={labels.book}
            plan={{ title: labels.includes, items: diagnostic.includes }}
            heading="h2"
            href={null}
          >
            <div className="mt-6">
              <MoreAbout id="diagnostic" label={labels.more} names={names} />
            </div>
          </Ticket>
        </Container>
      </section>
      {/* The bar waits until the ticket has offered its own booking button */}
      <StickyZone locale={locale}>
        <section aria-label={page.catalog} data-ground="paper">
          <Container className="grid gap-6 pb-section">
            <ul className="offer-row offer-row-full">
              {BUILDS.map(({ id, flow }) => (
                <OfferCard
                  key={id}
                  service={services[id]}
                  flow={flow}
                  locale={locale}
                  heading="h2"
                  href={null}
                >
                  <BulletList
                    items={details[id].includes}
                    marker="tick"
                    className="offer-includes"
                  />
                  <MoreAbout id={id} label={labels.more} names={names} />
                </OfferCard>
              ))}
            </ul>
            <div className="offer-alongside offer-alongside-full">
              {(['training', 'maintenance', 'growth'] as const).map((id) => (
                <Tiers
                  key={id}
                  service={services[id]}
                  locale={locale}
                  heading="h2"
                  priceLabel={labels.price}
                  href={null}
                  detailed
                >
                  <BulletList
                    items={details[id].includes}
                    marker="tick"
                    className="offer-includes"
                  />
                  <MoreAbout id={id} label={labels.more} names={names} />
                </Tiers>
              ))}
            </div>
          </Container>
        </section>
        <CalculatorCallout copy={page.calculator} locale={locale} />
        <section
          aria-labelledby="how-title"
          data-ground={how.ground}
          className={how.bg}
        >
          <Container className={how.pad}>
            <h2 id="how-title">{page.how.title}</h2>
            <ol className="timeline mt-6 md:mt-14">
              {page.how.items.map((item) => (
                <li key={item}>
                  <p className="step-text">{item}</p>
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
