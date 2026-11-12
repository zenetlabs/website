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

// An instant as ISO 8601 in the zone's own wall clock with its offset
// ("2026-11-17T17:00:00+08:00"): the same moment as the UTC form, but a reader
// can't take its hour for the visitor's. Minute precision, as slots are.
export function zonedIso(instant: number, zone: string): string {
  const minute = Math.floor(instant / 60_000) * 60_000;
  const p = zonedParts(minute, zone);
  const wall = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute);
  const offset = Math.round((wall - minute) / 60_000);
  const sign = offset < 0 ? '-' : '+';
  const abs = Math.abs(offset);
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${dateKey(p)}T${pad(p.hour)}:${pad(p.minute)}:00${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`;
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

export function shiftDate(date: LocalDate, days: number): LocalDate {
  const moved = new Date(Date.UTC(date.year, date.month - 1, date.day + days));
  return {
    year: moved.getUTCFullYear(),
    month: moved.getUTCMonth() + 1,
    day: moved.getUTCDate(),
  };
}

// The ISO weekday (Monday is 1) of a calendar date.
export function isoWeekday(date: LocalDate): number {
  const day = new Date(
    Date.UTC(date.year, date.month - 1, date.day),
  ).getUTCDay();
  return day === 0 ? 7 : day;
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
