import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Ladder } from '@/components/ladder';
import { servicesHub as enHub } from '@/content/en/services-hub';
import { servicesHub as esHub } from '@/content/es/services-hub';
import type { ServiceId } from '@/content/types';
import { formatPrice } from '@/lib/money';
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

const ORDER = [
  'diagnostic',
  'integration',
  'web',
  'agent',
  'maintenance',
  'growth',
  'training',
] as const satisfies readonly ServiceId[];

describe.each([
  ['en', enHub],
  ['es', esHub],
] as const)('Ladder (%s)', (locale, hub) => {
  const services = SERVICES[locale];

  const PRICING = {
    mode: 'pricing',
    more: 'More about',
    plan: ['One', 'Two'],
    timeline: '1–2 weeks',
    includes: { growth: ['Growth one', 'Growth two'] },
  } as const;

  function view(
    detail: { mode: 'hub' } | typeof PRICING = { mode: 'hub' },
    site: SiteFlags = BOOKING,
  ) {
    return render(
      <Ladder
        services={services}
        hub={hub}
        locale={locale}
        site={site}
        {...detail}
      />,
    );
  }

  it('orders the services diagnostic, builds, care, growth, training', () => {
    const { container } = view();
    const order = [...container.querySelectorAll('[data-service]')].map(
      (block) => block.getAttribute('data-service'),
    );
    expect(order).toEqual(ORDER);
    expect(container.querySelectorAll('h2')).toHaveLength(ORDER.length);
  });

  it('shows every price of every service', () => {
    const { container } = view();
    const text = container.textContent ?? '';
    for (const service of Object.values(services)) {
      for (const price of service.prices) {
        expect(text).toContain(formatPrice(locale, price));
      }
    }
  });

  it('puts the credit label between Start and Build', () => {
    const { container } = view();
    const start = container.querySelector('.ladder-start');
    const credit = screen.getByText(hub.ladder.credit);
    const build = screen.getByText(hub.ladder.build);
    expect(start?.compareDocumentPosition(credit)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
    expect(credit.compareDocumentPosition(build)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
  });

  it('books the diagnostic through the booking page, or contact while booking is off', () => {
    const { unmount } = view(undefined, BOOKING);
    expect(screen.getByRole('link', { name: hub.book })).toHaveAttribute(
      'href',
      locale === 'en' ? '/book' : '/es/reservar',
    );
    unmount();
    view(undefined, NO_BOOKING);
    expect(screen.getByRole('link', { name: hub.book })).toHaveAttribute(
      'href',
      locale === 'en' ? '/contact' : '/es/contacto',
    );
  });

  it('lists the diagnostic plan and its timeline on pricing only', () => {
    const { container, unmount } = view(PRICING);
    expect(container.querySelectorAll('.ladder-start .tick-item')).toHaveLength(
      2,
    );
    expect(container.querySelector('.ladder-start')).toHaveTextContent(
      PRICING.timeline,
    );
    unmount();
    const bare = view();
    expect(bare.container.querySelectorAll('.tick-item')).toHaveLength(0);
    expect(bare.container.querySelector('.ladder-start')).not.toHaveTextContent(
      PRICING.timeline,
    );
  });

  it('adds the "More about" line to every service page row and sets the names as plain text on pricing', () => {
    const { container } = view(PRICING);
    for (const id of ['diagnostic', 'integration', 'maintenance', 'training']) {
      expect(
        container.querySelector(`[data-service="${id}"] a`),
        id,
      ).not.toBeNull();
    }
    expect(container.querySelectorAll('h2 a')).toHaveLength(0);
    expect(container.querySelectorAll('.ladder-tiles')).toHaveLength(3);
    expect(
      container.querySelectorAll('[data-service="growth"] .tick-item'),
    ).toHaveLength(2);
    expect(
      container.querySelector('[data-service="maintenance"] .tick-item'),
    ).toBeNull();
  });

  it('links the names to their pages and drops the detail on the hub', () => {
    const { container } = view();
    expect(container.querySelectorAll('h2 a')).toHaveLength(ORDER.length);
    expect(container.querySelector('.tick-item')).toBeNull();
    expect(container.querySelector('.flow-row')).toBeNull();
    expect(container).not.toHaveTextContent(services.integration.summary);
  });
});
