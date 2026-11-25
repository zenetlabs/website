import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PageHero } from '@/components/page-hero';
import { CTA_TARGET, navHref } from '@/lib/nav';
import { titleText } from '@/lib/title-text';

const TITLE = {
  before: 'AI agents for SMEs that do ',
  emphasis: 'real work',
  after: '',
};

function view(board?: boolean) {
  return render(
    <PageHero
      locale="en"
      title={TITLE}
      lead="One sentence."
      button="Book a call"
      pricing="See pricing"
      board={board ? <p>The board</p> : undefined}
      ticket={<p>The ticket</p>}
      includes={<p>The includes</p>}
    />,
  );
}

describe('PageHero', () => {
  it('renders one h1 with the title', () => {
    view();
    const headings = screen.getAllByRole('heading', { level: 1 });
    expect(headings).toHaveLength(1);
    expect(headings[0]?.textContent).toBe(titleText(TITLE));
  });

  it('puts the sentence before the actions, the booking CTA first and the secondary link last', () => {
    const { container } = view();
    const lead = screen.getByText('One sentence.');
    const button = screen.getByRole('link', { name: 'Book a call' });
    const secondary = screen.getByRole('link', { name: 'See pricing' });
    expect(button).toHaveAttribute('href', navHref('en', CTA_TARGET));
    expect(button).toHaveAttribute('data-cta', 'page_hero');
    expect(secondary).toHaveAttribute('href', '/pricing');
    expect(lead.compareDocumentPosition(button)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
    expect(button.compareDocumentPosition(secondary)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
    const links = container.querySelectorAll('section a');
    expect(links[links.length - 1]).toBe(secondary);
  });

  it('puts the board then the ticket in the stage, and the includes in the aside', () => {
    const { container } = view(true);
    expect(container.querySelector('.inner-hero-stage')?.textContent).toBe(
      'The boardThe ticket',
    );
    expect(container.querySelector('.inner-hero-aside')).toHaveTextContent(
      'The includes',
    );
  });

  it('leaves the stage to the ticket without a board', () => {
    const { container } = view();
    expect(container.querySelector('.inner-hero-stage')?.textContent).toBe(
      'The ticket',
    );
    expect(container.querySelector('.inner-hero-aside')).toHaveTextContent(
      'The includes',
    );
  });

  it('sits on the tint ground and spaces the title only under a breadcrumb', () => {
    const { container } = view();
    expect(container.querySelector('section')).toHaveAttribute(
      'data-ground',
      'tint',
    );
    expect(container.querySelector('h1')?.className).not.toContain('mt-6');
  });
});
