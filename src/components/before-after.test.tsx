import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { BeforeAfter } from '@/components/before-after';

const ROWS = [
  { id: 'a', title: 'Alpha', before: 'Manual', after: 'Automatic' },
  { id: 'b', title: 'Beta', before: 'Slow', after: 'Fast' },
];

describe('BeforeAfter', () => {
  it('renders an item per row with an h3 and both column labels', () => {
    render(
      <BeforeAfter rows={ROWS} beforeLabel="Today" afterLabel="With us" />,
    );
    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(2);
    for (const [index, item] of items.entries()) {
      expect(
        within(item).getByRole('heading', {
          level: 3,
          name: ROWS[index]?.title,
        }),
      ).toBeInTheDocument();
      expect(item).toHaveTextContent('Today');
      expect(item).toHaveTextContent('With us');
      expect(item).toHaveTextContent(ROWS[index]?.before ?? '');
      expect(item).toHaveTextContent(ROWS[index]?.after ?? '');
    }
  });
});
