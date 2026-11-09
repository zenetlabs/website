import { Fragment, type ReactNode } from 'react';
import { CtaLink } from '@/components/cta-link';
import { Container, EmphasisTitle } from '@/components/section';
import { H3, LEAD, PRIMARY_BUTTON, TEXT_LINK } from '@/components/ui';
import type {
  FlowTile,
  FlowTool,
  HomeContent,
  Price,
  Service,
  Services,
} from '@/content/types';
import type { Locale } from '@/lib/i18n';
import { formatPrice, formatPriceSummary, priceParts } from '@/lib/money';
import { ctaTarget, navHref } from '@/lib/nav';
import { BUILDS } from '@/lib/offer-flows';
import {
  isPublished,
  pagePath,
  type SiteFlags,
  serviceHref,
} from '@/lib/page-registry';
import { SITE } from '@/lib/site';

// The tools with a mark of their own in `public/icons/tools/`
const MARKED = [
  'shopify',
  'xero',
  'sheets',
  'hubspot',
  'gmail',
  'whatsapp',
  'woocommerce',
  'prestashop',
] as const satisfies readonly FlowTool[];

type Marked = (typeof MARKED)[number];

// `app` is a custom app; Holded has no mark we can ship, so it is drawn as a
// ledger. Both in the blue of the customer's tools.
function isMarked(tile: FlowTile): tile is Marked {
  return MARKED.some((tool) => tool === tile);
}

// The person, a custom app and Holded are drawn by an icon mask (`--icon`)
const ICONS: Partial<Record<FlowTile, string>> = {
  human: 'icon-human',
  app: 'icon-app',
  holded: 'icon-ledger',
};

export function FlowTileMark({
  tile,
  className = '',
}: {
  tile: FlowTile;
  className?: string;
}) {
  const marked = isMarked(tile);
  return (
    <span
      aria-hidden="true"
      data-actor={marked ? undefined : tile === 'holded' ? 'app' : tile}
      className={`flow-tile ${ICONS[tile] ?? ''} ${className}`}
      style={
        marked ? { '--tool-icon': `url(/icons/tools/${tile}.svg)` } : undefined
      }
    />
  );
}

// The customer's tools (in their own colours), our agent, and the person who
// approves, joined by wires. Decorative: the text beside it says the same.
export function FlowRow({
  tiles,
  className = '',
}: {
  tiles: readonly FlowTile[];
  className?: string;
}) {
  return (
    <div aria-hidden="true" className={`flow-row ${className}`}>
      {tiles.map((tile, index) => (
        <Fragment key={tile}>
          {index > 0 ? (
            <span
              className="flow-wire"
              data-to={tile === 'human' ? 'human' : undefined}
            />
          ) : null}
          <FlowTileMark tile={tile} />
        </Fragment>
      ))}
    </div>
  );
}

type Copy = HomeContent['services'];
type Heading = 'h2' | 'h3';

// A price set in parts (the amount large); read, and copied into the page's
// markdown, as the one string it is.
function Amount({ locale, price }: { locale: Locale; price: Price }) {
  const { from, amount, unit } = priceParts(locale, price);
  return (
    <>
      <span aria-hidden="true">
        {from ? <span className="price-from">{from}</span> : null}
        <span
          className="price-amount"
          data-range={price.max === undefined ? undefined : ''}
        >
          {amount}
        </span>
        {unit ? (
          <>
            <wbr />
            <span className="price-unit">{unit}</span>
          </>
        ) : null}
      </span>
      <span className="sr-only">{formatPrice(locale, price)}</span>
    </>
  );
}

// Linked to the service's page by default (the pricing page for a line without
// one); `null` sets it as plain text, as on the pricing page itself.
function ServiceName({
  service,
  locale,
  heading: Tag,
  href,
  name = service.name,
}: {
  service: Service;
  locale: Locale;
  heading: Heading;
  href?: string | null;
  name?: string;
}) {
  const target = href === undefined ? serviceHref(locale, service.id) : href;
  return (
    <Tag className={H3}>
      {target ? (
        <a href={target} className="hover-line">
          {name}
        </a>
      ) : (
        name
      )}
    </Tag>
  );
}

// The diagnostic as the entry ticket: its price large, the facts as pills, the
// booking action, and on the stub what it hands over.
export function Ticket({
  service,
  locale,
  pills,
  book,
  plan,
  heading = 'h3',
  href,
  site = SITE,
  children,
}: {
  service: Service;
  locale: Locale;
  pills: readonly string[];
  book: string;
  plan: { title: string; items: readonly string[] };
  heading?: Heading;
  href?: string | null;
  site?: SiteFlags;
  children?: ReactNode;
}) {
  return (
    <div className="ticket" data-service={service.id}>
      <div className="ticket-offer p-4 md:p-10">
        <ServiceName
          service={service}
          locale={locale}
          heading={heading}
          href={href}
        />
        <p className="ticket-price">{formatPrice(locale, service.prices[0])}</p>
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
        {children}
      </div>
      <div className="ticket-stub">
        <p className="font-semibold">{plan.title}</p>
        <ul className="plan-list">
          {plan.items.map((item) => (
            <li key={item} className="tick-item">
              {item}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// A build, price first (a line with several rows, such as training, lists them
// all under it), with the tools it joins. `name`, `summary` and `href`
// name a page of its own (the services hub has two pages on one ladder row);
// `children` adds what the page around it says about it.
export function OfferCard({
  service,
  flow,
  locale,
  heading = 'h3',
  href,
  name,
  summary = service.summary,
  children,
}: {
  service: Service;
  flow: readonly FlowTile[];
  locale: Locale;
  heading?: Heading;
  href?: string | null;
  name?: string;
  summary?: string;
  children?: ReactNode;
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
      <ServiceName
        service={service}
        locale={locale}
        heading={heading}
        href={href}
        name={name}
      />
      <p className="text-ui-m text-fg-soft">{summary}</p>
      {children}
      <FlowRow tiles={flow} className="mt-auto pt-2" />
    </li>
  );
}

// A monthly or per-format line (training, care, growth) as ruled tiers. The
// full catalogue (`detailed`) shows every note and lists the tiers as rows.
export function Tiers({
  service,
  locale,
  heading = 'h3',
  detailed = false,
  href,
  priceLabel = '',
  children,
}: {
  service: Service;
  locale: Locale;
  heading?: Heading;
  detailed?: boolean;
  href?: string | null;
  priceLabel?: string;
  children?: ReactNode;
}) {
  return (
    <div data-service={service.id} className={detailed ? 'tiers-detailed' : ''}>
      <ServiceName
        service={service}
        locale={locale}
        heading={heading}
        href={href}
      />
      <p className="tier-summary">{service.summary}</p>
      <dl className="tier-list">
        {service.prices.map((price) => (
          <div key={price.id}>
            <dt className="text-ui-s font-semibold">
              {price.label ?? priceLabel}
            </dt>
            <dd className="mt-1">
              <Amount locale={locale} price={price} />
              {price.note ? (
                <span className="tier-note">{price.note}</span>
              ) : null}
            </dd>
          </div>
        ))}
      </dl>
      {children}
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
