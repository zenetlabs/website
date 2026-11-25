import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Includes, PriceTicket } from '@/components/price-ticket';
import { formatPrice, formatPriceSummary } from '@/lib/money';
import { SERVICES } from '../../test/page-content';
import { SERVICE_BODIES } from '../../test/service-bodies';

const FACTS = {
  who: 'Companies with a steady flow',
  timeline: '6–10 weeks to a pilot',
  start: 'The diagnostic, credited to the project',
};

function view(locale: 'en' | 'es', id: keyof typeof SERVICES.en) {
  const labels = SERVICE_BODIES[locale].hub.labels;
  return {
    labels,
    service: SERVICES[locale][id],
    ...render(
      <PriceTicket
        service={SERVICES[locale][id]}
        facts={FACTS}
        labels={labels}
        locale={locale}
      />,
    ),
  };
}

describe('PriceTicket', () => {
  it.each(['en', 'es'] as const)(
    'names the ladder row and reads its first price as one string (%s)',
    (locale) => {
      const { container, service } = view(locale, 'agent');
      expect(container.querySelector('.ticket')).toHaveAttribute(
        'data-service',
        'agent',
      );
      expect(screen.getByText(service.name)).toBeInTheDocument();
      expect(container.querySelector('.sr-only')?.textContent).toBe(
        formatPrice(locale, service.prices[0]),
      );
    },
  );

  it('adds the summary for a row with several prices only', () => {
    const training = view('en', 'training');
    expect(
      training.container.textContent?.includes(
        formatPriceSummary('en', training.service.prices),
      ),
    ).toBe(true);
    training.unmount();
    const agent = view('en', 'agent');
    expect(agent.container.querySelectorAll('.text-muted-fg')).toHaveLength(1);
  });

  it('sets the tax note, the timeline, who and the first step on the stub', () => {
    const { container, labels } = view('en', 'maintenance');
    expect(container.querySelector('.ticket-offer')).toHaveTextContent(
      labels.taxNote,
    );
    const terms = [...container.querySelectorAll('dt')].map(
      (dt) => dt.textContent,
    );
    expect(terms).toEqual([labels.timeline, labels.who]);
    expect(container.querySelector('.ticket-offer')).toHaveTextContent(
      FACTS.timeline,
    );
    expect(container.querySelector('.ticket-offer')).toHaveTextContent(
      FACTS.who,
    );
    expect(container.querySelector('.ticket-stub')).toHaveTextContent(
      `${labels.start}${FACTS.start}`,
    );
  });

  it('has no heading and no link', () => {
    const { container } = view('en', 'agent');
    expect(container.querySelectorAll('h1, h2, h3, h4, a')).toHaveLength(0);
  });
});

describe('Includes', () => {
  it('labels a list with ticks', () => {
    const { container } = render(
      <Includes label="Included" items={['One', 'Two', 'Three']} />,
    );
    expect(screen.getByText('Included')).toBeInTheDocument();
    expect(container.querySelectorAll('li.tick-item')).toHaveLength(3);
  });
});
