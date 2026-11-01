import type { BookingRules } from '@/content/booking-rules';
import { DAY_MS, HOUR_MS, MINUTE_MS } from '@/lib/time';

export type Interval = { start: number; end: number };
export type Slot = Interval & { day: string };
export type LocalDate = { year: number; month: number; day: number };
export type ZonedParts = LocalDate & {
  hour: number;
  minute: number;
  weekday: number;
};

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const ZONE_ID = /^[A-Za-z][A-Za-z0-9_+\-/]{0,63}$/;

// Keyed by the canonical zone name only. Case variants and aliases of one zone
// share an entry, so untrusted input can never grow this map.
const formatters = new Map<string, Intl.DateTimeFormat>();

function build(zone: string): Intl.DateTimeFormat {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: zone,
    hourCycle: 'h23',
    weekday: 'short',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
  });
}

function formatter(zone: string): Intl.DateTimeFormat {
  const known = formatters.get(zone);
  if (known !== undefined) return known;
  const made = build(zone);
  const canonical = made.resolvedOptions().timeZone;
  const shared = formatters.get(canonical) ?? made;
  formatters.set(canonical, shared);
  return shared;
}

export function formatterCacheSize(): number {
  return formatters.size;
}

// The canonical name for a valid zone, null for anything else.
export function canonicalZone(value: string): string | null {
  if (!ZONE_ID.test(value)) return null;
  try {
    return build(value).resolvedOptions().timeZone;
  } catch {
    return null;
  }
}

export function isTimeZone(value: string): boolean {
  return canonicalZone(value) !== null;
}

export function zonedParts(instant: number, zone: string): ZonedParts {
  const numbers: Record<string, number> = {};
  let weekday = '';
  for (const { type, value } of formatter(zone).formatToParts(instant)) {
    if (type === 'weekday') weekday = value;
    else if (type !== 'literal') numbers[type] = Number(value);
  }
  return {
    year: numbers.year ?? 0,
    month: numbers.month ?? 0,
    day: numbers.day ?? 0,
    hour: numbers.hour ?? 0,
    minute: numbers.minute ?? 0,
    weekday: WEEKDAYS.indexOf(weekday) + 1,
  };
}

function wallClock(instant: number, zone: string): number {
  const p = zonedParts(instant, zone);
  return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute);
}

export function zonedToInstant(
  date: LocalDate,
  minutes: number,
  zone: string,
): number | null {
  const wall = Date.UTC(date.year, date.month - 1, date.day, 0, minutes);
  let instant = wall - (wallClock(wall, zone) - wall);
  instant = wall - (wallClock(instant, zone) - instant);
  return wallClock(instant, zone) === wall ? instant : null;
}

export function dateKey(parts: LocalDate): string {
  const month = String(parts.month).padStart(2, '0');
  const day = String(parts.day).padStart(2, '0');
  return `${parts.year}-${month}-${day}`;
}

function toMinutes(clock: string): number {
  const [hours = 0, minutes = 0] = clock.split(':').map(Number);
  return hours * 60 + minutes;
}

function addDays(date: LocalDate, days: number): LocalDate {
  const moved = new Date(Date.UTC(date.year, date.month - 1, date.day + days));
  return {
    year: moved.getUTCFullYear(),
    month: moved.getUTCMonth() + 1,
    day: moved.getUTCDate(),
  };
}

function isoWeekday(date: LocalDate): number {
  const day = new Date(
    Date.UTC(date.year, date.month - 1, date.day),
  ).getUTCDay();
  return day === 0 ? 7 : day;
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

export function candidateSlots(
  rules: BookingRules,
  from: number,
  to: number,
): Slot[] {
  const first = addDays(zonedParts(from, rules.zone), -1);
  const last = dateKey(addDays(zonedParts(to, rules.zone), 1));
  const found = new Map<number, Slot>();
  const days = new Set(rules.days);
  for (let date = first; dateKey(date) <= last; date = addDays(date, 1)) {
    if (!days.has(isoWeekday(date))) continue;
    for (const window of rules.windows) {
      for (const slot of windowSlots(rules, date, window)) {
        if (slot.start >= from && slot.start < to) found.set(slot.start, slot);
      }
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

export type ZonedSlot<T extends Interval> = { slot: T; parts: ZonedParts };

export function groupByDay<T extends Interval>(
  slots: readonly T[],
  zone: string,
): { date: string; entries: ZonedSlot<T>[] }[] {
  const days: { date: string; entries: ZonedSlot<T>[] }[] = [];
  for (const slot of slots) {
    const parts = zonedParts(slot.start, zone);
    const date = dateKey(parts);
    const last = days.at(-1);
    if (last?.date === date) last.entries.push({ slot, parts });
    else days.push({ date, entries: [{ slot, parts }] });
  }
  return days;
}
