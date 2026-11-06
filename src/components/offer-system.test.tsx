import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { OfferSystem } from '@/components/offer-system';
import { home as enHome } from '@/content/en/home';
import { home as esHome } from '@/content/es/home';
import { priceParts } from '@/lib/money';
import type { SiteFlags } from '@/lib/page-registry';
import { SERVICES } from '../../test/page-content';

const BOOKING: SiteFlags = {
  calculator: { published: false },
  booking: { published: true },
};
const NO_BOOKING: SiteFlags = {
  calculator: { published: false },
  booking: { published: false },
};

const OFFER = {
  en: [
    '/services/automation-diagnostic',
    '/services/ai-automation',
    '/services/custom-software',
    '/services/ai-agents',
    '/services/ai-training',
    '/services/maintenance',
  ],
  es: [
    '/es/servicios/diagnostico-de-automatizacion',
    '/es/servicios/automatizacion-de-procesos',
    '/es/servicios/desarrollo-de-software-a-medida',
    '/es/servicios/agentes-de-ia',
    '/es/servicios/formacion-ia-equipos',
    '/es/servicios/mantenimiento',
  ],
} as const;

const BOOK = { en: '/book', es: '/es/reservar' } as const;
const CONTACT = { en: '/contact', es: '/es/contacto' } as const;

describe.each([
  ['en', enHome],
  ['es', esHome],
] as const)('OfferSystem (%s)', (locale, home) => {
  const services = SERVICES[locale];

  function view(site: SiteFlags = BOOKING) {
    return render(
      <OfferSystem
        copy={home.services}
        services={services}
        locale={locale}
        site={site}
      />,
    );
  }

  it('links every offer to its service page, the diagnostic first', () => {
    const { container } = view();
    const hrefs = [...container.querySelectorAll('h3 a')].map((link) =>
      link.getAttribute('href'),
    );
    expect(hrefs).toEqual(OFFER[locale]);
  });

  it('shows every price of the offer and leaves growth to the pricing page', () => {
    const { container } = view();
    const text = (container.textContent ?? '').replace(/\s+/g, ' ');
    for (const service of Object.values(services)) {
      for (const price of service.prices) {
        const { amount } = priceParts(locale, price);
        if (service.id === 'growth') {
          expect(text).not.toContain(services.growth.name);
        } else {
          expect(text).toContain(amount.replace(/\s+/g, ' '));
        }
      }
    }
  });

  it('books the diagnostic through the booking page, or the contact page while booking is off', () => {
    const { unmount } = view(BOOKING);
    expect(
      screen.getByRole('link', { name: home.services.book }),
    ).toHaveAttribute('href', BOOK[locale]);
    unmount();
    view(NO_BOOKING);
    expect(
      screen.getByRole('link', { name: home.services.book }),
    ).toHaveAttribute('href', CONTACT[locale]);
  });

  it('lists what the costed plan hands over in the ticket stub', () => {
    const { container } = view();
    const stub = container.querySelector<HTMLElement>('.ticket-stub');
    if (!stub) throw new Error('no stub');
    expect(within(stub).getByText(home.services.plan.title)).toBeVisible();
    expect(within(stub).getAllByRole('listitem')).toHaveLength(
      home.services.plan.items.length,
    );
  });

  it('keeps the price range on one line', () => {
    const { container } = view();
    const range = container.querySelector('.card-price-range');
    expect(range?.textContent).toBe(
      priceParts(locale, services.agent.prices[0]).amount,
    );
  });
});
