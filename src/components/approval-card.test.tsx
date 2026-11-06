import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ApprovalCard } from '@/components/approval-card';

const COPY = {
  title: 'Needs your approval',
  detail: 'A refund request is waiting for a person to decide.',
  approve: 'Approve',
  hold: 'Hold',
};

describe('ApprovalCard', () => {
  it('marks the person in amber and names both decisions', () => {
    const { container } = render(<ApprovalCard copy={COPY} />);
    expect(container.firstElementChild).toHaveClass('bg-human-soft');
    expect(screen.getByText(COPY.title)).toBeInTheDocument();
    expect(screen.getByText(COPY.approve)).toBeInTheDocument();
    expect(screen.getByText(COPY.hold)).toBeInTheDocument();
  });
});
