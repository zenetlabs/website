import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { BeforeAfter } from '@/components/before-after';
import { SectorPage } from '@/components/sector-page';
import { pagePath } from '@/lib/page-registry';
import { HUB_ES, SPANISH } from '../../test/landing';
import { SERVICES } from '../../test/page-content';

vi.mock('@tanstack/react-router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@tanstack/react-router')>()),
  useRouteContext: ({
    select,
  }: {
    select: (context: { locale: string }) => unknown;
  }) => select({ locale: 'es' }),
}));

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

describe('SectorPage ledger and platform', () => {
  it('labels the ledger today and with us, with one h3 per task', () => {
    const { container } = view();
    expect(copy.work.todayLabel).toBe('Hoy');
    expect(copy.work.automatedLabel).toBe('Con nosotros');
    expect(container.querySelectorAll('#work h3')).toHaveLength(6);
  });

  it('names Taplany in the platform callout', () => {
    const { container } = view();
    expect(
      container.querySelector('#platform-title')?.parentElement,
    ).toHaveTextContent('Taplany');
  });
});

describe('SectorPage ledger parity', () => {
  it('renders the same list as BeforeAfter for the same rows', () => {
    const rows = copy.work.items.map((item) => ({
      id: item.id,
      title: item.title,
      before: item.today,
      after: item.automated,
    }));
    const shared = render(
      <BeforeAfter
        rows={rows}
        beforeLabel={copy.work.todayLabel}
        afterLabel={copy.work.automatedLabel}
      />,
    );
    const expected = shared.container.querySelector('ul')?.outerHTML;
    shared.unmount();
    const { container } = view();
    expect(container.querySelector('#work ul')?.outerHTML).toBe(expected);
  });
});
