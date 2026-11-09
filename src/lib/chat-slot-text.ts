import { MONTH_NAMES } from '@/lib/month-names';
import { zonedParts } from '@/lib/slots';
import { WEEKDAY_NAMES } from '@/lib/weekday-names';

// The chips' times, by calendar day ("11-9" for 9 November) and minute of
// the day, in the zone they are shown in.
export type OfferedTimes = {
  times: ReadonlySet<string>;
  days: ReadonlySet<string>;
  // The days by their number alone (10 → ["11-10"]), for "Martes 10".
  byDayNumber: ReadonlyMap<number, readonly string[]>;
};

const LIST_ITEM = /^\s*(?:[-*•–·]|\d{1,2}[.)])\s+(.+)$/;
// A clock time, never part of a number: "08:00", "8h30", "10.30", "9:30 am",
// "4 pm". "4.000 €" and "8.000–20.000" never match (the dot needs exactly two
// digits after it, and no digit or separator may touch the hour).
const TIME =
  /(?<![\d.,])(\d{1,2})(?::|h|\.(?=\d{2}(?!\d)))(\d{2})(?!\d)(?:\s*([ap])\.?\s?m\b\.?)?|(?<![\d.,])(\d{1,2})\s*([ap])\.?\s?m\b\.?/gi;
const MAX_HEADING = 48;

// The weekdays as written, accents optional ("miércoles", "miercoles"),
// plus the short English forms.
const ACCENTED: Readonly<Record<string, string>> = {
  a: '[aá]',
  e: '[eé]',
  i: '[ií]',
  o: '[oó]',
  u: '[uú]',
};
const WEEKDAY_WORDS = `(?:${[
  ...Object.keys(WEEKDAY_NAMES).map((name) =>
    name.replace(/[aeiou]/g, (vowel) => ACCENTED[vowel] ?? vowel),
  ),
  'mon',
  'tue',
  'wed',
  'thu',
  'fri',
  'sat',
  'sun',
].join('|')})`;
const WEEKDAY = new RegExp(String.raw`\b${WEEKDAY_WORDS}\b`, 'gi');
// A weekday and a day number with no month ("Martes 10", "Tue 10th").
const WEEKDAY_DAY = new RegExp(
  String.raw`\b${WEEKDAY_WORDS}\s+(\d{1,2})(?:st|nd|rd|th)?(?!\d)`,
  'gi',
);
// The filler a listed time may carry: date words, "and", "(midnight)". The
// one-letter "a", "y", "o" count only between two times ("08:00 a 11:30")
// and "a" before "las" ("a las 10:00").
const DATE_WORDS =
  /\b(?:de|del|las|la|at|on|the|st|nd|rd|th|and|or|midnight|noon|medianoche|mediod[ií]a)\b/gi;
const TIME_MARK = '\ue002';
const BETWEEN_TIMES = /\ue002\s+(?:a|y|o)\s+(?=\ue002)/gi;
const A_LAS = /\ba(?=\s+las?\b)/gi;
// A lead-in of a few words ("Here they are:", "Te propongo:") says nothing
// once its list went; a longer one keeps its words and ends with a full stop.
const SHORT_LEAD_WORDS = 6;
const DAY_MONTH = /(?<!\d)(\d{1,2})(?:st|nd|rd|th)?\s+(?:de\s+)?([a-zé]+)/gi;
const MONTH_DAY = /\b([a-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?(?!\d)/gi;

export function offeredTimes(
  starts: readonly number[],
  zone: string,
): OfferedTimes {
  const times = new Set<string>();
  const days = new Set<string>();
  const byDayNumber = new Map<number, string[]>();
  for (const start of starts) {
    const { month, day, hour, minute } = zonedParts(start, zone);
    const key = `${month}-${day}`;
    if (!days.has(key))
      byDayNumber.set(day, [...(byDayNumber.get(day) ?? []), key]);
    days.add(key);
    times.add(`${key}@${hour * 60 + minute}`);
  }
  return { times, days, byDayNumber };
}

// The calendar day a line names ("Monday 9 November", "lunes 9 de
// noviembre", "November 9"), as "11-9", or null. "Martes 10" (no month)
// counts when exactly one of the chips' days is a 10th.
function dayIn(text: string, offered?: OfferedTimes): string | null {
  for (const [, day, word = ''] of text.matchAll(DAY_MONTH)) {
    const month = MONTH_NAMES[word.toLowerCase()];
    if (month !== undefined) return `${month}-${Number(day)}`;
  }
  for (const [, word = '', day] of text.matchAll(MONTH_DAY)) {
    const month = MONTH_NAMES[word.toLowerCase()];
    if (month !== undefined) return `${month}-${Number(day)}`;
  }
  if (offered === undefined) return null;
  for (const [, day] of text.matchAll(WEEKDAY_DAY)) {
    const keys = offered.byDayNumber.get(Number(day)) ?? [];
    if (keys.length === 1) return keys[0] ?? null;
  }
  return null;
}

// The minutes of the day a written time can mean: "8:00" is 8 or 20 o'clock.
function minutesOf(
  hours: number,
  minutes: number,
  half: string | undefined,
): number[] {
  if (half === undefined) {
    return hours < 12
      ? [hours * 60 + minutes, (hours + 12) * 60 + minutes]
      : [hours * 60 + minutes];
  }
  const base = hours % 12;
  return [(half.toLowerCase() === 'p' ? base + 12 : base) * 60 + minutes];
}

function timesIn(text: string): number[][] {
  return [...text.matchAll(TIME)].map(
    ([, hours, minutes, half, bareHours, bareHalf]) =>
      bareHours === undefined
        ? minutesOf(Number(hours), Number(minutes), half)
        : minutesOf(Number(bareHours), 0, bareHalf),
  );
}

// Nothing but a time and the words of a date ("Monday 9 November, 8:00 am",
// "a las 10:00"): what is left once those go is empty.
function onlyDateAndTime(text: string): boolean {
  const rest = text
    .replace(TIME, TIME_MARK)
    .replace(BETWEEN_TIMES, `${TIME_MARK} `)
    .replace(A_LAS, ' ')
    .replaceAll(TIME_MARK, ' ')
    .replace(DAY_MONTH, (whole, _day, word: string) =>
      MONTH_NAMES[word.toLowerCase()] === undefined ? whole : ' ',
    )
    .replace(MONTH_DAY, (whole, word: string) =>
      MONTH_NAMES[word.toLowerCase()] === undefined ? whole : ' ',
    )
    .replace(WEEKDAY_DAY, ' ')
    .replace(WEEKDAY, ' ')
    .replace(DATE_WORDS, ' ');
  return rest.replace(/[\s\p{P}\p{S}]/gu, '') === '';
}

// A list item that names one of the chips' times on its day, and nothing else.
// The day comes from the item, else from the last line that named one, else
// from the chips when they all fall on one day.
function isListedTime(
  item: string,
  context: string | null,
  offered: OfferedTimes,
): boolean {
  const times = timesIn(item);
  if (times.length === 0 || !onlyDateAndTime(item)) return false;
  const [only] = offered.days.size === 1 ? offered.days : [];
  const day = dayIn(item, offered) ?? context ?? only;
  if (day === undefined) return false;
  return times.every((candidates) =>
    candidates.some((minute) => offered.times.has(`${day}@${minute}`)),
  );
}

// A day heading over such a list: a line that is only a date, with or
// without a colon ("Lunes 9 de noviembre:", "Monday 16 November").
function isDayHeading(line: string, offered: OfferedTimes): boolean {
  const text = line.trim();
  return (
    text.length <= MAX_HEADING &&
    dayIn(text, offered) !== null &&
    timesIn(text).length === 0 &&
    onlyDateAndTime(text)
  );
}

// The reply without its plain list of times, when the panel draws the same
// times as chips. Prose stays as written, including any time it mentions.
export function withoutListedTimes(
  text: string,
  offered: OfferedTimes,
): string {
  const lines = text.split('\n');
  let context: string | null = null;
  // A list item, or a line of nothing but times ("3:00 pm, 3:30 pm, 4:00 pm").
  const listed = lines.map((line) => {
    const item = LIST_ITEM.exec(line)?.[1];
    if (item !== undefined) return isListedTime(item, context, offered);
    if (timesIn(line).length > 0 && isListedTime(line, context, offered)) {
      return true;
    }
    context = dayIn(line, offered) ?? context;
    return false;
  });
  // A heading goes only when every list item under it went.
  function headsRemovedList(index: number): boolean {
    let removed = false;
    for (let at = index + 1; at < lines.length; at += 1) {
      const line = lines[at] ?? '';
      if (line.trim() === '') continue;
      if (!LIST_ITEM.test(line) && !listed[at]) break;
      if (!listed[at]) return false;
      removed = true;
    }
    return removed;
  }
  const removed = lines.map(
    (line, index) =>
      listed[index] === true ||
      (isDayHeading(line, offered) && headsRemovedList(index)),
  );
  // A lead-in whose list went ("The nearest free times are:") loses its last
  // sentence; earlier sentences on the line stay.
  function ledRemovedList(index: number): boolean {
    let went = false;
    for (let at = index + 1; at < lines.length; at += 1) {
      const line = lines[at] ?? '';
      if (line.trim() === '') continue;
      if (removed[at] === true) {
        went = true;
        continue;
      }
      return LIST_ITEM.test(line) ? false : went;
    }
    return went;
  }
  const kept = lines.flatMap((line, index) => {
    if (removed[index]) return [];
    const lead = line.trimEnd();
    if (!lead.endsWith(':') || !ledRemovedList(index)) return [line];
    const body = lead.slice(0, -1);
    const rest = withoutLastSentence(body);
    const last = body.slice(rest.length).trim();
    if (last.split(/\s+/).length > SHORT_LEAD_WORDS) return [`${body}.`];
    return rest === '' ? [] : [rest];
  });
  // Blank lines the removals left behind collapse into one, none at the ends.
  return kept
    .map((line) => (line.trim() === '' ? '' : line))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// Up to the end of the sentence before the last one: "Sunday is fully
// booked. The nearest free times are" keeps "Sunday is fully booked.".
function withoutLastSentence(text: string): string {
  for (let at = text.length - 1; at >= 0; at -= 1) {
    const mark = text[at];
    if (mark === '.' || mark === '!' || mark === '?') {
      return text.slice(0, at + 1).trimEnd();
    }
    if (mark === '¿' || mark === '¡') return text.slice(0, at).trimEnd();
  }
  return '';
}
