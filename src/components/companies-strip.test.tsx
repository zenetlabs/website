import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CompaniesStrip } from '@/components/companies-strip';
import { home as enHome } from '@/content/en/home';
import { home as esHome } from '@/content/es/home';
import { PORTFOLIO } from '@/lib/portfolio';

const HREFS = [
  'https://viatsy.com',
  'https://mexicatravel.com',
  'https://taplany.com',
  'https://brisily.com',
  'https://luce.es',
];

describe.each([
  ['en', enHome],
  ['es', esHome],
] as const)('CompaniesStrip (%s)', (_locale, home) => {
  function links() {
    render(<CompaniesStrip copy={home.companies} />);
    return within(screen.getByRole('list')).getAllByRole('link');
  }

  it('renders exactly 5 links with the exact hrefs', () => {
    expect(links().map((link) => link.getAttribute('href'))).toEqual(HREFS);
  });

  it('keeps links clean for SEO and in the same tab', () => {
    for (const link of links()) {
      expect(link).not.toHaveAttribute('rel');
      expect(link).not.toHaveAttribute('target');
    }
  });

  it('shows each product name and its category in the active language', () => {
    const all = links().map((link) => link.textContent ?? '');
    for (const [index, { key, name }] of PORTFOLIO.entries()) {
      expect(all[index]).toContain(name);
      expect(all[index]).toContain(home.companies.items[key].category);
    }
  });

  it('names the strip with an h2', () => {
    render(<CompaniesStrip copy={home.companies} />);
    expect(
      screen.getByRole('heading', { level: 2, name: home.companies.title }),
    ).toBeInTheDocument();
  });
});
