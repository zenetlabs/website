import type { ModelMessage } from 'ai';
import { z } from 'zod';
import { BOOKING_RULES } from '@/content/booking-rules';
import type { Locale } from '@/lib/i18n';
import { formatSlotLabel } from '@/lib/slot-format';
import { zonedParts } from '@/lib/slots';
import { fold, WEEKDAYS } from '@/server/chat/text';

// A slot check_availability returned in this conversation, in the zone it was shown in.
export type OfferedSlot = { start: number; end: number; zone: string };

const availabilitySchema = z
  .object({
    timeZone: z.string(),
    slots: z.array(z.object({ start: z.string(), end: z.string() }).loose()),
  })
  .loose();

export function slotsOf(value: unknown): OfferedSlot[] {
  const parsed = availabilitySchema.safeParse(value);
  if (!parsed.success) return [];
  const zone = parsed.data.timeZone;
  return parsed.data.slots.flatMap(({ start, end }) => {
    const from = Date.parse(start);
    const to = Date.parse(end);
    return Number.isNaN(from) || Number.isNaN(to)
      ? []
      : [{ start: from, end: to, zone }];
  });
}

const storedResultSchema = z.object({
  type: z.literal('tool-result'),
  toolName: z.literal('check_availability'),
  output: z.object({ type: z.literal('json'), value: z.unknown() }),
});

export function toolSlots(messages: readonly ModelMessage[]): OfferedSlot[] {
  return messages.flatMap((message) =>
    message.role === 'tool'
      ? message.content.flatMap((part) => {
          const parsed = storedResultSchema.safeParse(part);
          return parsed.success ? slotsOf(parsed.data.output.value) : [];
        })
      : [],
  );
}

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

// Short weekdays are words too ("sat", "sun"), so they count only before a day number.
const SHORT_WEEKDAYS: Record<string, number> = {
  mon: 1,
  tue: 2,
  tues: 2,
  wed: 3,
  thu: 4,
  thurs: 4,
  fri: 5,
  sat: 6,
  sun: 7,
  lun: 1,
  mar: 2,
  mie: 3,
  jue: 4,
  vie: 5,
  sab: 6,
  dom: 7,
};

function alternation(words: readonly string[]): string {
  return [...words].sort((a, b) => b.length - a.length).join('|');
}

const MONTH = alternation(Object.keys(MONTHS));
const WEEKDAY = alternation(Object.keys(WEEKDAYS));
const SHORT_WEEKDAY = alternation(Object.keys(SHORT_WEEKDAYS));
const ORDINAL = '(?:st|nd|rd|th|º)?';
const NOT_A_TIME = String.raw`(?![\d:h]|\.\d|\s?[ap]\.?\s?m\b)(?![a-z\d])`;
const UNITS = String.raw`(?!\s*(?:%|semanas?|dias?|meses|mes|horas?|anos?|minutos?|personas|pedidos|herramientas|veces)\b)`;

const DATE = new RegExp(
  String.raw`(?:\b(?:(${WEEKDAY})|(${SHORT_WEEKDAY})(?=\.?,?\s+\d))\b\.?,?\s+(?:the\s+|el\s+|dia\s+)?)?` +
    String.raw`(?:\b(\d{1,2})${ORDINAL}${NOT_A_TIME}(?:\s+(?:de\s+|of\s+)?(${MONTH})\b\.?)?|\b(${MONTH})\b\.?\s+(\d{1,2})${ORDINAL}${NOT_A_TIME})` +
    String.raw`(?:,?\s+(?:de\s+)?(\d{4})\b)?`,
  'g',
);
const LONE_WEEKDAY = new RegExp(String.raw`\b(${WEEKDAY})\b`, 'g');

// "9:30", "9h30" and "9.30" (a dotted time needs two digits after the dot,
// so "4.000" or "1.5" is never one).
const CLOCK =
  /(?<![\d:.])([01]?\d|2[0-3])[:h.]([0-5]\d)(?!\d|\.\d)(?:\s?([ap])\.?\s?m\b\.?)?/g;
const MERIDIEM = /(?<![\d:.]|\dh)\b(1[0-2]|0?[1-9])\s?([ap])\.?\s?m\b\.?/g;
// "a las 9", "las 5 de la tarde", "at 9": a bare hour counts only in these forms.
const SPOKEN_ES = new RegExp(
  String.raw`\b(a\s+)?las?\s+(\d{1,2})(?:\s+y\s+(media|cuarto))?${NOT_A_TIME}${UNITS}(?:\s+de\s+la\s+(manana|tarde|noche))?`,
  'g',
);
const SPOKEN_EN = new RegExp(
  String.raw`\bat\s+(1[0-2]|0?[1-9])${NOT_A_TIME}(?=\s*(?:$|[.,;!?)]|(?:on|or|and|to|in|for|with|o'?clock)\b))`,
  'g',
);
const NOON = /\b(?:noon|midday|mediodia)\b/g;

const NEGATION =
  /\b(?:no|not|none|nothing|unavailable|full|fully|booked up|ningun[oa]?|nada|sin|complet[oa]s?|ocupad[oa]s?|llen[oa]s?)\b|n't\b/;

type DateMention = {
  index: number;
  day?: number;
  month?: number;
  weekday?: number;
  year?: number;
};

type TimeMention = { index: number; end: number; minutes: number[] };

function numberOr(value: string | undefined): number | undefined {
  return value === undefined ? undefined : Number(value);
}

function dateMentions(text: string): DateMention[] {
  const mentions: DateMention[] = [];
  const covered: Array<[number, number]> = [];
  for (const match of text.matchAll(DATE)) {
    const [whole, long, short, day, monthAfter, monthBefore, dayAfter, year] =
      match;
    const weekday =
      long === undefined
        ? short === undefined
          ? undefined
          : SHORT_WEEKDAYS[short]
        : WEEKDAYS[long];
    const monthName = monthAfter ?? monthBefore;
    const month = monthName === undefined ? undefined : MONTHS[monthName];
    if (weekday === undefined && month === undefined) continue;
    const index = match.index ?? 0;
    covered.push([index, index + whole.length]);
    mentions.push({
      index,
      day: numberOr(day ?? dayAfter),
      month,
      weekday,
      year: numberOr(year),
    });
  }
  for (const match of text.matchAll(LONE_WEEKDAY)) {
    const index = match.index ?? 0;
    if (covered.some(([from, to]) => index >= from && index < to)) continue;
    mentions.push({ index, weekday: WEEKDAYS[match[1] ?? ''] });
  }
  return mentions.sort((a, b) => a.index - b.index);
}

// The minutes after midnight a written time can mean: "9:00" without am or pm
// in English is 9:00 or 21:00, "09:00" and "21:00" only themselves.
function candidates(hour: number, minute: number, period: string | null) {
  if (hour > 23) return [];
  if (period === 'a' || period === 'manana') {
    return hour > 12 ? [] : [(hour % 12) * 60 + minute];
  }
  if (period === 'p' || period === 'tarde' || period === 'noche') {
    return hour > 12 ? [] : [((hour % 12) + 12) * 60 + minute];
  }
  return hour >= 1 && hour < 12
    ? [hour * 60 + minute, (hour + 12) * 60 + minute]
    : [hour * 60 + minute];
}

function timeMentions(text: string): TimeMention[] {
  const mentions: TimeMention[] = [];
  for (const match of text.matchAll(CLOCK)) {
    const [, hour = '', minute = '', period] = match;
    const strict = period === undefined && hour.length === 2;
    mentions.push({
      index: match.index ?? 0,
      end: (match.index ?? 0) + match[0].length,
      minutes: strict
        ? [Number(hour) * 60 + Number(minute)]
        : candidates(Number(hour), Number(minute), period ?? null),
    });
  }
  for (const match of text.matchAll(MERIDIEM)) {
    const [, hour = '', period = ''] = match;
    mentions.push({
      index: match.index ?? 0,
      end: (match.index ?? 0) + match[0].length,
      minutes: candidates(Number(hour), 0, period),
    });
  }
  for (const match of text.matchAll(SPOKEN_ES)) {
    const [, preposition, hour = '', half, period] = match;
    if (preposition === undefined && period === undefined) continue;
    const minute = half === undefined ? 0 : half === 'media' ? 30 : 15;
    mentions.push({
      index: match.index ?? 0,
      end: (match.index ?? 0) + match[0].length,
      minutes: candidates(Number(hour), minute, period ?? null),
    });
  }
  for (const match of text.matchAll(SPOKEN_EN)) {
    mentions.push({
      index: match.index ?? 0,
      end: (match.index ?? 0) + match[0].length,
      minutes: candidates(Number(match[1] ?? ''), 0, null),
    });
  }
  for (const match of text.matchAll(NOON)) {
    mentions.push({
      index: match.index ?? 0,
      end: (match.index ?? 0) + match[0].length,
      minutes: [12 * 60],
    });
  }
  return mentions.filter((mention) => mention.minutes.length > 0);
}

type OfferedDay = {
  day: number;
  month: number;
  weekday: number;
  minutes: Set<number>;
};

function offeredDays(slots: readonly OfferedSlot[]): OfferedDay[] {
  const days = new Map<string, OfferedDay>();
  const add = (instant: number, zone: string) => {
    const { year, month, day, weekday, hour, minute } = zonedParts(
      instant,
      zone,
    );
    const key = `${year}-${month}-${day}`;
    const entry = days.get(key) ?? { day, month, weekday, minutes: new Set() };
    entry.minutes.add(hour * 60 + minute);
    days.set(key, entry);
  };
  for (const { start, end, zone } of slots) {
    add(start, zone);
    add(end, zone);
  }
  return [...days.values()];
}

function matches(mention: DateMention, day: OfferedDay): boolean {
  return (
    (mention.day === undefined || mention.day === day.day) &&
    (mention.month === undefined || mention.month === day.month) &&
    (mention.weekday === undefined || mention.weekday === day.weekday)
  );
}

const DAY_MS = 86_400_000;

// A date with no year that falls inside the booking horizon reads as an offer;
// one with a year, or one far away (a legal deadline), does not.
function inHorizon(mention: DateMention, now: number): boolean {
  if (mention.day === undefined || mention.year !== undefined) return false;
  if (mention.month === undefined) return true;
  const year = new Date(now).getUTCFullYear();
  const from = now - 2 * DAY_MS;
  const to = now + (BOOKING_RULES.horizonDays + 2) * DAY_MS;
  return [year, year + 1].some((candidate) => {
    const instant = Date.UTC(candidate, (mention.month ?? 1) - 1, mention.day);
    return instant >= from && instant <= to;
  });
}

// The day a time belongs to: the date said before it in the sentence, else
// the one after it, else the last one the visitor already saw.
function contextOf(
  time: TimeMention,
  dates: readonly DateMention[],
  earlier: DateMention | undefined,
): DateMention | undefined {
  return (
    dates.findLast((date) => date.index < time.index) ??
    dates.find((date) => date.index > time.index) ??
    earlier
  );
}

// The clause a position sits in: negation counts only there ("Tuesday is
// full, but Monday 9 has 9:00" offers Monday).
const CLAUSE_BREAK =
  /[,;—–]|(?<!\d):|:(?!\d)|\b(?:but|pero|aunque|however|sin embargo)\b/g;

function clauseAt(text: string, index: number): string {
  let start = 0;
  let end = text.length;
  for (const match of text.matchAll(CLAUSE_BREAK)) {
    const at = match.index ?? 0;
    if (at < index) start = at + match[0].length;
    else {
      end = at;
      break;
    }
  }
  return text.slice(start, end);
}

// "9am to 6pm", "de 9:00 a 18:00", "between 9 and 5": a span of hours, read
// as opening hours unless a day says which slots it means.
const RANGE_AFTER = /^\s*(?:-|–|—|to|until|till|a|hasta|y|and)\s*$/;

function inRange(
  time: TimeMention,
  times: readonly TimeMention[],
  text: string,
) {
  return times.some((other) => {
    if (other === time) return false;
    const [first, second] =
      other.index < time.index ? [other, time] : [time, other];
    return RANGE_AFTER.test(text.slice(first.end, second.index));
  });
}

// What the sentence offers that no check_availability result of this
// conversation returned: a day (`date`), a time on a day (`date`), or a time
// with no day in sight (`time`, which may be opening hours). Null when it
// offers nothing new.
export function slotViolation(
  sentence: string,
  {
    slots,
    previous,
    now,
  }: { slots: readonly OfferedSlot[]; previous: string; now: number },
): 'date' | 'time' | null {
  const text = fold(sentence);
  const dates = dateMentions(text);
  const times = timeMentions(text);
  if (dates.length === 0 && times.length === 0) return null;
  const days = offeredDays(slots);
  // "Tuesday is full" names a day without offering it; a time always offers one.
  const offersDay = dates.some(
    (date) =>
      !NEGATION.test(clauseAt(text, date.index)) &&
      inHorizon(date, now) &&
      !days.some((day) => matches(date, day)),
  );
  if (offersDay) return 'date';
  const earlier = dateMentions(fold(previous)).at(-1);
  let found: 'date' | 'time' | null = null;
  for (const time of times) {
    const context = contextOf(time, dates, earlier);
    if (context === undefined && inRange(time, times, text)) continue;
    const pool =
      context === undefined
        ? days
        : days.filter((day) => matches(context, day));
    const offered = pool.some((day) =>
      time.minutes.some((minute) => day.minutes.has(minute)),
    );
    if (offered) continue;
    if (context !== undefined) return 'date';
    found = 'time';
  }
  return found;
}

const NEAREST = 3;

const SLOT_FALLBACK: Record<Locale, { none: string; nearest: string }> = {
  en: {
    none: "I can't confirm that time; I can only offer times from the calendar.",
    nearest: 'The nearest free ones are',
  },
  es: {
    none: 'No puedo confirmarte esa hora; solo puedo ofrecerte horas de la agenda.',
    nearest: 'Las más cercanas libres son',
  },
};

// The replacement names real slots, so the visitor still has something to pick.
export function slotFallback(
  language: Locale,
  slots: readonly OfferedSlot[],
  now: number,
): string {
  const copy = SLOT_FALLBACK[language];
  const upcoming = new Map<number, OfferedSlot>();
  for (const slot of slots) {
    if (slot.start > now && !upcoming.has(slot.start)) {
      upcoming.set(slot.start, slot);
    }
  }
  const nearest = [...upcoming.values()]
    .sort((a, b) => a.start - b.start)
    .slice(0, NEAREST)
    .map(({ start, zone }) => formatSlotLabel(language, start, zone));
  return nearest.length === 0
    ? copy.none
    : `${copy.none} ${copy.nearest}: ${nearest.join('; ')}.`;
}
