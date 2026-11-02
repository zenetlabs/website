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
      />,
    );
    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(3);
    expect(items[0]).toHaveTextContent('Your tools');
    expect(items[1]).toHaveTextContent('Agent');
    expect(items[2]).toHaveTextContent('A person');
    expect(container.querySelector('ol')).not.toBeNull();
    expect(screen.getByText('Caption').tagName).toBe('FIGCAPTION');
    for (const icon of container.querySelectorAll('.icon')) {
      expect(icon).toHaveAttribute('aria-hidden', 'true');
    }
  });
});
