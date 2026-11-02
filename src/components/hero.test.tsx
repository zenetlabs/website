import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Hero } from '@/components/hero';
import { home as enHome } from '@/content/en/home';
import { home as esHome } from '@/content/es/home';
import { CTA_TARGET, navHref } from '@/lib/nav';

describe.each([
  ['en', enHome],
  ['es', esHome],
] as const)('Hero (%s)', (locale, home) => {
  function view() {
    return render(
      <Hero
        copy={home.hero}
        proof={home.proof}
        diagnosticPrice="PRICE"
        locale={locale}
      />,
    );
  }

  it('has no eyebrow above the heading', () => {
    const { container } = view();
    expect(container.querySelector('h1')?.previousElementSibling).toBeNull();
  });

  it('puts the booking button first and the pricing link second', () => {
    view();
    const links = screen.getAllByRole('link');
    expect(links[0]).toHaveAttribute('href', navHref(locale, CTA_TARGET));
    expect(links[0]).toHaveClass('bg-cta');
    expect(links[1]).toHaveTextContent(`${home.hero.secondary} →`);
  });

  it('shows the audience and the diagnostic price from the services', () => {
    view();
    expect(
      screen.getByText(
        new RegExp(`${home.hero.audience} · ${home.hero.diagnostic}`),
      ),
    ).toHaveTextContent('PRICE');
  });
});
