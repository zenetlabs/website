import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ProofPanel } from '@/components/proof-panel';
import { home as enHome } from '@/content/en/home';
import { home as esHome } from '@/content/es/home';

describe.each([
  ['en', enHome],
  ['es', esHome],
] as const)('ProofPanel (%s)', (_locale, home) => {
  const copy = home.proof;

  it('hides the visual and describes it in screen-reader text', () => {
    const { container } = render(<ProofPanel copy={copy} />);
    const visual = container.querySelector('[aria-hidden="true"]');
    expect(visual).not.toBeNull();
    expect(visual).toHaveTextContent(copy.approval.title);
    for (const line of copy.lines) expect(visual).toHaveTextContent(line);
    expect(screen.getByText(copy.description)).toHaveClass('sr-only');
  });

  it('shows a visible caption that says it is an example', () => {
    const { container } = render(<ProofPanel copy={copy} />);
    const caption = screen.getByText(copy.caption);
    expect(caption).toBeVisible();
    expect(
      container.querySelector('[aria-hidden="true"]'),
    ).not.toContainElement(caption);
  });

  it('lists each line, then one approval block', () => {
    const { container } = render(<ProofPanel copy={copy} />);
    expect(container.querySelectorAll('li')).toHaveLength(copy.lines.length);
    expect(container.querySelectorAll('[data-approval]')).toHaveLength(1);
  });

  it('invents no figures', () => {
    const text = [
      copy.title,
      copy.caption,
      copy.description,
      ...copy.lines,
      ...Object.values(copy.approval),
    ].join(' ');
    expect(text).not.toMatch(/\d/);
  });
});
