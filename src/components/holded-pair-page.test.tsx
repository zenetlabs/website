import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { HoldedPairPage } from '@/components/holded-pair-page';
import { HOLDED_PAGE_IDS } from '@/lib/page-registry';
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

describe.each(HOLDED_PAGE_IDS)('HoldedPairPage (%s)', (page) => {
  const copy = SPANISH[page];

  function view() {
    return render(
      <HoldedPairPage
        page={page}
        locale="es"
        copy={copy}
        hub={HUB_ES}
        services={SERVICES.es}
      />,
    );
  }

  it('nests the breadcrumb under integrations', () => {
    view();
    expect(
      screen
        .getAllByRole('link', { name: HUB_ES.cards.integrations.name })
        .some((link) => link.closest('nav')),
    ).toBe(true);
  });

  it('renders the sync table with labelled headers and one row per datum', () => {
    const { container } = view();
    const table = container.querySelector('#sync table');
    expect(table).toHaveAttribute('aria-labelledby', 'sync-title');
    expect(container.querySelector('#sync-title')).not.toBeNull();
    expect(
      [...(table?.querySelectorAll('th[scope="col"]') ?? [])].map(
        (th) => th.textContent,
      ),
    ).toEqual([
      copy.sync.columns.data,
      copy.sync.columns.direction,
      copy.sync.columns.when,
    ]);
    expect(table?.querySelectorAll('tbody th[scope="row"]')).toHaveLength(
      copy.sync.rows.length,
    );
    expect(screen.getByText(copy.sync.note)).toBeInTheDocument();
  });

  it('renders six edge cases and four collapsed questions', () => {
    const { container } = view();
    expect(container.querySelectorAll('#edge-cases h3')).toHaveLength(6);
    const details = [...container.querySelectorAll('details')];
    expect(details.map((item) => item.id)).toEqual(
      copy.faq.items.map((item) => `faq-${item.id}`),
    );
    expect(details).toHaveLength(4);
    expect(container.querySelectorAll('script, img')).toHaveLength(0);
  });
});

describe('HoldedPairPage table', () => {
  it('labels each cell for the stacked mobile layout and marks the direction with an icon', () => {
    const { container } = render(
      <HoldedPairPage
        page="holdedWoocommerce"
        locale="es"
        copy={SPANISH.holdedWoocommerce}
        hub={HUB_ES}
        services={SERVICES.es}
      />,
    );
    const first = container.querySelector('tbody tr');
    const cells = [...(first?.querySelectorAll('td') ?? [])];
    expect(cells.map((cell) => cell.getAttribute('data-label'))).toEqual([
      SPANISH.holdedWoocommerce.sync.columns.direction,
      SPANISH.holdedWoocommerce.sync.columns.when,
    ]);
    expect(cells[0]?.querySelector('.icon-tool')).not.toBeNull();
    expect(cells[1]?.querySelector('.icon-tool')).toBeNull();
  });
});
