import type { ReactNode } from 'react';
import type { Price, Service } from '@/content/types';
import type { Locale } from '@/lib/i18n';
import { formatPrice, priceParts } from '@/lib/money';

// A price set in parts (the amount large); read, and copied into the page's
// markdown, as the one string it is.
export function Amount({ locale, price }: { locale: Locale; price: Price }) {
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

// The ticket's frame: the offer on the left, a perforation, the stub. Home's
// diagnostic and the service pages' price ticket fill it differently.
export function TicketShell({
  service,
  className = '',
  offerClassName,
  stubClassName = '',
  offer,
  stub,
}: {
  service: Service;
  className?: string;
  offerClassName: string;
  stubClassName?: string;
  offer: ReactNode;
  stub: ReactNode;
}) {
  return (
    <div
      className={className ? `ticket ${className}` : 'ticket'}
      data-service={service.id}
    >
      <div className={`ticket-offer ${offerClassName}`}>{offer}</div>
      <div
        className={
          stubClassName ? `ticket-stub ${stubClassName}` : 'ticket-stub'
        }
      >
        {stub}
      </div>
    </div>
  );
}
