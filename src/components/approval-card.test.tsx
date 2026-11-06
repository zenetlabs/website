import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ApprovalCard } from '@/components/approval-card';
import { ProofPanel } from '@/components/proof-panel';
import { home } from '@/content/en/home';

describe('ApprovalCard parity', () => {
  it('has the same structure and text as the approval block in the proof panel', () => {
    const { approval } = home.proof;
    const card = render(<ApprovalCard copy={approval} />);
    const own = card.container.firstElementChild;
    card.unmount();
    const { container } = render(<ProofPanel copy={home.proof} />);
    const inline = container.querySelector('[data-approval]');
    expect(inline?.innerHTML).toBe(own?.innerHTML);
    for (const token of own?.classList ?? []) {
      expect(inline?.classList.contains(token)).toBe(true);
    }
  });
});
