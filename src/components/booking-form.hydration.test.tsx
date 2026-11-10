import { act, waitFor } from '@testing-library/react';
import { useSyncExternalStore } from 'react';
import { hydrateRoot } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { BookingForm } from '@/components/booking-form';
import { BOOKING_RULES } from '@/content/booking-rules';
import { bookPage as en } from '@/content/en/book';
import { bookingCalendar, candidateSlots } from '@/server/booking-slots';

// The page as the server renders it, then hydrated in a browser whose zone
// differs: the calendar must keep its server HTML through the switch.
const mode = vi.hoisted(() => ({ server: true }));

vi.mock('@tanstack/react-start', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@tanstack/react-start')>()),
  createIsomorphicFn: () => ({
    server: (server: () => unknown) => ({
      client: (client: () => unknown) => () =>
        mode.server ? server() : client(),
    }),
  }),
}));
vi.mock('@tanstack/react-router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@tanstack/react-router')>()),
  useRouteContext: ({
    select,
  }: {
    select: (context: { locale: string }) => unknown;
  }) => select({ locale: 'en' }),
}));
vi.mock('@/lib/booking-client', () => ({ submitBooking: vi.fn() }));
vi.mock('@/lib/lead-client', () => ({ attribution: vi.fn() }));
vi.mock('@/lib/track', () => ({ track: vi.fn() }));
vi.mock('@marsidev/react-turnstile', () => ({ Turnstile: () => null }));

const FROM = Date.UTC(2027, 0, 12, 0);
const SLOTS = candidateSlots(BOOKING_RULES, FROM, FROM + 2 * 86_400_000);
const CALENDAR = bookingCalendar(BOOKING_RULES, Date.UTC(2027, 0, 4, 8));

function noSubscription() {
  return () => {};
}

function Page() {
  const zone = useSyncExternalStore(
    noSubscription,
    () => 'Pacific/Auckland',
    () => 'Asia/Singapore',
  );
  return (
    <BookingForm
      copy={en}
      locale="en"
      zone={zone}
      serverZone="Asia/Singapore"
      slots={SLOTS}
      calendar={CALENDAR}
    />
  );
}

describe('the calendar island', () => {
  it('keeps its server HTML while it hydrates, then switches to the browser zone', async () => {
    mode.server = true;
    const container = document.createElement('div');
    container.innerHTML = renderToString(<Page />);
    document.body.appendChild(container);
    const table = container.querySelector('table');
    expect(table).not.toBeNull();
    expect(container.textContent).toContain('5:00 pm');
    let lost = false;
    const watch = new MutationObserver(() => {
      if (!container.querySelector('[data-slot-picker]')) lost = true;
    });
    watch.observe(container, { childList: true, subtree: true });

    mode.server = false;
    await act(async () => {
      hydrateRoot(container, <Page />);
    });
    // Ready: the calendar's fieldset opens once its root has committed.
    await waitFor(() =>
      expect(container.querySelector('.cal-day')).not.toBeDisabled(),
    );
    // Madrid's Tuesday 10:00 is 22:00 in Auckland.
    await waitFor(() => expect(container.textContent).toContain('10:00 pm'));
    expect(container.querySelector('table')).toBe(table);
    expect(lost).toBe(false);
    watch.disconnect();
  });
});
