import { HOLIDAY_ZONES, type HolidayRegion } from '@/content/booking-holidays';
import type {
  BookAvailability,
  BookingCalendar,
  CalendarDay,
  CalendarHoliday,
} from '@/lib/booking-calendar';
import { availabilityOutcome, fetchAvailability } from '@/lib/booking-client';
import { isRecord } from '@/lib/is-record';

function isRegion(value: unknown): value is HolidayRegion {
  return typeof value === 'string' && Object.hasOwn(HOLIDAY_ZONES, value);
}

function holidaysFrom(value: unknown): CalendarHoliday[] | null {
  if (!Array.isArray(value)) return null;
  const holidays: CalendarHoliday[] = [];
  for (const item of value) {
    if (!isRecord(item) || !isRegion(item.region) || !isRecord(item.name)) {
      return null;
    }
    const { en, es } = item.name;
    if (typeof en !== 'string' || typeof es !== 'string') return null;
    holidays.push({ region: item.region, name: { en, es } });
  }
  return holidays;
}

function daysFrom(value: unknown): CalendarDay[] | null {
  if (!Array.isArray(value)) return null;
  const days: CalendarDay[] = [];
  for (const item of value) {
    if (!isRecord(item)) return null;
    const { start, end } = item;
    const holidays = holidaysFrom(item.holidays);
    if (typeof start !== 'number' || typeof end !== 'number' || !holidays) {
      return null;
    }
    days.push({ start, end, holidays });
  }
  return days;
}

export function calendarFrom(value: unknown): BookingCalendar | null {
  if (!isRecord(value)) return null;
  const { now, from, to, weekdays } = value;
  const days = daysFrom(value.days);
  if (
    typeof now !== 'number' ||
    typeof from !== 'number' ||
    typeof to !== 'number' ||
    !Array.isArray(weekdays) ||
    days === null
  ) {
    return null;
  }
  const open = weekdays.filter(
    (day): day is number => Number.isInteger(day) && day >= 1 && day <= 7,
  );
  return { now, from, to, weekdays: open, days };
}

export function bookAvailabilityOf(body: unknown): BookAvailability {
  const slots = availabilityOutcome(body);
  const calendar = isRecord(body) ? calendarFrom(body.calendar) : null;
  if (slots.status !== 'ok' || calendar === null) {
    return { status: 'unavailable' };
  }
  return { status: 'ok', slots: slots.slots, calendar };
}

// The /book list with the reasons behind its closed days, for a client
// navigation and the refresh after a slot was taken.
export function fetchBookAvailability(): Promise<BookAvailability> {
  return fetchAvailability(bookAvailabilityOf);
}
