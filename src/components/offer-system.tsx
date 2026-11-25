import { CtaLink } from '@/components/cta-link';
import { FlowRow } from '@/components/flow-tiles';
import { Container, EmphasisTitle } from '@/components/section';
import { ServiceName } from '@/components/service-name';
import { Amount, TicketShell } from '@/components/ticket-shell';
import { LEAD, PRIMARY_BUTTON, TEXT_LINK } from '@/components/ui';
import type { FlowTile, HomeContent, Service, Services } from '@/content/types';
import type { Locale } from '@/lib/i18n';
import { formatPrice, formatPriceSummary } from '@/lib/money';
import { ctaTarget, navHref } from '@/lib/nav';
import { BUILDS } from '@/lib/offer-flows';
import { isPublished, pagePath, type SiteFlags } from '@/lib/page-registry';
import { SITE } from '@/lib/site';

type Copy = HomeContent['services'];

// The diagnostic as the entry ticket: its price large, the facts as pills, the
// booking action, and on the stub what it hands over.
export function Ticket({
  service,
  locale,
  pills,
  book,
  plan,
  site = SITE,
}: {
  service: Service;
  locale: Locale;
  pills: readonly string[];
  book: string;
  plan: { title: string; items: readonly string[] };
  site?: SiteFlags;
}) {
  return (
    <TicketShell
      service={service}
      offerClassName="p-4 md:p-10"
      offer={
        <>
          <ServiceName service={service} locale={locale} heading="h3" />
          <p className="ticket-price">
            {formatPrice(locale, service.prices[0])}
          </p>
          <p className="mt-4 flex flex-wrap gap-2">
            {pills.map((pill) => (
              <span key={pill} className="meta-pill">
                {pill}
              </span>
            ))}
          </p>
          <p className="mt-5 max-w-[34em] text-fg-soft">{service.summary}</p>
          <CtaLink
            cta="start_here"
            href={navHref(locale, ctaTarget(site))}
            className={`mt-7 ${PRIMARY_BUTTON} max-sm:w-full`}
          >
            {book}
          </CtaLink>
        </>
      }
      stub={
        <>
          <p className="font-semibold">{plan.title}</p>
          <ul className="plan-list">
            {plan.items.map((item) => (
              <li key={item} className="tick-item">
                {item}
              </li>
            ))}
          </ul>
        </>
      }
    />
  );
}

// A build, price first (a line with several rows, such as training, lists them
// all under it), with the tools it joins.
export function OfferCard({
  service,
  flow,
  locale,
}: {
  service: Service;
  flow: readonly FlowTile[];
  locale: Locale;
}) {
  return (
    <li className="offer-card" data-service={service.id}>
      <p>
        <Amount locale={locale} price={service.prices[0]} />
      </p>
      {service.prices.length > 1 ? (
        <p className="text-ui-s text-muted-fg">
          {formatPriceSummary(locale, service.prices)}
        </p>
      ) : null}
      <ServiceName service={service} locale={locale} heading="h3" />
      <p className="text-ui-m text-fg-soft">{service.summary}</p>
      <FlowRow tiles={flow} className="mt-auto pt-2" />
    </li>
  );
}

// A monthly or per-format line (training, care) as ruled tiers.
export function Tiers({
  service,
  locale,
}: {
  service: Service;
  locale: Locale;
}) {
  return (
    <div data-service={service.id}>
      <ServiceName service={service} locale={locale} heading="h3" />
      <p className="tier-summary">{service.summary}</p>
      <dl className="tier-list">
        {service.prices.map((price) => (
          <div key={price.id}>
            <dt className="text-ui-s font-semibold">{price.label}</dt>
            <dd className="mt-1">
              <Amount locale={locale} price={price} />
              {price.note ? (
                <span className="tier-note">{price.note}</span>
              ) : null}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

// "What we do, and what it costs": the diagnostic as the entry ticket, the
// three builds price first with the tools they join, then training and care.
export function OfferSystem({
  copy,
  services,
  locale,
  site = SITE,
}: {
  copy: Copy;
  services: Services;
  locale: Locale;
  site?: SiteFlags;
}) {
  return (
    <section id="services" aria-labelledby="services-title">
      <Container className="py-section">
        <div className="offer-head">
          <h2 id="services-title" className="max-w-[12em] lg:col-span-7">
            <EmphasisTitle parts={copy.title} />
          </h2>
          {copy.lead ? (
            <p className={`${LEAD} lg:col-span-5 lg:justify-self-end`}>
              {copy.lead}
            </p>
          ) : null}
        </div>
        <div className="mt-7 grid gap-6 md:mt-14">
          <Ticket
            service={services.diagnostic}
            locale={locale}
            pills={[copy.oneOff, copy.timeline]}
            book={copy.book}
            plan={copy.plan}
            site={site}
          />
          <ul className="offer-row">
            {BUILDS.map(({ id, flow }) => (
              <OfferCard
                key={id}
                service={services[id]}
                flow={flow}
                locale={locale}
              />
            ))}
          </ul>
          <div className="offer-alongside">
            <Tiers service={services.training} locale={locale} />
            <Tiers service={services.maintenance} locale={locale} />
          </div>
        </div>
        <p className="offer-links">
          <a
            href={pagePath(locale, 'pricing')}
            className={`font-medium ${TEXT_LINK}`}
          >
            {copy.more}
          </a>
          {isPublished('calculator', site) ? (
            <a
              href={pagePath(locale, 'calculator')}
              className={`font-medium ${TEXT_LINK}`}
            >
              {copy.calculator}
            </a>
          ) : null}
        </p>
      </Container>
    </section>
  );
}
