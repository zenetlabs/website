import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ServiceLadder } from '@/components/service-ladder';
import { home as enHome } from '@/content/en/home';
import { home as esHome } from '@/content/es/home';
import { formatPriceSummary } from '@/lib/money';
import { SERVICES } from '../../test/page-content';

describe.each([
  ['en', enHome, '/pricing'],
  ['es', esHome, '/es/precios'],
] as const)('ServiceLadder (%s)', (locale, home, pricing) => {
  const services = SERVICES[locale];

  function rows() {
    render(
      <ServiceLadder
        copy={home.services}
        services={services}
        locale={locale}
      />,
    );
    return within(screen.getByRole('list')).getAllByRole('link');
  }

  it('renders 7 rows linking to the pricing cards', () => {
    expect(rows().map((row) => row.getAttribute('href'))).toEqual(
      Object.keys(services).map((id) => `${pricing}#${id}`),
    );
  });

  it('shows the name, summary and formatted price of each service', () => {
    const all = rows();
    for (const [index, service] of Object.values(services).entries()) {
      const text = all[index]?.textContent ?? '';
      expect(text).toContain(service.name);
      expect(text).toContain(service.summary);
      expect(text).toContain(formatPriceSummary(locale, service.prices));
    }
  });

  it('adds one link to the full pricing page', () => {
    render(
      <ServiceLadder
        copy={home.services}
        services={services}
        locale={locale}
      />,
    );
    const links = screen.getAllByRole('link', {
      name: `${home.services.more} →`,
    });
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveAttribute('href', pricing);
  });
});
