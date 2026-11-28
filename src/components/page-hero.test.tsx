import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { HeroActions, PageHero } from '@/components/page-hero';
import { CTA_TARGET, navHref } from '@/lib/nav';
import { titleText } from '@/lib/title-text';

const TITLE = {
  before: 'AI agents for SMEs that do ',
  emphasis: 'real work',
  after: '',
};

function view({ stage = true, aside = true } = {}) {
  return render(
    <PageHero
      title={TITLE}
      lead="One sentence."
      actions={
        <HeroActions
          locale="en"
          button="Book a call"
          secondary={{ label: 'See pricing', page: 'pricing' }}
        />
      }
      stage={stage ? <p>The stage</p> : undefined}
      aside={aside ? <p>The aside</p> : undefined}
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

  it('puts the stage on the right and the aside under the copy', () => {
    const { container } = view();
    expect(container.querySelector('.inner-hero-stage')).toHaveTextContent(
      'The stage',
    );
    expect(container.querySelector('.inner-hero-aside')).toHaveTextContent(
      'The aside',
    );
  });

  it('renders the stage and the aside only when they are given', () => {
    const { container } = view({ stage: false, aside: false });
    expect(container.querySelector('.inner-hero-stage')).toBeNull();
    expect(container.querySelector('.inner-hero-aside')).toBeNull();
    expect(container.querySelector('section')).toHaveAttribute(
      'data-stage',
      'none',
    );
  });

  it('marks no stage attribute when it has a stage', () => {
    const { container } = view();
    expect(container.querySelector('section')).not.toHaveAttribute(
      'data-stage',
    );
  });

  it('marks a compact hero and no other', () => {
    const { container, rerender } = view();
    expect(container.querySelector('section')).not.toHaveAttribute('data-size');
    rerender(<PageHero compact title={TITLE} lead="One sentence." />);
    expect(container.querySelector('section')).toHaveAttribute(
      'data-size',
      'compact',
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
