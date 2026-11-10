import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SlotPicker } from '@/components/slot-picker';
import { BOOKING_RULES } from '@/content/booking-rules';
import { bookPage as en } from '@/content/en/book';
import { bookPage as es } from '@/content/es/book';

import type { Locale } from '@/lib/i18n';
import type { Slot } from '@/lib/slots';
import { availableSlots, bookingCalendar } from '@/server/booking-slots';

// Monday 4 January 2027, 09:00 in Madrid: Wednesday the 6th is Epiphany,
// Friday the 8th has no calls, the horizon ends on the 18th.
const NOW = Date.UTC(2027, 0, 4, 8, 0);
const CALENDAR = bookingCalendar(BOOKING_RULES, NOW);
const SLOTS = availableSlots({
  rules: BOOKING_RULES,
  now: NOW,
  busy: [],
  booked: [],
}).filter((slot) => slot.day !== '2027-01-07');

function picker(
  props: Partial<{
    slots: readonly Slot[];
    zone: string;
    locale: Locale;
    picked: number | null;
    onPick: (start: number) => void;
  }> = {},
) {
  const locale = props.locale ?? 'en';
  return (
    <SlotPicker
      slots={props.slots ?? SLOTS}
      calendar={CALENDAR}
      zone={props.zone ?? 'Europe/Madrid'}
      locale={locale}
      copy={(locale === 'en' ? en : es).picker}
      picked={props.picked ?? null}
      onPick={props.onPick ?? vi.fn()}
    />
  );
}

function day(date: string): HTMLElement {
  const found = document.querySelector<HTMLElement>(`[data-date="${date}"]`);
  if (!found) throw new Error(`no day ${date}`);
  return found;
}

function timeRadios() {
  return screen
    .getAllByRole('radio', { hidden: true })
    .filter((radio) => radio.closest('fieldset')?.hidden === false);
}

describe('SlotPicker', () => {
  it('draws a month grid with named day buttons, Monday first', () => {
    render(picker());
    const grid = screen.getByRole('table', { name: 'January 2027' });
    expect(
      [...grid.querySelectorAll('th')].map((th) => th.textContent),
    ).toEqual(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']);
    expect(grid.querySelector('th')).toHaveAttribute('abbr', 'Monday');
    // The accessible name starts with the visible text's day (WCAG 2.5.3).
    expect(
      screen.getByRole('button', { name: 'Tuesday 5 January, 12 times' }),
    ).toHaveAttribute('aria-pressed', 'true');
    expect(day('2027-01-04')).toHaveAttribute('aria-current', 'date');
  });

  it('disables every closed day with its reason as name and tooltip', () => {
    render(picker());
    const cases = [
      ['2027-01-01', 'Friday 1 January, past'],
      ['2027-01-04', 'Monday 4 January, too soon to book'],
      ['2027-01-06', 'Wednesday 6 January, holiday: Epiphany (Spain)'],
      ['2027-01-07', 'Thursday 7 January, fully booked'],
      [
        '2027-01-08',
        'Friday 8 January, calls are Monday to Thursday (Madrid time)',
      ],
      [
        '2027-01-09',
        'Saturday 9 January, calls are Monday to Thursday (Madrid time)',
      ],
      ['2027-01-20', 'Wednesday 20 January, not open for booking yet'],
    ] as const;
    for (const [date, name] of cases) {
      const button = day(date);
      expect(button, date).toHaveAccessibleName(name);
      expect(button, date).toHaveAttribute('aria-disabled', 'true');
      expect(button, date).not.toHaveAttribute('aria-pressed');
    }
    expect(day('2027-01-06')).toHaveAttribute(
      'title',
      'Holiday: Epiphany (Spain)',
    );
    expect(
      screen.getByText('No calls on holidays (Madrid time)'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Wednesday 6 January: Epiphany (Spain)'),
    ).toBeInTheDocument();
  });

  it('says the holiday and the reasons in Spanish', () => {
    render(picker({ locale: 'es' }));
    expect(screen.getByRole('table', { name: 'Enero de 2027' })).toBeTruthy();
    expect(day('2027-01-06')).toHaveAccessibleName(
      'miércoles 6 de enero, festivo: Reyes (España)',
    );
    expect(day('2027-01-08')).toHaveAccessibleName(
      'viernes 8 de enero, las llamadas son de lunes a jueves (hora de Madrid)',
    );
    expect(day('2027-01-05')).toHaveAccessibleName(
      'martes 5 de enero, 12 horas',
    );
  });

  it('ignores a click on a closed day', () => {
    render(picker());
    fireEvent.click(day('2027-01-06'));
    expect(day('2027-01-05')).toHaveAttribute('aria-pressed', 'true');
    expect(timeRadios()[0]?.closest('fieldset')).toHaveAttribute(
      'data-day',
      '2027-01-05',
    );
  });

  it("shows the chosen day's times as radios and reports the pick", () => {
    const onPick = vi.fn();
    render(picker({ onPick }));
    fireEvent.click(day('2027-01-11'));
    expect(day('2027-01-11')).toHaveAttribute('aria-pressed', 'true');
    expect(day('2027-01-05')).toHaveAttribute('aria-pressed', 'false');
    const times = timeRadios();
    expect(times).toHaveLength(12);
    expect(times.some((radio) => radio.hasAttribute('required'))).toBe(false);
    const first = SLOTS.find((slot) => slot.day === '2027-01-11');
    expect(times[0]).toHaveAttribute(
      'value',
      new Date(first?.start ?? 0).toISOString(),
    );
    fireEvent.click(times[0] ?? document.body);
    expect(onPick).toHaveBeenCalledWith(first?.start);
  });

  it('switches day without losing the picked time', () => {
    const first = SLOTS[0];
    if (first === undefined) throw new Error('no slots');
    const { container } = render(picker({ picked: first.start }));
    fireEvent.click(day('2027-01-12'));
    const checked = container.querySelector('input[name="slot"]:checked');
    expect(checked).toHaveAttribute(
      'value',
      new Date(first.start).toISOString(),
    );
    expect(checked?.closest('fieldset')).toHaveAttribute('hidden');
  });

  it('opens the day of the slot the desk linked to (?slot=), with it checked', () => {
    const late = SLOTS.at(-1);
    if (late === undefined) throw new Error('no slots');
    const { container } = render(picker({ picked: late.start }));
    const checked = container.querySelectorAll('input[name="slot"]:checked');
    expect(checked).toHaveLength(1);
    expect(checked[0]?.closest('fieldset')).not.toHaveAttribute('hidden');
    expect(day(late.day)).toHaveAttribute('aria-pressed', 'true');
    expect(day(late.day)).toHaveAttribute('tabindex', '0');
  });

  it.each(['Pacific/Auckland', 'Australia/Sydney', 'Pacific/Honolulu'])(
    'keeps the ?slot= day when the zone flips from the server zone to %s',
    (zone) => {
      const late = SLOTS.at(-1);
      if (late === undefined) throw new Error('no slots');
      const { container, rerender } = render(
        picker({ zone: 'Asia/Singapore', picked: late.start }),
      );
      rerender(picker({ zone, picked: late.start }));
      const checked = container.querySelector('input[name="slot"]:checked');
      expect(checked).toHaveAttribute(
        'value',
        new Date(late.start).toISOString(),
      );
      expect(checked?.closest('fieldset')).not.toHaveAttribute('hidden');
      const day = checked?.closest('fieldset')?.getAttribute('data-day') ?? '';
      expect(container.querySelector(`[data-date="${day}"]`)).toHaveAttribute(
        'aria-pressed',
        'true',
      );
    },
  );

  it('keeps a clicked day when the zone flips', () => {
    const { rerender } = render(picker({ zone: 'Europe/Madrid' }));
    fireEvent.click(day('2027-01-12'));
    rerender(picker({ zone: 'Pacific/Auckland' }));
    // Madrid's Tuesday 10:00 is Tuesday 22:00 in Auckland.
    expect(day('2027-01-12')).toHaveAttribute('aria-pressed', 'true');
  });

  it('moves through the grid with the WAI-ARIA date grid keys', () => {
    render(picker());
    const start = day('2027-01-05');
    expect(start).toHaveAttribute('tabindex', '0');
    start.focus();
    const press = (key: string) =>
      fireEvent.keyDown(document.activeElement ?? document.body, { key });
    press('ArrowRight');
    expect(document.activeElement).toBe(day('2027-01-06'));
    expect(day('2027-01-06')).toHaveAttribute('tabindex', '0');
    expect(day('2027-01-05')).toHaveAttribute('tabindex', '-1');
    press('ArrowDown');
    expect(document.activeElement).toBe(day('2027-01-13'));
    press('ArrowLeft');
    press('ArrowUp');
    expect(document.activeElement).toBe(day('2027-01-05'));
    press('Home');
    expect(document.activeElement).toBe(day('2027-01-04'));
    press('End');
    expect(document.activeElement).toBe(day('2027-01-10'));
    press('ArrowUp');
    press('Home');
    // The first week starts on Friday the 1st: Home stops there.
    expect(document.activeElement).toBe(day('2027-01-01'));
    press('ArrowLeft');
    expect(document.activeElement).toBe(day('2027-01-01'));
    press('PageDown');
    expect(document.activeElement).toBe(day('2027-01-01'));
    // Space or Enter on the focused open day picks it (a native button).
    day('2027-01-12').focus();
    fireEvent.click(day('2027-01-12'));
    expect(day('2027-01-12')).toHaveAttribute('aria-pressed', 'true');
  });

  it('labels the times in the zone it is given', () => {
    render(picker({ zone: 'Asia/Singapore', locale: 'es' }));
    expect(screen.getByText('Martes 5 de enero')).toBeInTheDocument();
    expect(
      timeRadios().map((radio) => radio.closest('label')?.textContent),
    ).toEqual([
      '17:00',
      '17:30',
      '18:00',
      '18:30',
      '19:00',
      '19:30',
      '20:00',
      '20:30',
      '21:00',
      '21:30',
      '22:00',
      '22:30',
    ]);
  });

  it('uses the singular for one time', () => {
    render(picker({ slots: SLOTS.slice(0, 1) }));
    expect(
      screen.getByRole('button', { name: 'Tuesday 5 January, 1 time' }),
    ).toBeTruthy();
    expect(screen.getByText('1 time')).toBeInTheDocument();
  });

  it('names the open weekdays from the rules, as a range or a list', () => {
    const { rerender } = render(picker());
    expect(day('2027-01-08')).toHaveAttribute(
      'title',
      'Calls are Monday to Thursday (Madrid time)',
    );
    rerender(
      <SlotPicker
        slots={SLOTS}
        calendar={{ ...CALENDAR, weekdays: [5, 1, 3] }}
        zone="Europe/Madrid"
        locale="es"
        copy={es.picker}
        picked={null}
        onPick={vi.fn()}
      />,
    );
    expect(day('2027-01-09')).toHaveAttribute(
      'title',
      'Las llamadas son lunes, miércoles y viernes (hora de Madrid)',
    );
  });

  it('keeps one tab stop, and moves it back to the shown day when a refreshed list drops its day', () => {
    const now = Date.UTC(2027, 0, 25, 8, 0);
    const twoMonths = {
      slots: availableSlots({
        rules: BOOKING_RULES,
        now,
        busy: [],
        booked: [],
      }),
      calendar: bookingCalendar(BOOKING_RULES, now),
    };
    const draw = (list: typeof twoMonths) => (
      <SlotPicker
        slots={list.slots}
        calendar={list.calendar}
        zone="Europe/Madrid"
        locale="en"
        copy={en.picker}
        picked={null}
        onPick={vi.fn()}
      />
    );
    const { rerender } = render(draw(twoMonths));
    day('2027-01-26').focus();
    fireEvent.keyDown(day('2027-01-26'), { key: 'PageDown' });
    expect(day('2027-02-26')).toHaveAttribute('tabindex', '0');
    expect(document.querySelectorAll('.cal-day[tabindex="0"]')).toHaveLength(1);
    // The refresh comes back a fortnight earlier: February is gone.
    rerender(draw({ slots: SLOTS, calendar: CALENDAR }));
    expect(document.querySelector('[data-date="2027-02-26"]')).toBeNull();
    expect(document.querySelectorAll('.cal-day[tabindex="0"]')).toHaveLength(1);
    expect(day('2027-01-05')).toHaveAttribute('tabindex', '0');
  });

  it('draws two months when the horizon crosses a month end', () => {
    const now = Date.UTC(2027, 0, 25, 8, 0);
    render(
      <SlotPicker
        slots={availableSlots({
          rules: BOOKING_RULES,
          now,
          busy: [],
          booked: [],
        })}
        calendar={bookingCalendar(BOOKING_RULES, now)}
        zone="Europe/Madrid"
        locale="en"
        copy={en.picker}
        picked={null}
        onPick={vi.fn()}
      />,
    );
    expect(
      screen.getAllByRole('table').map((grid) => grid.textContent),
    ).toEqual([
      expect.stringContaining('January 2027'),
      expect.stringContaining('February 2027'),
    ]);
    day('2027-01-28').focus();
    fireEvent.keyDown(day('2027-01-28'), { key: 'ArrowDown' });
    expect(document.activeElement).toBe(day('2027-02-04'));
    fireEvent.keyDown(day('2027-02-04'), { key: 'PageUp' });
    expect(document.activeElement).toBe(day('2027-01-04'));
  });
});
