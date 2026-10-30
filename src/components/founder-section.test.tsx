import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { FounderPortrait, FounderSection } from '@/components/founder-section';
import { home as enHome } from '@/content/en/home';
import { home as esHome } from '@/content/es/home';
import { CONTENT } from '@/lib/content';

describe.each([
  ['en', enHome, '/about'],
  ['es', esHome, '/es/sobre-nosotros'],
] as const)('FounderSection (%s)', (locale, home, about) => {
  const { founder } = CONTENT[locale];

  function view() {
    return render(
      <FounderSection copy={home.founder} founder={founder} locale={locale} />,
    );
  }

  it('shows an aria-hidden monogram and no image without a photo', () => {
    const { container } = view();
    expect(container.querySelector('img')).toBeNull();
    const monogram = container.querySelector('[aria-hidden="true"]');
    expect(monogram?.textContent).toBe('AS');
  });

  it('keeps a single clean Brisa link', () => {
    view();
    const brisa = screen.getAllByRole('link', { name: 'Brisa' });
    expect(brisa).toHaveLength(1);
    expect(brisa[0]).toHaveAttribute('href', 'https://brisa.build/');
    expect(brisa[0]).not.toHaveAttribute('rel');
    expect(brisa[0]).not.toHaveAttribute('target');
  });

  it('links to the about page', () => {
    view();
    expect(
      screen.getByRole('link', { name: `${home.founder.more} →` }),
    ).toHaveAttribute('href', about);
  });
});

describe('FounderPortrait', () => {
  const { founder } = CONTENT.en;

  it('renders a lazy decorative image when a photo is set', () => {
    const { container } = render(
      <FounderPortrait
        founder={{
          ...founder,
          photo: { src: '/founder.webp', width: 288, height: 288 },
        }}
      />,
    );
    const image = container.querySelector('img');
    expect(image).toHaveAttribute('src', '/founder.webp');
    expect(image).toHaveAttribute('alt', '');
    expect(image).toHaveAttribute('width', '288');
    expect(image).toHaveAttribute('height', '288');
    expect(image).toHaveAttribute('loading', 'lazy');
    expect(image).toHaveAttribute('decoding', 'async');
  });
});
