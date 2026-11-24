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

  it('offers one action, Book a call, before the stage, and no pricing link', () => {
    const { container } = view();
    const links = screen.getAllByRole('link');
    expect(links[0]).toHaveAttribute('href', navHref(locale, CTA_TARGET));
    expect(links[0]).toHaveClass('bg-cta');
    expect(links[0]).toHaveTextContent(home.hero.primary);
    expect(container.querySelector('.hero-actions')?.children).toHaveLength(1);
    expect(
      links.filter(
        (link) => link.getAttribute('href') === pagePath(locale, 'pricing'),
      ),
    ).toEqual([]);
  });

  it('puts the action straight under the heading, then the stage', () => {
    const { container } = view();
    const h1 = container.querySelector('h1');
    expect(h1?.nextElementSibling).toHaveClass('hero-actions');
    expect(h1?.nextElementSibling?.nextElementSibling).toHaveAttribute(
      'data-switchboard',
    );
  });

  it('states the diagnostic price as the hard fact', () => {
    view();
    const price = screen.getByText('PRICE');
    expect(price.tagName).toBe('STRONG');
    expect(price.parentElement).toHaveTextContent(
      home.hero.fact.replace('{price}', 'PRICE'),
    );
  });

  it('sells below the stage: the lede, then the facts and the founder', () => {
    const { container } = view();
    const stage = container.querySelector('[data-switchboard]');
    const pitch = container.querySelector('.hero-pitch');
    expect(stage?.nextElementSibling).toBe(pitch);
    const lead = pitch?.firstElementChild;
    expect(lead?.tagName).toBe('P');
    expect(lead).toHaveTextContent(home.hero.lead);
    expect(home.hero.lead).not.toMatch(/[()]/);
    expect(home.hero.lead.match(/[.!?](\s|$)/g)).toHaveLength(1);
    expect(pitch?.querySelector('.hero-facts')).toHaveTextContent(
      home.hero.audience,
    );
    const order = [...(pitch?.querySelectorAll('.hero-facts, .handoff') ?? [])];
    expect(order.map((el) => el.className.split(' ')[0])).toEqual([
      'hero-facts',
      'handoff',
    ]);
  });

  it('hands over to the founder, in the amber of a person, linked to the about page', () => {
    view();
    const handoff = screen.getByRole('link', { name: /Albert/ });
    expect(handoff).toHaveAttribute('href', pagePath(locale, 'about'));
    expect(handoff).toHaveTextContent(home.hero.handoff);
    expect(handoff.querySelector('.monogram')).toHaveTextContent('AS');
  });

  it('carries the agent desk inside the switchboard, its picture hidden from assistive tech', () => {
    const { container } = view();
    expect(
      container.querySelector('[data-switchboard] > [data-desk]'),
    ).not.toBeNull();
    expect(container.querySelector('.sb-orbit')).toHaveAttribute(
      'aria-hidden',
      'true',
    );
  });
});
