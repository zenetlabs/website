import { act, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { slotHref, useNextSlots } from '@/lib/next-slots';

const loadAvailability = vi.hoisted(() => vi.fn());

vi.mock('@/lib/next-slots-load', () => ({
  loadAvailability,
  nextSlots: async () => ({
    status: 'ready',
    day: 'Monday 9 November',
    zone: 'Madrid',
    chips: [],
  }),
}));

function Rail() {
  return <p>{useNextSlots('en').status}</p>;
}

async function settle() {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(3000);
  });
}

afterEach(() => {
  vi.useRealTimers();
});

describe('the desk slot store', () => {
  it('fetches once, reuses fresh times, and fetches again after five minutes', async () => {
    vi.useFakeTimers({ now: Date.UTC(2026, 10, 9, 8) });
    loadAvailability.mockResolvedValue({ status: 'ok', slots: [] });
    const first = render(<Rail />);
    await settle();
    expect(screen.getByText('ready')).toBeInTheDocument();
    expect(loadAvailability).toHaveBeenCalledTimes(1);
    first.unmount();

    vi.setSystemTime(Date.UTC(2026, 10, 9, 8, 4));
    const again = render(<Rail />);
    await settle();
    expect(loadAvailability).toHaveBeenCalledTimes(1);
    again.unmount();

    vi.setSystemTime(Date.UTC(2026, 10, 9, 8, 10));
    render(<Rail />);
    expect(screen.getByText('ready')).toBeInTheDocument();
    await settle();
    expect(loadAvailability).toHaveBeenCalledTimes(2);
  });

  it('links a chip to the booking page with the slot preselected', () => {
    expect(slotHref('es', 1794211200000)).toBe(
      '/es/reservar?slot=1794211200000',
    );
  });
});
