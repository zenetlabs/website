import { BulletList } from '@/components/lists';
import { Amount, TicketShell } from '@/components/ticket-shell';
import type { PageFacts, Service, ServicePageLabels } from '@/content/types';
import type { Locale } from '@/lib/i18n';
import { formatPriceSummary } from '@/lib/money';

// The page's offer on home's ticket frame: the ladder row's name and price,
// the tax note, when and for whom, and on the stub the first step. No heading
// and no link: the page's own heading and the hero's actions say the rest.
export function PriceTicket({
  service,
  facts,
  labels,
  locale,
}: {
  service: Service;
  facts: PageFacts;
  labels: ServicePageLabels;
  locale: Locale;
}) {
  return (
    <div className="price-ticket-wrap">
      <TicketShell
        service={service}
        className="price-ticket"
        offerClassName="p-5 md:p-7"
        stubClassName="p-5 md:p-7"
        offer={
          <>
            <p className="font-semibold">{service.name}</p>
            <p className="price-ticket-price">
              <Amount locale={locale} price={service.prices[0]} />
            </p>
            {service.prices.length > 1 ? (
              <p className="text-ui-s text-muted-fg">
                {formatPriceSummary(locale, service.prices)}
              </p>
            ) : null}
            <p className="mt-1 text-ui-s text-muted-fg">{labels.taxNote}</p>
            <dl className="mt-5 grid gap-3 text-ui-s">
              <div>
                <dt className="font-semibold">{labels.timeline}</dt>
                <dd className="text-fg-soft">{facts.timeline}</dd>
              </div>
              <div>
                <dt className="font-semibold">{labels.who}</dt>
                <dd className="text-fg-soft">{facts.who}</dd>
              </div>
            </dl>
          </>
        }
        stub={
          <>
            <p className="font-semibold">{labels.start}</p>
            <p className="mt-2 text-ui-m text-fg-soft">{facts.start}</p>
          </>
        }
      />
    </div>
  );
}

export function Includes({
  label,
  items,
}: {
  label: string;
  items: readonly string[];
}) {
  return (
    <div className="includes">
      <p className="font-semibold">{label}</p>
      <BulletList items={items} marker="tick" className="mt-3" />
    </div>
  );
}
