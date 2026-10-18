import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Portfolio } from '@/components/portfolio';
import { locales, messages } from '@/lib/i18n';

const HREFS = [
  'https://viatsy.com',
  'https://mexicatravel.com',
  'https://taplany.com',
  'https://brisily.com',
  'https://luce.es',
];

const state = vi.hoisted(() => ({ locale: 'en' }));

vi.mock('@tanstack/react-router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@tanstack/react-router')>()),
  useRouteContext: ({
    select,
  }: {
    select: (context: { locale: string }) => unknown;
  }) => select({ locale: state.locale }),
}));

describe.each(locales)('Portfolio (%s)', (locale) => {
  function links() {
    state.locale = locale;
    render(<Portfolio />);
    const list = screen.getByRole('list');
    return within(list).getAllByRole('link');
  }

  it('renders exactly 5 links with the exact hrefs', () => {
    expect(links().map((link) => link.getAttribute('href'))).toEqual(HREFS);
  });

  it('keeps links clean for SEO', () => {
    for (const link of links()) {
      const rel = link.getAttribute('rel');
      expect(rel === null || rel === 'noopener').toBe(true);
      expect(rel ?? '').not.toMatch(/nofollow|sponsored|ugc/);
      const target = link.getAttribute('target');
      expect(
        target === null || (target === '_blank' && rel === 'noopener'),
      ).toBe(true);
    }
  });

  it('describes every product in the active language', () => {
    const copy = messages[locale].work.items;
    const all = links().map((link) => link.textContent ?? '');
    for (const [index, item] of Object.values(copy).entries()) {
      expect(all[index]).toContain(item.description);
      expect(all[index]).toContain(item.category);
    }
  });

  it('shows the founder track record with a single clean Brisa link', () => {
    state.locale = locale;
    const { container } = render(<Portfolio />);
    const { founder } = messages[locale].work;
    const heading = screen.getByRole('heading', { name: founder.label });
    const paragraph = heading.nextElementSibling;
    if (!(paragraph instanceof HTMLParagraphElement)) {
      throw new Error('missing paragraph');
    }
    expect(paragraph.textContent).toBe(
      `${founder.intro} Splyt ${founder.splytAfter} Brisa${founder.brisaAfter}`,
    );
    const blockLinks = within(paragraph).getAllByRole('link');
    expect(blockLinks).toHaveLength(1);
    expect(blockLinks[0]).toHaveAttribute('href', 'https://brisa.build/');
    expect(blockLinks[0]).not.toHaveAttribute('rel');
    expect(container.textContent).not.toContain('Setoros');
  });
});
