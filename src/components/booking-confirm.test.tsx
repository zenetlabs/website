import {
  defaultParseSearch,
  defaultStringifySearch,
} from '@tanstack/react-router';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BookingConfirm } from '@/components/booking-confirm';
import { bookPage as en } from '@/content/en/book';
import { bookConfirm as enConfirm } from '@/content/en/book-confirm';
import { bookPage as es } from '@/content/es/book';
import { bookConfirm as esConfirm } from '@/content/es/book-confirm';
import { CONFIRM_STATES, type ConfirmView } from '@/lib/confirm-view';

const trackBookingConfirm = vi.hoisted(() => vi.fn());
vi.mock('@/lib/track', () => ({ trackBookingConfirm }));

const TOKEN = `0b3c5f4e-1111-4222-8333-444455556666.${'a'.repeat(43)}`;
const START = Date.UTC(2027, 0, 12, 9, 0);

function view(state: ConfirmView['state']): ConfirmView {
  if (state === 'invalid') return { state };
  return {
    state,
    start: START,
    end: START + 1_800_000,
    timeZone: 'Asia/Singapore',
    masked: 'a•••@example.com',
    expiresAt: Date.UTC(2027, 0, 4, 8, 30),
    method: 'chat',
  };
}

function show(
  state: ConfirmView['state'],
  locale: 'en' | 'es' = 'en',
  outcome: string | null = null,
) {
  return render(
    <BookingConfirm
      confirm={locale === 'en' ? enConfirm : esConfirm}
      zones={(locale === 'en' ? en : es).zone}
      locale={locale}
      token={TOKEN}
      outcome={outcome}
      view={view(state)}
    />,
  );
}

beforeEach(() => trackBookingConfirm.mockReset());

describe('BookingConfirm', () => {
  it('asks for one click on a native form that posts the token, and says how to ignore it', () => {
    const { container } = show('pending');
    expect(
      screen.getByRole('heading', { name: 'Confirm your call' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'Tuesday 12 January, 5:00 pm (Singapore) · 30 minutes on Google Meet',
      ),
    ).toBeInTheDocument();
    expect(screen.getByText('For a•••@example.com')).toBeInTheDocument();
    const form = container.querySelector('form');
    expect(form).toHaveAttribute('method', 'post');
    expect(form).toHaveAttribute('action', '/api/book/confirm');
    expect(container.querySelector('input[name="token"]')).toHaveValue(TOKEN);
    expect(container.querySelector('input[name="locale"]')).toHaveValue('en');
    expect(
      screen.getByRole('button', { name: 'Confirm the call' }),
    ).toHaveAttribute('type', 'submit');
    expect(screen.getByText(/Didn't ask for this\?/)).toBeInTheDocument();
  });

  it('sends the conversions once, with the stored channel, on the visit that booked', () => {
    window.history.replaceState(
      null,
      '',
      `/book?confirm=${TOKEN}&outcome=booked`,
    );
    show('pending', 'en', 'booked');
    expect(trackBookingConfirm).not.toHaveBeenCalled();
    show('confirmed', 'en', null);
    expect(trackBookingConfirm).not.toHaveBeenCalled();
    show('confirmed', 'en', 'booked');
    expect(trackBookingConfirm).toHaveBeenCalledTimes(1);
    expect(trackBookingConfirm).toHaveBeenCalledWith('chat');
    expect(window.location.search).toBe(`?confirm=${TOKEN}`);
  });

  it('offers the button again when the calendar did not answer, with the deadline', () => {
    show('unavailable');
    expect(
      screen.getByText(
        'Nothing changed. Try the button again in a few minutes; the link works until 4:30 pm.',
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Confirm the call' }),
    ).toBeInTheDocument();
  });

  it('shows the booked call without a form', () => {
    const { container } = show('confirmed');
    expect(
      screen.getByRole('heading', { name: 'Your call is booked' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'Tuesday 12 January, 5:00 pm (Singapore). The Google Calendar invitation with the Meet link is on its way to a•••@example.com.',
      ),
    ).toBeInTheDocument();
    expect(container.querySelector('form')).toBeNull();
  });

  it.each(CONFIRM_STATES)(
    'renders %s in both languages with its title and no form unless it asks',
    (state) => {
      for (const locale of ['en', 'es'] as const) {
        const copy = locale === 'en' ? enConfirm : esConfirm;
        const { container, unmount } = show(state, locale);
        expect(
          screen.getByRole('heading', {
            name: copy.states[state].title,
          }),
        ).toBeInTheDocument();
        expect(container.querySelector('form') !== null).toBe(
          state === 'pending' || state === 'unavailable',
        );
        expect(container.textContent).not.toMatch(/\{\w+\}/);
        unmount();
      }
    },
  );

  it.each(['expired', 'taken', 'failed', 'cancelled', 'invalid'] as const)(
    'links %s back to the free times',
    (state) => {
      show(state, 'es');
      expect(
        screen.getByRole('link', { name: 'Ver horas libres' }),
      ).toHaveAttribute('href', '/es/reservar');
    },
  );
});

describe('the confirm link in the router', () => {
  it('survives the search serialiser unchanged, so SSR never redirects it', () => {
    for (const query of [
      `?confirm=${TOKEN}`,
      `?confirm=${TOKEN}&outcome=taken`,
      `?confirm=1e234567-1111-4222-8333-444455556666.${'9'.repeat(43)}`,
    ]) {
      const parsed: Record<string, unknown> = defaultParseSearch(query);
      expect(typeof parsed.confirm).toBe('string');
      expect(defaultStringifySearch(parsed)).toBe(query);
    }
  });
});
