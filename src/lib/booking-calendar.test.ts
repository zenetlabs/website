import { describe, expect, it } from 'vitest';
import { BOOKING_RULES } from '@/content/booking-rules';
import {
  type BookingCalendar,
  type CalendarCell,
  calendarModel,
} from '@/lib/booking-calendar';
import type { Slot } from '@/lib/slots';
import { availableSlots, bookingCalendar } from '@/server/booking-slots';

const NOW = Date.UTC(2027, 0, 4, 8, 0);

function setUp(now: number, drop: (slot: Slot) => boolean = () => false) {
  const calendar: BookingCalendar = bookingCalendar(BOOKING_RULES, now);
  const slots = availableSlots({
    rules: BOOKING_RULES,
    now,
    busy: [],
    booked: [],
  }).filter((slot) => !drop(slot));
  return { calendar, slots };
}

function statuses(cells: readonly CalendarCell[]): Record<string, string> {
  return Object.fromEntries(cells.map((cell) => [cell.date, cell.status]));
}

describe('bookingCalendar', () => {
  it('spans the notice and the horizon and names the holidays', () => {
    const { calendar } = setUp(NOW);
    expect(calendar.weekdays).toEqual([1, 2, 3, 4]);
    expect(calendar.from).toBe(NOW + 12 * 3_600_000);
    expect(calendar.to).toBe(NOW + 14 * 86_400_000);
    const holidays = calendar.days.filter((day) => day.holidays.length > 0);
    expect(holidays.map((day) => day.holidays)).toEqual([
      [{ region: 'ES', name: { en: 'Epiphany', es: 'Reyes' } }],
    ]);
  });
});

describe('calendarMonths', () => {
  it('gives every day of the month its state in the owner zone', () => {
    const { calendar, slots } = setUp(NOW, (slot) => slot.day === '2027-01-07');
    const model = calendarModel(calendar, slots, 'Europe/Madrid');
    const [january, ...rest] = model.months;
    expect(model.today).toBe('2027-01-04');
    expect(model.cells).toEqual(january?.cells);
    expect(model.index.get('2027-01-06')).toBe(5);
    expect(rest).toEqual([]);
    expect(january).toMatchObject({ year: 2027, month: 1, lead: 4, start: 0 });
    const state = statuses(january?.cells ?? []);
    expect(state).toMatchObject({
      '2027-01-01': 'past',
      '2027-01-03': 'past',
      '2027-01-04': 'soon',
      '2027-01-05': 'open',
      '2027-01-06': 'holiday',
      '2027-01-07': 'full',
      '2027-01-08': 'off',
      '2027-01-09': 'off',
      '2027-01-10': 'off',
      '2027-01-11': 'open',
      '2027-01-14': 'open',
      '2027-01-15': 'off',
      '2027-01-18': 'beyond',
      '2027-01-31': 'beyond',
    });
    expect(january?.cells).toHaveLength(31);
    const tuesday = january?.cells.find((cell) => cell.date === '2027-01-05');
    expect(tuesday).toMatchObject({ status: 'open', count: 12 });
    const epiphany = january?.cells.find((cell) => cell.date === '2027-01-06');
    expect(epiphany).toMatchObject({
      holidays: [{ region: 'ES', name: { en: 'Epiphany', es: 'Reyes' } }],
    });
  });

  it("uses the visitor's own dates in a far zone (Honolulu)", () => {
    const { calendar, slots } = setUp(NOW);
    const [january] = calendarModel(calendar, slots, 'Pacific/Honolulu').months;
    const state = statuses(january?.cells ?? []);
    // Madrid's Tuesday 10:00 is Monday 23:00 in Honolulu.
    expect(state['2027-01-04']).toBe('open');
    expect(
      january?.cells.find((cell) => cell.date === '2027-01-04'),
    ).toMatchObject({ count: 2 });
    expect(state['2027-01-08']).toBe('off');
    expect(state['2027-01-09']).toBe('off');
    // Madrid's Monday starts on Sunday evening there.
    expect(state['2027-01-10']).toBe('open');
  });

  it('says too soon, not fully booked, when the notice ends after the visitor day (Sydney)', () => {
    // 13:00 in Sydney on Monday 4 January: the notice ends at 01:00 on
    // Tuesday there, inside Madrid's Monday window (20:00 to 02:00 Sydney).
    const { calendar, slots } = setUp(Date.UTC(2027, 0, 4, 2, 0));
    const [january] = calendarModel(calendar, slots, 'Australia/Sydney').months;
    const state = statuses(january?.cells ?? []);
    expect(state['2027-01-04']).toBe('soon');
    expect(state['2027-01-05']).toBe('open');
  });

  it('draws two months when the horizon crosses a month end', () => {
    const now = Date.UTC(2027, 0, 25, 8, 0);
    const { calendar, slots } = setUp(now);
    const { months, cells, index } = calendarModel(
      calendar,
      slots,
      'Europe/Madrid',
    );
    expect(
      months.map(({ month, lead, start }) => [month, lead, start]),
    ).toEqual([
      [1, 4, 0],
      [2, 0, 31],
    ]);
    // One run of days across both months: a day's neighbour is the next cell.
    expect(cells[(index.get('2027-01-31') ?? 0) + 1]?.date).toBe('2027-02-01');
    const state = statuses(months.flatMap((month) => month.cells));
    expect(state['2027-02-01']).toBe('open');
    expect(state['2027-02-08']).toBe('beyond');
    expect(state['2027-02-28']).toBe('beyond');
  });

  it('crosses a year end', () => {
    const now = Date.UTC(2026, 11, 22, 8, 0);
    const { calendar, slots } = setUp(now);
    const months = calendarModel(calendar, slots, 'Asia/Singapore').months;
    expect(months.map(({ year, month }) => `${year}-${month}`)).toEqual([
      '2026-12',
      '2027-1',
    ]);
    const state = statuses(months.flatMap((month) => month.cells));
    expect(state['2026-12-24']).toBe('open');
    expect(state['2027-01-01']).toBe('off');
  });

  it('shows a month with no free time as closed days only', () => {
    const now = Date.UTC(2027, 0, 25, 8, 0);
    const { calendar, slots } = setUp(now, (slot) =>
      slot.day.startsWith('2027-02'),
    );
    const [, february] = calendarModel(calendar, slots, 'Europe/Madrid').months;
    const cells = february?.cells ?? [];
    expect(cells.some((cell) => cell.status === 'open')).toBe(false);
    expect(statuses(cells)['2027-02-01']).toBe('full');
  });
});
