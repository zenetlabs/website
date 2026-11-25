import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Ledger } from '@/components/ledger';

describe('Ledger', () => {
  const items = [
    {
      id: 'a',
      title: 'Linked',
      text: 'x',
      page: 'verifactu',
      tiles: ['gmail', 'agent', 'human'],
    },
    { id: 'b', title: 'Plain', text: 'y' },
  ] as const;

  it('sets an h3 per item and links it only when it names a page', () => {
    const { container } = render(<Ledger locale="es" items={items} />);
    const titles = container.querySelectorAll('h3');
    expect(titles).toHaveLength(2);
    expect(titles[0]?.querySelector('a')).toHaveAttribute(
      'href',
      '/es/verifactu-integracion',
    );
    expect(titles[1]?.querySelector('a')).toBeNull();
  });

  it('draws tiles only for an item that has them, hidden from assistive technology', () => {
    const { container } = render(<Ledger locale="en" items={items} />);
    const rows = container.querySelectorAll('li');
    expect(rows[0]).toHaveAttribute('data-tiles');
    expect(rows[0]?.querySelectorAll('.flow-tile')).toHaveLength(3);
    expect(rows[0]?.querySelector('.ledger-tiles')).toHaveAttribute(
      'aria-hidden',
      'true',
    );
    expect(rows[1]).not.toHaveAttribute('data-tiles');
    expect(rows[1]?.querySelector('.ledger-tiles')).toBeNull();
  });
});
