import { zonedParts } from '@/lib/slots';

// The chips' times, by calendar day ("11-9" for 9 November) and minute of
// the day, in the zone they are shown in.
export type OfferedTimes = {
  times: ReadonlySet<string>;
  days: ReadonlySet<string>;
};

const LIST_ITEM = /^\s*(?:[-*•–·]|\d{1,2}[.)])\s+(.+)$/;
// A clock time, never part of a number: "08:00", "8h30", "10.30", "9:30 am",
// "4 pm". "4.000 €" and "8.000–20.000" never match (the dot needs exactly two
// digits after it, and no digit or separator may touch the hour).
const TIME =
  /(?<![\d.,])(\d{1,2})(?::|h|\.(?=\d{2}(?!\d)))(\d{2})(?!\d)(?:\s*([ap])\.?\s?m\b\.?)?|(?<![\d.,])(\d{1,2})\s*([ap])\.?\s?m\b\.?/gi;
const MAX_HEADING = 48;

const MONTHS: Record<string, number> = {
  january: 1,
  jan: 1,
  february: 2,
  feb: 2,
  march: 3,
  mar: 3,
  april: 4,
  apr: 4,
  may: 5,
  june: 6,
  jun: 6,
  july: 7,
  jul: 7,
  august: 8,
  aug: 8,
  september: 9,
  sept: 9,
  sep: 9,
  october: 10,
  oct: 10,
  november: 11,
  nov: 11,
  december: 12,
  dec: 12,
  enero: 1,
  ene: 1,
  febrero: 2,
  marzo: 3,
  abril: 4,
  abr: 4,
  mayo: 5,
  junio: 6,
  julio: 7,
  agosto: 8,
  ago: 8,
  septiembre: 9,
  setiembre: 9,
  octubre: 10,
  noviembre: 11,
  diciembre: 12,
  dic: 12,
};
const WEEKDAY =
  /\b(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday|mon|tue|wed|thu|fri|sat|sun|lunes|martes|mi[eé]rcoles|jueves|viernes|s[aá]bado|domingo)\b/gi;
const DATE_WORDS = /\b(?:de|del|a|las|la|at|on|the|st|nd|rd|th)\b/gi;
const DAY_MONTH = /(?<!\d)(\d{1,2})(?:st|nd|rd|th)?\s+(?:de\s+)?([a-zé]+)/gi;
const MONTH_DAY = /\b([a-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?(?!\d)/gi;

export function offeredTimes(
  starts: readonly number[],
  zone: string,
): OfferedTimes {
  const times = new Set<string>();
  const days = new Set<string>();
  for (const start of starts) {
    const { month, day, hour, minute } = zonedParts(start, zone);
    days.add(`${month}-${day}`);
    times.add(`${month}-${day}@${hour * 60 + minute}`);
  }
  return { times, days };
}

// The calendar day a line names ("Monday 9 November", "lunes 9 de
// noviembre", "November 9"), as "11-9", or null.
function dayIn(text: string): string | null {
  for (const [, day, word = ''] of text.matchAll(DAY_MONTH)) {
    const month = MONTHS[word.toLowerCase()];
    if (month !== undefined) return `${month}-${Number(day)}`;
  }
  for (const [, word = '', day] of text.matchAll(MONTH_DAY)) {
    const month = MONTHS[word.toLowerCase()];
    if (month !== undefined) return `${month}-${Number(day)}`;
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
    .replace(TIME, ' ')
    .replace(DAY_MONTH, (whole, _day, word: string) =>
      MONTHS[word.toLowerCase()] === undefined ? whole : ' ',
    )
    .replace(MONTH_DAY, (whole, word: string) =>
      MONTHS[word.toLowerCase()] === undefined ? whole : ' ',
    )
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
  const day = dayIn(item) ?? context ?? only;
  if (day === undefined) return false;
  return times.every((candidates) =>
    candidates.some((minute) => offered.times.has(`${day}@${minute}`)),
  );
}

// A day heading over such a list ("Lunes 9 de noviembre:").
function isDayHeading(line: string): boolean {
  const text = line.trim();
  return (
    text.length <= MAX_HEADING && text.endsWith(':') && dayIn(text) !== null
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
  const listed = lines.map((line) => {
    const item = LIST_ITEM.exec(line)?.[1];
    if (item === undefined) {
      context = dayIn(line) ?? context;
      return false;
    }
    return isListedTime(item, context, offered);
  });
  // A heading goes only when every list item under it went.
  function headsRemovedList(index: number): boolean {
    let removed = false;
    for (let at = index + 1; at < lines.length; at += 1) {
      const line = lines[at] ?? '';
      if (line.trim() === '') continue;
      if (!LIST_ITEM.test(line)) break;
      if (!listed[at]) return false;
      removed = true;
    }
    return removed;
  }
  const removed = lines.map(
    (line, index) =>
      listed[index] === true || (isDayHeading(line) && headsRemovedList(index)),
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
    const rest = withoutLastSentence(lead.slice(0, -1));
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
