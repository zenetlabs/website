import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { FlowDiagram } from '@/components/flow-diagram';

const ACTORS = { tool: 'Your tools', agent: 'Agent', human: 'A person' };

describe('FlowDiagram', () => {
  it('is an ordered list with the actor named as text and a visible caption', () => {
    const { container } = render(
      <FlowDiagram
        steps={[
          { actor: 'tool', label: 'Inquiry arrives' },
          { actor: 'agent', label: 'Agent drafts' },
          { actor: 'human', label: 'Person sends' },
        ]}
        actors={ACTORS}
        caption="Caption"
        approval={{
          title: 'Needs your approval',
          detail: 'Detail',
          approve: 'Approve',
          hold: 'Hold',
          caption: 'Example',
        }}
      />,
    );
    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(3);
    expect(items[0]).toHaveTextContent('Your tools');
    expect(items[1]).toHaveTextContent('Agent');
    expect(items[2]).toHaveTextContent('A person');
    expect(container.querySelector('ol')).not.toBeNull();
    expect(screen.getByText('Caption').tagName).toBe('FIGCAPTION');
    for (const tile of container.querySelectorAll('.flow-tile')) {
      expect(tile).toHaveAttribute('aria-hidden', 'true');
    }
    expect(items[2]).toHaveTextContent('Needs your approval');
    expect(items[0]).not.toHaveTextContent('Needs your approval');
  });

  it('draws a named tool by its own mark, and a step without one as an app', () => {
    const { container } = render(
      <FlowDiagram
        steps={[
          { actor: 'tool', label: 'Mail', tool: 'gmail' },
          { actor: 'tool', label: 'Portal' },
          { actor: 'tool', label: 'Books', tool: 'holded' },
        ]}
        actors={ACTORS}
        caption="Caption"
      />,
    );
    const tiles = [...container.querySelectorAll('.flow-tile')];
    expect(tiles[0]?.getAttribute('style')).toContain('/icons/tools/gmail.svg');
    expect(tiles[1]).toHaveClass('icon-app');
    expect(tiles[2]).toHaveClass('icon-ledger');
  });
});
