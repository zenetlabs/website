import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { NotFound } from '@/components/not-found';
import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';
import { CTA_TARGET, navHref } from '@/lib/nav';

vi.mock('@tanstack/react-router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@tanstack/react-router')>()),
  useRouteContext: ({
    select,
  }: {
    select: (context: { locale: string }) => unknown;
  }) => select({ locale: 'en' }),
  useLocation: ({
    select,
  }: {
    select: (location: { searchStr: string }) => unknown;
  }) => select({ searchStr: '' }),
  useMatches: ({ select }: { select: (matches: never[]) => unknown }) =>
    select([]),
}));

describe('SiteHeader', () => {
  it('offers only the other language, named in itself', () => {
    render(<SiteHeader locale="en" />);
    const [switcher] = screen.getAllByRole('navigation', { name: 'Language' });
    if (!switcher) throw new Error('no language switch');
    const links = within(switcher).getAllByRole('link');
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveTextContent('Español');
    expect(links[0]).toHaveAttribute('lang', 'es');
    expect(links[0]).toHaveAttribute('hreflang', 'es');
  });

  it('closes the menu on Escape and returns focus to the toggle', () => {
    const { container } = render(<SiteHeader locale="en" />);
    const details = container.querySelector('details');
    const summary = container.querySelector('summary');
    if (!details || !summary) throw new Error('no menu');
    details.open = true;
    fireEvent.keyDown(details, { key: 'Escape' });
    expect(details.open).toBe(false);
    expect(document.activeElement).toBe(summary);
  });

  it('closes the menu when focus leaves it, not when it moves inside', () => {
    const { container } = render(
      <>
        <SiteHeader locale="en" />
        <button type="button">outside</button>
      </>,
    );
    const details = container.querySelector('details');
    const links = details?.querySelectorAll('a');
    const outside = screen.getByRole('button', { name: 'outside' });
    if (!details || !links?.[0] || !links[1]) throw new Error('no menu');
    details.open = true;
    fireEvent.blur(links[0], { relatedTarget: links[1] });
    expect(details.open).toBe(true);
    fireEvent.blur(links[1], { relatedTarget: outside });
    expect(details.open).toBe(false);
  });

  it('names the menu toggle for assistive technology', () => {
    const { container } = render(<SiteHeader locale="en" />);
    expect(container.querySelector('summary')).toHaveTextContent('Menu');
  });
});

describe('SiteFooter', () => {
  it('lists both languages and marks the current one', () => {
    vi.stubGlobal('__GA4_ID__', null);
    render(<SiteFooter locale="en" />);
    const switcher = screen.getByRole('navigation', {
      name: 'Language (footer)',
    });
    const links = within(switcher).getAllByRole('link');
    expect(links.map((link) => link.textContent)).toEqual([
      'English',
      'Español',
    ]);
    expect(links[0]).toHaveAttribute('aria-current', 'page');
    expect(
      screen.getByRole('link', { name: 'hello@zenetlabs.com' }),
    ).toHaveAttribute('href', 'mailto:hello@zenetlabs.com');
    vi.unstubAllGlobals();
  });
});

describe('NotFound', () => {
  it('sends the visitor home, to booking, services and pricing', () => {
    render(<NotFound locale="en" />);
    expect(
      screen.getByRole('link', { name: 'Back to the home page' }),
    ).toHaveAttribute('href', '/');
    const doors = within(screen.getByRole('list'))
      .getAllByRole('link')
      .map((link) => link.getAttribute('href'));
    expect(doors).toEqual([navHref('en', CTA_TARGET), '/services', '/pricing']);
  });
});
