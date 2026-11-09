import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SlotPicker } from '@/components/slot-picker';
import { BOOKING_RULES } from '@/content/booking-rules';
import { bookPage as en } from '@/content/en/book';
import { bookPage as es } from '@/content/es/book';
import { candidateSlots } from '@/lib/slots';

const FROM = Date.UTC(2027, 0, 11, 0);
const SLOTS = candidateSlots(BOOKING_RULES, FROM, FROM + 4 * 86_400_000).filter(
  (slot) => slot.start % 3_600_000 === 0,
);

function dayRadios() {
  return screen
    .getAllByRole('radio', { hidden: true })
    .filter((radio) => radio.getAttribute('name') === 'day');
}

function at(list: HTMLElement[], index: number): HTMLElement {
  const found = list.at(index);
  if (!found) throw new Error(`no radio at ${index}`);
  return found;
}

function timeRadios() {
  return screen
    .getAllByRole('radio', { hidden: true })
    .filter(
      (radio) =>
        radio.getAttribute('name') === 'slot' &&
        radio.closest('fieldset')?.hidden === false,
    );
}

describe('SlotPicker', () => {
  it('draws a week strip of the visitor days, each a radio with its count', () => {
    const { container } = render(
      <SlotPicker
        slots={SLOTS}
        zone="Asia/Singapore"
        locale="en"
        copy={en.picker}
        picked={null}
        onPick={vi.fn()}
      />,
    );
    const weekdays = container.querySelectorAll('.day-chip-weekday');
    expect([...weekdays].map((node) => node.textContent)).toEqual([
      'Mon',
      'Tue',
      'Wed',
      'Thu',
      'Fri',
    ]);
    expect(dayRadios()).toHaveLength(5);
    expect(dayRadios()[0]).toBeChecked();
    // The accessible name starts with the visible text (WCAG 2.5.3).
    expect(
      screen.getByRole('radio', { name: /^Mon 11 Jan ?, \d+ times?$/ }),
    ).toBeChecked();
  });

  it("shows the chosen day's times as radios and reports the pick", () => {
    const onPick = vi.fn();
    render(
      <SlotPicker
        slots={SLOTS}
        zone="Europe/Madrid"
        locale="en"
        copy={en.picker}
        picked={null}
        onPick={onPick}
      />,
    );
    const first = SLOTS[0];
    if (first === undefined) throw new Error('no slots');
    const times = timeRadios();
    expect(times[0]).toHaveAttribute(
      'value',
      new Date(first.start).toISOString(),
    );
    expect(times.some((radio) => radio.hasAttribute('required'))).toBe(false);
    fireEvent.click(at(times, 0));
    expect(onPick).toHaveBeenCalledWith(first.start);
  });

  it('switches day without losing the picked time', () => {
    const first = SLOTS[0];
    if (first === undefined) throw new Error('no slots');
    const { container } = render(
      <SlotPicker
        slots={SLOTS}
        zone="Europe/Madrid"
        locale="en"
        copy={en.picker}
        picked={first.start}
        onPick={vi.fn()}
      />,
    );
    fireEvent.click(at(dayRadios(), 1));
    expect(dayRadios()[1]).toBeChecked();
    const checked = container.querySelector('input[name="slot"]:checked');
    expect(checked).toHaveAttribute(
      'value',
      new Date(first.start).toISOString(),
    );
    expect(checked?.closest('fieldset')).toHaveAttribute('hidden');
    expect(timeRadios().some((radio) => radio === checked)).toBe(false);
  });

  it('labels the times in the zone and the locale it is given', () => {
    render(
      <SlotPicker
        slots={SLOTS}
        zone="Asia/Singapore"
        locale="es"
        copy={es.picker}
        picked={null}
        onPick={vi.fn()}
      />,
    );
    expect(screen.getByText('lunes 11 de enero')).toBeInTheDocument();
    expect(screen.getByText('9 horas')).toBeInTheDocument();
    expect(timeRadios()).toHaveLength(9);
    expect(
      timeRadios().map((radio) => radio.closest('label')?.textContent),
    ).toContain('16:00');
    expect(screen.getAllByText('lun')).toHaveLength(1);
  });

  it('uses the singular for one time and renders no grid for no slots', () => {
    const { container, rerender } = render(
      <SlotPicker
        slots={SLOTS.slice(0, 1)}
        zone="UTC"
        locale="en"
        copy={en.picker}
        picked={null}
        onPick={vi.fn()}
      />,
    );
    expect(screen.getByText('1 time')).toBeInTheDocument();
    rerender(
      <SlotPicker
        slots={[]}
        zone="UTC"
        locale="en"
        copy={en.picker}
        picked={null}
        onPick={vi.fn()}
      />,
    );
    expect(container.querySelector('.time-grid')).toBeNull();
    expect(container.querySelector('.day-chip')).toBeNull();
  });

  it('opens the day of the slot the desk linked to, with it checked', () => {
    const late = SLOTS.at(-1);
    if (late === undefined) throw new Error('no slots');
    const { container } = render(
      <SlotPicker
        slots={SLOTS}
        zone="Europe/Madrid"
        locale="en"
        copy={en.picker}
        picked={late.start}
        onPick={vi.fn()}
      />,
    );
    const checked = container.querySelectorAll('input[name="slot"]:checked');
    expect(checked).toHaveLength(1);
    expect(checked[0]).toHaveAttribute(
      'value',
      new Date(late.start).toISOString(),
    );
    expect(checked[0]?.closest('fieldset')).not.toHaveAttribute('hidden');
    expect(dayRadios().at(-1)).toBeChecked();
  });
});
