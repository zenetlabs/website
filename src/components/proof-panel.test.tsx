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

  it('staggers each line and then the approval block in order', () => {
    const { container } = render(<ProofPanel copy={copy} />);
    const steps = [...container.querySelectorAll<HTMLElement>('.proof-in')].map(
      (element) => Number(element.style.getPropertyValue('--i')),
    );
    expect(steps).toEqual([0, 1, 2, copy.lines.length + 1]);
    expect(container.querySelectorAll('.proof-approval')).toHaveLength(1);
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
