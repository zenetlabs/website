import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SlotPicker } from '@/components/slot-picker';
import { BOOKING_RULES } from '@/content/booking-rules';
import { bookPage as en } from '@/content/en/book';
import { bookPage as es } from '@/content/es/book';
import { candidateSlots } from '@/lib/slots';

const FROM = Date.UTC(2027, 0, 11, 0);
const SLOTS = candidateSlots(BOOKING_RULES, FROM, FROM + 4 * 86_400_000).filter(
  (slot) => slot.start % 3_600_000 === 0,
);

describe('SlotPicker', () => {
  it('groups times by the visitor day with a count in each summary', () => {
    const { container } = render(
      <SlotPicker
        slots={SLOTS}
        zone="Asia/Singapore"
        locale="en"
        copy={en.picker}
      />,
    );
    const summaries = container.querySelectorAll('summary > span:first-child');
    expect([...summaries].map((node) => node.textContent)).toEqual([
      'Monday 11 January',
      'Tuesday 12 January',
      'Wednesday 13 January',
      'Thursday 14 January',
      'Friday 15 January',
    ]);
    expect(screen.getAllByText(/\d+ times?$/)).toHaveLength(5);
  });

  it('uses radios that share one name and carry ISO instants', () => {
    render(
      <SlotPicker
        slots={SLOTS}
        zone="Europe/Madrid"
        locale="en"
        copy={en.picker}
      />,
    );
    const radios = screen.getAllByRole('radio', { hidden: true });
    expect(radios).toHaveLength(SLOTS.length);
    expect(new Set(radios.map((radio) => radio.getAttribute('name')))).toEqual(
      new Set(['slot']),
    );
    expect(radios[0]).toHaveAttribute(
      'value',
      new Date(SLOTS[0]?.start ?? 0).toISOString(),
    );
    expect(radios.every((radio) => radio.hasAttribute('required'))).toBe(true);
  });

  it('opens the first two days only', () => {
    const { container } = render(
      <SlotPicker
        slots={SLOTS}
        zone="Europe/Madrid"
        locale="en"
        copy={en.picker}
      />,
    );
    const open = [...container.querySelectorAll('details')].map(
      (node) => node.open,
    );
    expect(open).toEqual([true, true, false, false]);
  });

  it('labels the times in the zone and the locale it is given', () => {
    const { container } = render(
      <SlotPicker
        slots={SLOTS}
        zone="Asia/Singapore"
        locale="es"
        copy={es.picker}
      />,
    );
    const first = container.querySelector('details');
    expect(first).not.toBeNull();
    if (!first) return;
    expect(
      within(first).getByText('lunes 11 de enero', {
        selector: 'summary span',
      }),
    ).toBeInTheDocument();
    expect(within(first).getByText('9 horas')).toBeInTheDocument();
    expect(within(first).getAllByRole('radio', { hidden: true })).toHaveLength(
      9,
    );
    expect(first).toHaveTextContent('16:00');
  });

  it('uses the singular for one time and renders nothing for no slots', () => {
    const { container, rerender } = render(
      <SlotPicker
        slots={SLOTS.slice(0, 1)}
        zone="UTC"
        locale="en"
        copy={en.picker}
      />,
    );
    expect(screen.getByText('1 time')).toBeInTheDocument();
    rerender(<SlotPicker slots={[]} zone="UTC" locale="en" copy={en.picker} />);
    expect(container.querySelector('details')).toBeNull();
  });
});
