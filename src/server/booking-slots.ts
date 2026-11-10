import {
  type BookingHoliday,
  HOLIDAY_ZONES,
  holidaysCoverUntil,
} from '@/content/booking-holidays';
import type { BookingRules } from '@/content/booking-rules';
import type { BookingCalendar } from '@/lib/booking-calendar';
import {
  dateKey,
  type Interval,
  isoWeekday,
  type LocalDate,
  type Slot,
  shiftDate,
  zonedParts,
  zonedToInstant,
} from '@/lib/slots';
import { DAY_MS, HOUR_MS, MINUTE_MS } from '@/lib/time';

// The booking rules applied: the slot grid, holidays, notice, horizon, buffer
// and day cap. Server code (and tests) only; the page gets their results.

function toMinutes(clock: string): number {
  const [hours = 0, minutes = 0] = clock.split(':').map(Number);
  return hours * 60 + minutes;
}

function slotAt(date: LocalDate, start: number, minutes: number): Slot {
  return { start, end: start + minutes * MINUTE_MS, day: dateKey(date) };
}

// One zone lookup per window: if the wall clock at the window end still matches
// the start offset, no DST change happened inside, so slots step in plain ms.
function windowSlots(
  rules: BookingRules,
  date: LocalDate,
  window: { from: string; to: string },
): Slot[] {
  const opens = toMinutes(window.from);
  const closes = toMinutes(window.to);
  const fits =
    Math.floor((closes - opens - rules.slotMinutes) / rules.stepMinutes) + 1;
  const first = zonedToInstant(date, opens, rules.zone);
  if (first !== null) {
    const end = zonedParts(first + (closes - opens) * MINUTE_MS, rules.zone);
    if (end.hour * 60 + end.minute === closes % 1440) {
      return Array.from({ length: Math.max(0, fits) }, (_, index) =>
        slotAt(
          date,
          first + index * rules.stepMinutes * MINUTE_MS,
          rules.slotMinutes,
        ),
      );
    }
  }
  const slots: Slot[] = [];
  for (
    let at = opens;
    at + rules.slotMinutes <= closes;
    at += rules.stepMinutes
  ) {
    const start = zonedToInstant(date, at, rules.zone);
    if (start !== null) slots.push(slotAt(date, start, rules.slotMinutes));
  }
  return slots;
}

type HolidaySpan = Interval & { holiday: BookingHoliday };
type HolidayIndex = { spans: HolidaySpan[]; until: string };

const holidayIndex = new WeakMap<readonly BookingHoliday[], HolidayIndex>();
let warnedUncovered = false;

// Each holiday as the instants of its whole day in its own zone, and the last
// day the list covers.
function indexOf(holidays: readonly BookingHoliday[]): HolidayIndex {
  const known = holidayIndex.get(holidays);
  if (known !== undefined) return known;
  const spans = holidays.flatMap((holiday) => {
    const [year = 0, month = 0, day = 0] = holiday.date.split('-').map(Number);
    const date = { year, month, day };
    const zone = HOLIDAY_ZONES[holiday.region];
    const start = zonedToInstant(date, 0, zone);
    const end = zonedToInstant(shiftDate(date, 1), 0, zone);
    return start === null || end === null ? [] : [{ start, end, holiday }];
  });
  const index = { spans, until: holidaysCoverUntil(holidays) };
  holidayIndex.set(holidays, index);
  return index;
}

// A day past the list's last year may hide a holiday nobody listed: closed,
// and said once per isolate so a stale list shows in the logs.
function uncovered(day: string, until: string): boolean {
  if (day <= until) return false;
  if (!warnedUncovered) {
    warnedUncovered = true;
    console.warn('booking: holidays not listed', { after: until });
  }
  return true;
}

export type RuleDay = Interval & {
  day: string;
  slots: Slot[];
  holidays: BookingHoliday[];
  uncovered: boolean;
};

// Every working day (owner zone) touching [from, to): its slots, its span from
// the first call to the end of the last, and the holidays touching that span.
// A holiday in either place for any part of the span closes the whole day.
export function ruleDays(
  rules: BookingRules,
  from: number,
  to: number,
): RuleDay[] {
  const first = shiftDate(zonedParts(from, rules.zone), -1);
  const last = dateKey(shiftDate(zonedParts(to, rules.zone), 1));
  const days = new Set(rules.days);
  const { spans, until } = indexOf(rules.holidays);
  const found: RuleDay[] = [];
  for (let date = first; dateKey(date) <= last; date = shiftDate(date, 1)) {
    if (!days.has(isoWeekday(date))) continue;
    const slots = rules.windows
      .flatMap((window) => windowSlots(rules, date, window))
      .sort((a, b) => a.start - b.start);
    const start = slots[0]?.start;
    const end = slots.at(-1)?.end;
    if (start === undefined || end === undefined) continue;
    if (end <= from || start >= to) continue;
    const holidays = spans.flatMap((span) =>
      span.start < end && span.end > start ? [span.holiday] : [],
    );
    const day = dateKey(date);
    found.push({
      day,
      start,
      end,
      slots,
      holidays,
      uncovered: uncovered(day, until),
    });
  }
  return found;
}

export function candidateSlots(
  rules: BookingRules,
  from: number,
  to: number,
): Slot[] {
  const found = new Map<number, Slot>();
  for (const day of ruleDays(rules, from, to)) {
    if (day.holidays.length > 0 || day.uncovered) continue;
    for (const slot of day.slots) {
      if (slot.start >= from && slot.start < to) found.set(slot.start, slot);
    }
  }
  return [...found.values()].sort((a, b) => a.start - b.start);
}

export type Availability = {
  rules: BookingRules;
  now: number;
  busy: readonly Interval[];
  booked: readonly Slot[];
  from?: number;
  to?: number;
};

function overlaps(slot: Interval, other: Interval, buffer: number): boolean {
  return other.start < slot.end + buffer && other.end > slot.start - buffer;
}

function fullDays(a: Availability): Set<string> {
  const counts = new Map<string, number>();
  for (const { day } of a.booked) counts.set(day, (counts.get(day) ?? 0) + 1);
  return new Set(
    [...counts].flatMap(([day, n]) => (n >= a.rules.maxPerDay ? [day] : [])),
  );
}

export function availableSlots(a: Availability): Slot[] {
  const { rules, now } = a;
  const buffer = rules.bufferMinutes * MINUTE_MS;
  const from = Math.max(a.from ?? 0, now + rules.minNoticeHours * HOUR_MS);
  const to = Math.min(
    a.to ?? Number.POSITIVE_INFINITY,
    now + rules.horizonDays * DAY_MS,
  );
  if (from >= to) return [];
  const full = fullDays(a);
  return candidateSlots(rules, from, to).filter(
    (slot) =>
      !full.has(slot.day) &&
      !a.busy.some((interval) => overlaps(slot, interval, buffer)) &&
      !a.booked.some((interval) => overlaps(slot, interval, buffer)),
  );
}

export type SlotCheck =
  | { status: 'ok'; slot: Slot }
  | { status: 'invalid' }
  | { status: 'full' }
  | { status: 'taken' };

export function checkSlot(start: number, a: Availability): SlotCheck {
  const { rules, now } = a;
  const candidate = candidateSlots(rules, start, start + 1)[0];
  const inWindow =
    start >= now + rules.minNoticeHours * HOUR_MS &&
    start < now + rules.horizonDays * DAY_MS;
  if (candidate === undefined || !inWindow) return { status: 'invalid' };
  const open = availableSlots({ ...a, from: start, to: start + 1 })[0];
  if (open !== undefined) return { status: 'ok', slot: open };
  return fullDays(a).has(candidate.day)
    ? { status: 'full' }
    : { status: 'taken' };
}

// Why the closed days of /book are closed: every working day from yesterday
// to the day after the horizon, with the holidays that close it.
export function bookingCalendar(
  rules: BookingRules,
  now: number,
): BookingCalendar {
  const horizon = now + rules.horizonDays * DAY_MS;
  const days = ruleDays(rules, now - DAY_MS, horizon + DAY_MS);
  // Days past the holiday list show as not open yet.
  const to = Math.min(
    horizon,
    ...days.flatMap((day) => (day.uncovered ? [day.start] : [])),
  );
  return {
    now,
    from: now + rules.minNoticeHours * HOUR_MS,
    to,
    weekdays: [...rules.days],
    days: days.map(({ start, end, holidays }) => ({
      start,
      end,
      holidays: holidays.map(({ region, name }) => ({ region, name })),
    })),
  };
}
