import type { HolidayRegion } from '@/content/booking-holidays';
import type { PageSlot } from '@/lib/booking-client';
import {
  dateKey,
  isoWeekday,
  type LocalDate,
  shiftDate,
  zonedParts,
  zonedToInstant,
} from '@/lib/slots';

export type CalendarHoliday = {
  region: HolidayRegion;
  name: { en: string; es: string };
};

// One owner working day: from its first call to the end of its last.
export type CalendarDay = {
  start: number;
  end: number;
  holidays: CalendarHoliday[];
};

// What /book needs besides the free slots to say why a day is closed:
// `from` is the first bookable instant (the notice), `to` the horizon end,
// `weekdays` the ISO weekdays with calls.
export type BookingCalendar = {
  now: number;
  from: number;
  to: number;
  weekdays: number[];
  days: CalendarDay[];
};

export type BookAvailability =
  | { status: 'ok'; slots: PageSlot[]; calendar: BookingCalendar }
  | { status: 'unavailable' };

// off: a day with no calls in the owner's week (as the visitor's zone sees it).
export type ClosedReason =
  | 'past'
  | 'soon'
  | 'off'
  | 'holiday'
  | 'full'
  | 'beyond';

export type CalendarCell = LocalDate & {
  date: string;
  weekday: number;
} & (
    | { status: 'open'; count: number }
    | { status: ClosedReason; holidays: CalendarHoliday[] }
  );

export type CalendarMonth = {
  year: number;
  month: number;
  // Empty cells before the 1st, Monday first.
  lead: number;
  // The index of the 1st in the model's `cells`.
  start: number;
  cells: CalendarCell[];
};

// Every day of the months from today to the horizon, in order, so a day's
// neighbours are its neighbours in `cells`.
export type CalendarModel = {
  months: CalendarMonth[];
  cells: CalendarCell[];
  index: ReadonlyMap<string, number>;
  today: string;
};

function startOf(date: LocalDate, zone: string): number {
  return (
    zonedToInstant(date, 0, zone) ??
    zonedToInstant(date, 60, zone) ??
    Date.UTC(date.year, date.month - 1, date.day)
  );
}

// The working days that overlap [from, to); none when the interval is empty
// (the notice can fall after the visitor's day has ended).
function touches(
  days: readonly CalendarDay[],
  from: number,
  to: number,
): CalendarDay[] {
  return from < to
    ? days.filter((day) => day.start < to && day.end > from)
    : [];
}

function cellOf(
  date: LocalDate,
  calendar: BookingCalendar,
  counts: ReadonlyMap<string, number>,
  zone: string,
): CalendarCell {
  const key = dateKey(date);
  const base = { ...date, date: key, weekday: isoWeekday(date) };
  const count = counts.get(key) ?? 0;
  if (count > 0) return { ...base, status: 'open', count };
  const start = startOf(date, zone);
  const end = startOf(shiftDate(date, 1), zone);
  const closed = (status: ClosedReason, holidays: CalendarHoliday[] = []) => ({
    ...base,
    status,
    holidays,
  });
  if (end <= calendar.now) return closed('past');
  if (start >= calendar.to) return closed('beyond');
  const open = touches(
    calendar.days,
    Math.max(start, calendar.from),
    Math.min(end, calendar.to),
  );
  const holidays = open.flatMap((day) => day.holidays);
  if (holidays.length > 0) return closed('holiday', holidays);
  if (open.length > 0) return closed('full');
  if (touches(calendar.days, start, calendar.from).length > 0) {
    return closed('soon');
  }
  if (touches(calendar.days, calendar.to, end).length > 0) {
    return closed('beyond');
  }
  return closed('off');
}

// The months from today to the horizon in the visitor's zone, every day of
// each with its state: open (with its free times) or why it is closed.
export function calendarModel(
  calendar: BookingCalendar,
  slots: readonly PageSlot[],
  zone: string,
): CalendarModel {
  const counts = new Map<string, number>();
  for (const slot of slots) {
    const key = dateKey(zonedParts(slot.start, zone));
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const first = zonedParts(calendar.now, zone);
  const last = zonedParts(Math.max(calendar.now, calendar.to - 1), zone);
  const months: CalendarMonth[] = [];
  const cells: CalendarCell[] = [];
  for (
    let date: LocalDate = { year: first.year, month: first.month, day: 1 };
    date.year < last.year ||
    (date.year === last.year && date.month <= last.month);
    date = shiftDate(date, 1)
  ) {
    if (date.day === 1) {
      months.push({
        year: date.year,
        month: date.month,
        lead: isoWeekday(date) - 1,
        start: cells.length,
        cells: [],
      });
    }
    const cell = cellOf(date, calendar, counts, zone);
    cells.push(cell);
    months.at(-1)?.cells.push(cell);
  }
  return {
    months,
    cells,
    index: new Map(cells.map((cell, at) => [cell.date, at])),
    today: dateKey(first),
  };
}
