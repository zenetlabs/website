import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SiteFooter } from '@/components/site-footer';
import { COOKIE_SETTINGS_ID } from '@/lib/cookie-settings';

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

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('SiteFooter cookie settings', () => {
  it('has no cookie settings control while analytics is not configured', () => {
    vi.stubGlobal('__GA4_ID__', null);
    render(<SiteFooter locale="en" />);
    expect(screen.queryByText('Cookie settings')).toBeNull();
  });

  it('links to the cookies policy without JavaScript or before the dialog exists', async () => {
    vi.stubGlobal('__GA4_ID__', 'G-TEST1234');
    render(<SiteFooter locale="en" />);
    const link = screen.getByRole('link', { name: 'Cookie settings' });
    expect(link).toHaveAttribute('href', '/cookies#manage');
    const click = new MouseEvent('click', { bubbles: true, cancelable: true });
    link.dispatchEvent(click);
    expect(click.defaultPrevented).toBe(false);
  });

  it('opens the settings dialog when analytics is configured', async () => {
    vi.stubGlobal('__GA4_ID__', 'G-TEST1234');
    render(
      <>
        <dialog id={COOKIE_SETTINGS_ID} />
        <SiteFooter locale="en" />
      </>,
    );
    const dialog = document.getElementById(COOKIE_SETTINGS_ID);
    if (!(dialog instanceof HTMLDialogElement)) throw new Error('no dialog');
    const showModal = vi.fn();
    dialog.showModal = showModal;
    await userEvent
      .setup()
      .click(screen.getByRole('link', { name: 'Cookie settings' }));
    expect(showModal).toHaveBeenCalledOnce();
  });
});
