import { CtaLink } from '@/components/cta-link';
import { FlowRow } from '@/components/flow-tiles';
import { BulletList } from '@/components/lists';
import { ServiceName } from '@/components/service-name';
import { Amount } from '@/components/ticket-shell';
import { PRIMARY_BUTTON, TEXT_LINK } from '@/components/ui';
import type { ServiceId, Services, ServicesHubContent } from '@/content/types';
import type { Locale } from '@/lib/i18n';
import { formatPriceSummary } from '@/lib/money';
import { ctaTarget, navHref } from '@/lib/nav';
import { BUILDS } from '@/lib/offer-flows';
import { pagePath, pagesForService, type SiteFlags } from '@/lib/page-registry';
import { SITE } from '@/lib/site';

const RUN = ['maintenance', 'growth'] as const satisfies readonly ServiceId[];

type Mode =
  | { mode: 'hub' }
  | {
      mode: 'pricing';
      more: string;
      plan: readonly string[];
      timeline?: string;
      includes: Partial<Record<ServiceId, readonly string[]>>;
    };

function MoreAbout({
  id,
  label,
  hub,
  locale,
}: {
  id: ServiceId;
  label: string;
  hub: ServicesHubContent;
  locale: Locale;
}) {
  const pages = pagesForService(id);
  if (pages.length === 0) return null;
  return (
    <p className="flex flex-wrap items-baseline gap-x-4 gap-y-1 text-ui-s">
      <span className="text-muted-fg">{label}</span>
      {pages.map((page) => (
        <a key={page} href={pagePath(locale, page)} className={TEXT_LINK}>
          {hub.cards[page].name}
        </a>
      ))}
    </p>
  );
}

// The whole offer as one perforated ticket read left to right: the diagnostic
// to start, what you build after it (the 60-day credit on the first
// perforation), what you run each month; the training line under it. Its
// words come from the hub. On `pricing` the names are plain text, each service
// adds a "More about" line and the diagnostic its deliverables; on `hub` the
// names link to their pages and only the names and prices show.
export function Ladder({
  services,
  hub,
  locale,
  site = SITE,
  ...detail
}: {
  services: Services;
  hub: ServicesHubContent;
  locale: Locale;
  site?: SiteFlags;
} & Mode) {
  const pricing = detail.mode === 'pricing' ? detail : null;
  const href = pricing ? null : undefined;
  const { diagnostic, training } = services;
  const { ladder } = hub;
  const more = (id: ServiceId) =>
    pricing ? (
      <MoreAbout id={id} label={pricing.more} hub={hub} locale={locale} />
    ) : null;
  const named = (id: ServiceId) => (
    <ServiceName
      service={services[id]}
      locale={locale}
      heading="h2"
      href={href}
    />
  );

  return (
    <>
      <div className="ladder">
        <div className="ladder-seg ladder-start" data-service="diagnostic">
          <p className="ladder-label">{hub.startHere}</p>
          {named('diagnostic')}
          <p className="ladder-start-price">
            <Amount locale={locale} price={diagnostic.prices[0]} />
          </p>
          <p className="flex flex-wrap gap-2">
            {[ladder.oneOff, pricing?.timeline].map((pill) =>
              pill ? (
                <span key={pill} className="meta-pill">
                  {pill}
                </span>
              ) : null,
            )}
          </p>
          {pricing ? (
            <BulletList
              items={pricing.plan}
              marker="tick"
              className="text-ui-m text-fg-soft"
            />
          ) : null}
          <CtaLink
            cta="start_here"
            href={navHref(locale, ctaTarget(site))}
            className={`${PRIMARY_BUTTON} max-sm:w-full lg:w-fit`}
          >
            {hub.book}
          </CtaLink>
          {more('diagnostic')}
        </div>
        <div className="ladder-seg">
          <p className="ladder-credit">{ladder.credit}</p>
          <p className="ladder-label">{ladder.build}</p>
          <div className="ladder-rows">
            {BUILDS.map(({ id, flow }) => {
              const service = services[id];
              return (
                <div key={id} className="ladder-row" data-service={id}>
                  <div className="ladder-row-top">
                    {named(id)}
                    <p className="ladder-amount">
                      <Amount locale={locale} price={service.prices[0]} />
                    </p>
                  </div>
                  {service.prices.length > 1 ? (
                    <p className="text-ui-s text-muted-fg">
                      {formatPriceSummary(locale, service.prices)}
                    </p>
                  ) : null}
                  {pricing ? (
                    <>
                      <p className="text-ui-m text-fg-soft">
                        {service.summary}
                      </p>
                      <FlowRow tiles={flow} className="ladder-tiles" />
                    </>
                  ) : null}
                  {more(id)}
                </div>
              );
            })}
          </div>
        </div>
        <div className="ladder-seg">
          <p className="ladder-label">{ladder.run}</p>
          <div className="ladder-rows">
            {RUN.map((id) => (
              <div key={id} className="ladder-row" data-service={id}>
                {named(id)}
                {services[id].prices.map((price) =>
                  price.label || price.note ? (
                    <div key={price.id} className="ladder-tier">
                      <p className="ladder-amount">
                        <Amount locale={locale} price={price} />
                      </p>
                      <p className="text-ui-s text-fg-soft">
                        <b className="text-fg">
                          {price.label ?? hub.labels.price}.
                        </b>
                        {price.note ? ` ${price.note}` : null}
                      </p>
                    </div>
                  ) : (
                    <p key={price.id} className="ladder-amount">
                      <Amount locale={locale} price={price} />
                    </p>
                  ),
                )}
                {pricing?.includes[id] ? (
                  <BulletList
                    items={pricing.includes[id]}
                    marker="tick"
                    className="text-ui-s text-fg-soft"
                  />
                ) : null}
                {more(id)}
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="ladder-side" data-service="training">
        {named('training')}
        <div className="ladder-items">
          {training.prices.map((price) => (
            <p key={price.id}>
              <span className="text-fg-soft">
                {price.label ?? hub.labels.price}
              </span>{' '}
              <span className="ladder-amount">
                <Amount locale={locale} price={price} />
              </span>
            </p>
          ))}
          {more('training')}
        </div>
      </div>
    </>
  );
}
