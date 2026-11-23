import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Hero } from '@/components/hero';
import { home as enHome } from '@/content/en/home';
import { home as esHome } from '@/content/es/home';
import { CONTENT } from '@/lib/content';
import { CTA_TARGET, navHref } from '@/lib/nav';
import { pagePath } from '@/lib/page-registry';

describe.each([
  ['en', enHome],
  ['es', esHome],
] as const)('Hero (%s)', (locale, home) => {
  function view() {
    return render(
      <Hero
        copy={home.hero}
        desk={home.desk}
        diagnosticPrice="PRICE"
        founder={CONTENT[locale].founder}
        locale={locale}
      />,
    );
  }

  it('has no eyebrow above the heading', () => {
    const { container } = view();
    expect(container.querySelector('h1')?.previousElementSibling).toBeNull();
  });

  it('keeps the heading to ten words', () => {
    const { container } = view();
    const words = container.querySelector('h1')?.textContent?.split(/\s+/);
    expect(words?.length).toBeLessThanOrEqual(10);
  });

  it('puts the booking button first and the pricing button second', () => {
    view();
    const links = screen.getAllByRole('link');
    expect(links[0]).toHaveAttribute('href', navHref(locale, CTA_TARGET));
    expect(links[0]).toHaveClass('bg-cta');
    expect(links[1]).toHaveAttribute('href', pagePath(locale, 'pricing'));
    expect(links[1]).toHaveTextContent(home.hero.secondary);
  });

  it('states the diagnostic price as the hard fact', () => {
    view();
    const price = screen.getByText('PRICE');
    expect(price.tagName).toBe('STRONG');
    expect(price.parentElement).toHaveTextContent(
      home.hero.fact.replace('{price}', 'PRICE'),
    );
  });

  it('keeps the copy to the headline, one sentence and its actions', () => {
    const { container } = view();
    const column = container.querySelector('.hero-grid > div:first-child');
    const before = [...(column?.children ?? [])]
      .slice(0, 3)
      .map(
        (el) =>
          el.tagName + (el.className.includes('hero-actions') ? '.a' : ''),
      );
    expect(before).toEqual(['H1', 'P', 'DIV.a']);
    expect(home.hero.lead).not.toMatch(/[()]/);
    expect(home.hero.lead.match(/[.!?](\s|$)/g)).toHaveLength(1);
  });

  it('puts the facts and the founder after the actions', () => {
    const { container } = view();
    const column = container.querySelector('.hero-grid > div:first-child');
    const classes = [...(column?.children ?? [])].map((el) => el.className);
    const at = (name: string) => classes.findIndex((c) => c.includes(name));
    expect(at('hero-actions')).toBeLessThan(at('hero-facts'));
    expect(at('hero-facts')).toBeLessThan(at('handoff'));
  });

  it('hands over to the founder, in the amber of a person, linked to the about page', () => {
    view();
    const handoff = screen.getByRole('link', { name: /Albert/ });
    expect(handoff).toHaveAttribute('href', pagePath(locale, 'about'));
    expect(handoff).toHaveTextContent(home.hero.handoff);
    expect(handoff.querySelector('.monogram')).toHaveTextContent('AS');
  });

  it('carries the agent desk beside the copy', () => {
    const { container } = view();
    expect(container.querySelector('[data-desk]')).not.toBeNull();
  });
});
