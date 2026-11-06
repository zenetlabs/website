import { CtaLink } from '@/components/cta-link';
import { FlowRow, type FlowTile } from '@/components/flow-row';
import { Container, EmphasisTitle } from '@/components/section';
import { H3, LEAD, PRIMARY_BUTTON, TEXT_LINK } from '@/components/ui';
import type { HomeContent, Price, Service, Services } from '@/content/types';
import type { Locale } from '@/lib/i18n';
import { formatPrice, priceParts } from '@/lib/money';
import { ctaTarget, navHref } from '@/lib/nav';
import {
  isPublished,
  pagePath,
  type SiteFlags,
  serviceHref,
} from '@/lib/page-registry';
import { SITE } from '@/lib/site';

type Copy = HomeContent['services'];

const BUILDS = [
  { id: 'integration', flow: ['shopify', 'xero', 'sheets'] },
  { id: 'web', flow: ['app', 'hubspot', 'gmail'] },
  { id: 'agent', flow: ['whatsapp', 'agent', 'human'] },
] as const satisfies readonly {
  id: keyof Services;
  flow: readonly FlowTile[];
}[];

function Amount({ locale, price }: { locale: Locale; price: Price }) {
  const { from, amount, unit } = priceParts(locale, price);
  return (
    <>
      {from ? <span className="price-from">{from.trim()}</span> : null}
      <span
        className={`card-price ${price.max === undefined ? '' : 'card-price-range'}`}
      >
        {amount}
      </span>
      {unit ? <span className="text-ui-s text-muted-fg">{unit}</span> : null}
    </>
  );
}

function Ticket({
  copy,
  service,
  locale,
  site,
}: {
  copy: Copy;
  service: Service;
  locale: Locale;
  site: SiteFlags;
}) {
  return (
    <div className="ticket">
      <div className="ticket-offer p-5 md:p-10">
        <h3 className={H3}>
          <a href={serviceHref(locale, 'diagnostic')} className="hover-line">
            {service.name}
          </a>
        </h3>
        <p className="ticket-price">{formatPrice(locale, service.prices[0])}</p>
        <p className="mt-4 flex flex-wrap gap-2">
          <span className="meta-pill">{copy.oneOff}</span>
          <span className="meta-pill">{copy.timeline}</span>
        </p>
        <p className="mt-5 max-w-[34em] text-fg-soft">{service.summary}</p>
        <CtaLink
          cta="start_here"
          href={navHref(locale, ctaTarget(site))}
          className={`mt-7 ${PRIMARY_BUTTON} max-sm:w-full`}
        >
          {copy.book}
        </CtaLink>
      </div>
      <div className="ticket-stub">
        <p className="font-semibold">{copy.plan.title}</p>
        <ul className="plan-list">
          {copy.plan.items.map((item) => (
            <li key={item} className="tick-item">
              {item}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function Tiers({ service, locale }: { service: Service; locale: Locale }) {
  return (
    <div>
      <h3 className={H3}>
        <a href={serviceHref(locale, service.id)} className="hover-line">
          {service.name}
        </a>
      </h3>
      <p className="tier-summary">{service.summary}</p>
      <dl className="tier-list">
        {service.prices.map((price) => {
          const { from, amount, unit } = priceParts(locale, price);
          return (
            <div key={price.id}>
              <dt className="text-ui-s font-semibold">{price.label}</dt>
              <dd className="mt-1">
                {from ? (
                  <span className="text-ui-s text-muted-fg">{from}</span>
                ) : null}
                <span className="tier-price">{amount}</span>
                {unit ? (
                  <>
                    <wbr />
                    <span className="text-ui-s text-muted-fg">{unit}</span>
                  </>
                ) : null}
                {price.note ? (
                  <span className="tier-note">{price.note}</span>
                ) : null}
              </dd>
            </div>
          );
        })}
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
            copy={copy}
            service={services.diagnostic}
            locale={locale}
            site={site}
          />
          <ul className="offer-row">
            {BUILDS.map(({ id, flow }) => {
              const service = services[id];
              return (
                <li key={id} className="offer-card">
                  <p>
                    <Amount locale={locale} price={service.prices[0]} />
                  </p>
                  <h3 className={H3}>
                    <a href={serviceHref(locale, id)} className="hover-line">
                      {service.name}
                    </a>
                  </h3>
                  <p className="text-ui-m text-fg-soft">{service.summary}</p>
                  <FlowRow tiles={flow} className="mt-auto pt-2" />
                </li>
              );
            })}
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
            {copy.more} →
          </a>
          {isPublished('calculator', site) ? (
            <a
              href={pagePath(locale, 'calculator')}
              className={`font-medium ${TEXT_LINK}`}
            >
              {copy.calculator} →
            </a>
          ) : null}
        </p>
      </Container>
    </section>
  );
}
