import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { HoldedPairPage } from '@/components/holded-pair-page';
import { HOLDED_PAGE_IDS } from '@/lib/page-registry';
import { HUB_ES, SPANISH } from '../../test/landing';
import { SERVICES } from '../../test/page-content';

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
