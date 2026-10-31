import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SectorPage } from '@/components/sector-page';
import { pagePath } from '@/lib/page-registry';
import { HUB_ES, SPANISH } from '../../test/landing';
import { SERVICES } from '../../test/page-content';

const copy = SPANISH.travelAgencies;

function view() {
  return render(
    <SectorPage locale="es" copy={copy} hub={HUB_ES} services={SERVICES.es} />,
  );
}

describe('SectorPage', () => {
  it('shows six tasks, each with both labels', () => {
    const { container } = view();
    const cards = container.querySelectorAll('#work li');
    expect(cards).toHaveLength(6);
    for (const card of cards) {
      expect(card.textContent).toContain(copy.work.todayLabel);
      expect(card.textContent).toContain(copy.work.automatedLabel);
    }
  });

  it('links the case page by name and the platform site', () => {
    view();
    expect(
      screen.getByRole('link', { name: `${HUB_ES.landing.viatsyCase} →` }),
    ).toHaveAttribute('href', pagePath('es', 'viatsyCase'));
    expect(
      screen.getByRole('link', { name: `${copy.platform.link} →` }),
    ).toHaveAttribute('href', 'https://taplany.com');
  });

  it('renders four collapsed questions with their anchors and no script', () => {
    const { container } = view();
    const details = [...container.querySelectorAll('details')];
    expect(details.map((item) => item.id)).toEqual(
      copy.faq.items.map((item) => `faq-${item.id}`),
    );
    expect(details).toHaveLength(4);
    expect(container.querySelectorAll('script, img')).toHaveLength(0);
  });
});
