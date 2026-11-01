import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderToString } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ConsentManager } from '@/components/consent-manager';
import { consent as en } from '@/content/en/consent';
import { consent as es } from '@/content/es/consent';
import { CONSENT_KEY, readConsent, saveConsent } from '@/lib/consent';

const state = vi.hoisted(() => {
  vi.stubGlobal('__GA4_ID__', 'G-TEST1234');
  return { locale: 'en', hydrated: true };
});
const applyConsent = vi.hoisted(() => vi.fn());

vi.mock('@tanstack/react-router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@tanstack/react-router')>()),
  useRouteContext: ({
    select,
  }: {
    select: (context: { locale: string }) => unknown;
  }) => select({ locale: state.locale }),
  useHydrated: () => state.hydrated,
}));

vi.mock('@/lib/analytics', () => ({ applyConsent }));

const NOW = Date.UTC(2026, 10, 1);
const GA = 'G-TEST1234';

function dialog(): HTMLDialogElement {
  const element = document.querySelector('dialog');
  if (!(element instanceof HTMLDialogElement)) throw new Error('no dialog');
  return element;
}

function stubModal() {
  const element = dialog();
  element.showModal = () => element.setAttribute('open', '');
  element.close = () => {
    element.removeAttribute('open');
    element.dispatchEvent(new Event('close'));
  };
}

async function mounted(locale = 'en', record = false) {
  state.locale = locale;
  if (record) saveConsent({ analytics: true, marketing: false }, NOW);
  await act(async () => {
    render(<ConsentManager />);
  });
  await screen.findByRole('dialog', { hidden: true }, { timeout: 5000 });
  stubModal();
}

beforeEach(() => {
  applyConsent.mockReset();
  state.locale = 'en';
  state.hydrated = true;
});

afterEach(() => {
  localStorage.clear();
});

describe('ConsentManager', () => {
  it('renders nothing on the server, whatever is stored', () => {
    state.hydrated = false;
    saveConsent({ analytics: true, marketing: true }, NOW);
    expect(renderToString(<ConsentManager />)).toBe('');
  });

  it('shows the banner and the dialog when no choice is stored', async () => {
    await mounted();
    expect(document.querySelector('[data-consent-banner]')).not.toBeNull();
    expect(dialog()).not.toHaveAttribute('open');
  });

  it('shows only the dialog when a choice is stored', async () => {
    await mounted('en', true);
    expect(document.querySelector('[data-consent-banner]')).toBeNull();
  });

  it.each([
    ['en', en],
    ['es', es],
  ])('speaks %s', async (locale, copy) => {
    await mounted(locale);
    expect(screen.getByRole('region', { name: copy.title })).toBeVisible();
    expect(screen.getByRole('button', { name: copy.reject })).toBeVisible();
    expect(screen.getByRole('button', { name: copy.accept })).toBeVisible();
    expect(screen.getByRole('button', { name: copy.settings })).toBeVisible();
    expect(screen.getByRole('link', { name: copy.policy })).toHaveAttribute(
      'href',
      locale === 'es' ? '/es/cookies' : '/cookies',
    );
  });
});

describe('banner', () => {
  it('gives Reject and Accept the same class', async () => {
    await mounted();
    const banner = document.querySelector('[data-consent-banner]');
    const [reject, accept] = Array.from(
      banner?.querySelectorAll('button') ?? [],
    );
    expect(reject?.textContent).toBe(en.reject);
    expect(accept?.textContent).toBe(en.accept);
    expect(reject?.className).toBe(accept?.className);
  });

  it('rejects: saves, applies and unmounts the banner', async () => {
    await mounted();
    await userEvent
      .setup()
      .click(screen.getByRole('button', { name: en.reject }));
    expect(readConsent()).toMatchObject({ analytics: false, marketing: false });
    expect(applyConsent).toHaveBeenCalledWith(
      GA,
      expect.objectContaining({ analytics: false, marketing: false }),
      expect.any(Number),
    );
    await waitFor(() =>
      expect(document.querySelector('[data-consent-banner]')).toBeNull(),
    );
  });

  it('accepts: saves and applies', async () => {
    await mounted();
    await userEvent
      .setup()
      .click(screen.getByRole('button', { name: en.accept }));
    expect(readConsent()).toMatchObject({ analytics: true, marketing: true });
    expect(applyConsent).toHaveBeenCalledOnce();
  });

  it('opens the dialog from Settings', async () => {
    await mounted();
    await userEvent
      .setup()
      .click(screen.getByRole('button', { name: en.settings }));
    expect(dialog()).toHaveAttribute('open');
  });
});

describe('focus and labels', () => {
  it('moves focus to the main region after a banner choice', async () => {
    render(<main id="main" tabIndex={-1} />);
    await mounted();
    await userEvent
      .setup()
      .click(screen.getByRole('button', { name: en.reject }));
    expect(document.getElementById('main')).toHaveFocus();
  });

  it('moves focus to the main region after saving from the dialog', async () => {
    render(<main id="main" tabIndex={-1} />);
    await mounted('en', true);
    dialog().showModal();
    await userEvent
      .setup()
      .click(screen.getByRole('button', { name: en.dialog.save }));
    expect(document.getElementById('main')).toHaveFocus();
  });

  it('labels each toggle by its title and describes it by its text', async () => {
    await mounted();
    const analytics = screen.getByRole('checkbox', {
      name: en.dialog.analytics,
      hidden: true,
    });
    expect(analytics).toHaveAccessibleDescription(en.dialog.analyticsText);
    expect(analytics.closest('label')).not.toBeNull();
    expect(analytics.className).toContain('size-6');
  });
});

describe('settings dialog', () => {
  const checkbox = (name: string) =>
    screen.getByRole('checkbox', { name, hidden: true });

  it('starts unchecked and lists the necessary row as always on', async () => {
    await mounted();
    expect(checkbox(en.dialog.analytics)).not.toBeChecked();
    expect(checkbox(en.dialog.marketing)).not.toBeChecked();
    expect(screen.getByText(en.dialog.alwaysOn)).toBeInTheDocument();
  });

  it('reflects the stored choice', async () => {
    await mounted('en', true);
    expect(checkbox(en.dialog.analytics)).toBeChecked();
    expect(checkbox(en.dialog.marketing)).not.toBeChecked();
  });

  it('saves a granular choice and passes the previous one on', async () => {
    await mounted('en', true);
    const user = userEvent.setup();
    await user.click(checkbox(en.dialog.marketing));
    await user.click(
      screen.getByRole('button', { name: en.dialog.save, hidden: true }),
    );
    expect(readConsent()).toMatchObject({ analytics: true, marketing: true });
    expect(applyConsent).toHaveBeenCalledWith(
      GA,
      expect.objectContaining({ analytics: true, marketing: true }),
      expect.any(Number),
    );
  });

  it('closes after saving, even though the form re-mounts with the new choice', async () => {
    await mounted('en', true);
    dialog().showModal();
    expect(dialog()).toHaveAttribute('open');
    await userEvent
      .setup()
      .click(screen.getByRole('button', { name: en.dialog.save }));
    expect(dialog()).not.toHaveAttribute('open');
  });

  it('can withdraw everything with the checkboxes', async () => {
    await mounted('en', true);
    const user = userEvent.setup();
    await user.click(checkbox(en.dialog.analytics));
    await user.click(
      screen.getByRole('button', { name: en.dialog.save, hidden: true }),
    );
    expect(readConsent()).toMatchObject({ analytics: false, marketing: false });
  });

  it('drops unsaved toggles when closed', async () => {
    await mounted('en', true);
    const user = userEvent.setup();
    await user.click(checkbox(en.dialog.marketing));
    expect(checkbox(en.dialog.marketing)).toBeChecked();
    await user.click(
      screen.getByRole('button', { name: en.dialog.close, hidden: true }),
    );
    expect(checkbox(en.dialog.marketing)).not.toBeChecked();
    expect(localStorage.getItem(CONSENT_KEY)).toContain('"marketing":false');
  });

  it('rejects and accepts from the dialog too', async () => {
    await mounted('en', true);
    const user = userEvent.setup();
    await user.click(
      screen.getByRole('button', { name: en.accept, hidden: true }),
    );
    expect(readConsent()).toMatchObject({ analytics: true, marketing: true });
    await user.click(
      screen.getByRole('button', { name: en.reject, hidden: true }),
    );
    expect(readConsent()).toMatchObject({ analytics: false, marketing: false });
  });
});
