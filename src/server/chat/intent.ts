import { BOOKING_RULES } from '@/content/booking-rules';
import { dateKey, isoWeekday, zonedParts } from '@/lib/slots';
import { WEEKDAY_NAMES } from '@/lib/weekday-names';
import { fold, hasWord, wordPattern } from '@/server/chat/text';

// Small, deterministic reads of the visitor's message, made before the model
// runs. They decide what the server enforces, never what the model may say.

const INJECTION = [
  /\b(?:ignore|disregard|forget)\b.*\b(?:instructions?|rules|prompt)\b/,
  /\bsystem prompt\b|\bdeveloper mode\b|\byou are now\b|\bjailbreak\b|\bpretend (?:to be|you)\b/,
  /\b(?:ignora|olvida|olvidate de)\b.*\b(?:instrucciones|reglas)\b/,
  /\breglas internas\b|\bmodo (?:desarrollador|dios)\b|\bahora eres\b|\bhazte pasar\b|\bprompt del sistema\b/,
  /\badmin(?:istrator|istrador)?\b.*\b(?:approved|authori[sz]ed|aprobado|autorizado)\b/,
];

// Words that put a message inside what the assistant is for. Weather, poems,
// recipes or general knowledge match none of them.
const ON_TOPIC = new RegExp(
  String.raw`\b(?:` +
    [
      'zenet',
      'prices?',
      'pricing',
      'costs?',
      'rates?',
      'discount',
      'quote',
      'budget',
      'calls?',
      'book(?:ing)?',
      'meeting',
      'appointment',
      'availability',
      'office',
      'located',
      'based',
      'integrations?',
      'integrate',
      'connect',
      'automat[a-z]*',
      'agents?',
      'software',
      'apps?',
      'websites?',
      'seo',
      'training',
      'maintenance',
      'diagnostic',
      'projects?',
      'code',
      'data',
      'privacy',
      'tools?',
      'erp',
      'crm',
      'whatsapp',
      'invoices?',
      'shopify',
      'xero',
      'hubspot',
      'holded',
      'prestashop',
      'woocommerce',
      'sap',
      'verifactu',
      'founder',
      'precios?',
      'cuesta',
      'cuanto',
      'tarifa',
      'descuento',
      'presupuesto',
      'llamada',
      'reserv[a-z]*',
      'reunion',
      'cita',
      'disponib[a-z]*',
      'oficinas?',
      'integracion(?:es)?',
      'integrar',
      'conect[a-z]*',
      'agentes?',
      'formacion',
      'mantenimiento',
      'diagnostico',
      'proyectos?',
      'codigo',
      'datos',
      'privacidad',
      'herramientas?',
      'facturas?',
      'trabajais',
      'haceis',
      'fundador',
    ].join('|') +
    String.raw`)\b`,
);

export type Intent = 'injection' | 'on-topic' | 'other';

export function messageIntent(message: string): Intent {
  const text = fold(message);
  if (INJECTION.some((pattern) => pattern.test(text))) return 'injection';
  return ON_TOPIC.test(text) ? 'on-topic' : 'other';
}

// The FAQ entries whose answer must not be paraphrased into its opposite.
export type GroundedFaq = 'ownership' | 'privacy' | 'models' | 'where';

const TOPICS: ReadonlyArray<[GroundedFaq, RegExp]> = [
  [
    'ownership',
    /\bwho owns\b|\bowns? the (?:code|data|software|ip)\b|\bownership\b|\bintellectual property\b|\bde quien (?:es|son|sera|seran)\b.*\b(?:codigo|datos|software)\b|\bpropiedad (?:del|de los|intelectual)\b|\bpropietari|\bduen[oa]s?\b/,
  ],
  [
    'privacy',
    /\bprivacy\b|\bgdpr\b|\bpdpa\b|\bdata protection\b|\bwhere\b.*\bdata\b.*\b(?:kept|stored|live|hosted)\b|\bprivacidad\b|\brgpd\b|\bproteccion de datos\b|\bdonde\b.*\b(?:se guardan|guardais|estan|alojais)\b.*\bdatos\b/,
  ],
  [
    'where',
    /\boffices?\b|\bheadquarters\b|\bwhere are you\b|\b(?:located|based) in\b|\boficinas?\b|\bsede\b|\bdonde (?:estais|teneis|esta)\b/,
  ],
  [
    'models',
    /\b(?:which|what) (?:ai |llm )?models?\b|\b(?:llms?|openai|chatgpt|gpt|claude|anthropic|gemini)\b|\bque modelos?\b|\bmodelos? de (?:ia|lenguaje)\b/,
  ],
];

// The FAQ entry a question is clearly about, or null.
export function faqTopic(message: string): GroundedFaq | null {
  const text = fold(message);
  return TOPICS.find(([, pattern]) => pattern.test(text))?.[0] ?? null;
}

// A request for a time, not any mention of calls or bookings: "book a call",
// "talk to someone", "me gustaría una llamada", "reservar una llamada",
// "huecos", "free slots", or a call asked for "next week". "Can your agent
// answer phone calls?" or "automate my appointment reminders" are not.
const CALL = `(?:a |an |one )?(?:quick |short |free )?(?:call|meeting|chat|appointment|demo)`;
const LLAMADA = `(?:una |un )?(?:llamada|reunion|cita|videollamada)`;
const BOOKING = [
  new RegExp(
    String.raw`\b(?:book|schedule|arrange|set up|organi[sz]e)\s+${CALL}\b`,
  ),
  new RegExp(
    String.raw`\b(?:i'?d like|i would like|i want|can we have|could we have|let'?s have)\s+${CALL}\b`,
  ),
  /\b(?:talk|speak) (?:to|with) (?:someone|a person|a human|somebody|the founder)\b/,
  /\b(?:free|available|open) (?:slots?|times?)\b/,
  new RegExp(
    String.raw`\b(?:quiero|quisiera|me gustaria|necesito)\s+${LLAMADA}\b`,
  ),
  new RegExp(
    String.raw`\b(?:reservar|agendar|programar|concertar)\s+${LLAMADA}\b`,
  ),
  /\bhablar con (?:alguien|una persona|el fundador)\b/,
  /\bhuecos?\b/,
  /\b(?:call|meeting|llamada|reunion)\b.*\b(?:next week|semana que viene|proxima semana)\b/,
];

export function bookingIntent(message: string): boolean {
  const text = fold(message).replace(/[’‘]/g, "'");
  return BOOKING.some((pattern) => pattern.test(text));
}

const WEEKDAY = new RegExp(`\\b(${Object.keys(WEEKDAY_NAMES).join('|')})\\b`);
const WEEKDAYS_ALL = new RegExp(WEEKDAY.source, 'g');
const NEXT_WEEK =
  /\bnext week\b|\b(?:la )?semana que viene\b|\b(?:la )?proxima semana\b/;
const THIS_WEEK = /\bthis week\b|\besta semana\b/;
const AFTER_TOMORROW = /\b(?:the )?day after tomorrow\b|\bpasado manana\b/;
// "mañana" alone; "por la mañana" and "esta mañana" (this morning) are not a day.
const TOMORROW = /\btomorrow\b|(?<!\bla |\bpasado |\besta )\bmanana\b/;
const TODAY = /\btoday\b|\bhoy\b/;
// "this Friday", "este viernes": the coming one, today included.
const THIS_WEEKDAY = new RegExp(
  `\\b(?:this|este|esta)\\s+(?:${Object.keys(WEEKDAY_NAMES).join('|')})\\b`,
);
// Words that ask about free times, beside the booking requests.
const AVAILABILITY =
  /\b(?:free|available|availability|slots?|open|anything|times?|huecos?|libres?|disponib[a-z]*|algo|horas?)\b/;

const DAY_MS = 86_400_000;

// `days` lists the days when they are apart ("¿lunes o martes?" asked on a
// Monday: Tuesday and next Monday), so each can be looked at alone.
export type DayRange = { from: string; to: string; days?: string[] };

// One calendar day in the visitor's zone, with its ISO weekday (Monday is 1)
// and whether the visitor named it by its weekday ("el domingo").
export type ResolvedDay = {
  year: number;
  month: number;
  day: number;
  weekday: number;
  key: string;
  byWeekday: boolean;
};

function dayAt(
  now: number,
  zone: string,
  offset: number,
  byWeekday = false,
): ResolvedDay {
  const today = zonedParts(now, zone);
  const date = new Date(
    Date.UTC(today.year, today.month - 1, today.day) + offset * DAY_MS,
  );
  const local = {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  };
  return {
    ...local,
    weekday: isoWeekday(local),
    key: dateKey(local),
    byWeekday,
  };
}

// How many days ahead a named weekday is, read the natural way: its next
// occurrence after today ("el domingo", "next Monday", "el lunes que viene";
// "el lunes" asked on a Monday is the Monday after); "this Friday" / "este
// viernes" may be today; with "next week" it falls in next week (Monday to
// Sunday).
function weekdayOffset(text: string, name: string, weekdayToday: number) {
  const target = WEEKDAY_NAMES[name] ?? weekdayToday;
  if (NEXT_WEEK.test(text)) return 8 - weekdayToday + target - 1;
  const ahead = (target - weekdayToday + 7) % 7;
  return THIS_WEEKDAY.test(text) ? ahead : ahead || 7;
}

// "the day after tomorrow" / "pasado mañana" is two days ahead, "tomorrow" /
// "mañana" one, "today" / "hoy" none; each found once ("the day after
// tomorrow" is not also "tomorrow").
function relativeOffsets(text: string): number[] {
  const rest = text.replace(AFTER_TOMORROW, ' ');
  return [
    ...(AFTER_TOMORROW.test(text) ? [2] : []),
    ...(TOMORROW.test(rest) ? [1] : []),
    ...(TODAY.test(rest) ? [0] : []),
  ];
}

const MAX_DAYS = 7;
const WEEKDAY_WORDS = Object.keys(WEEKDAY_NAMES).join('|');
// "Monday to Friday", "de lunes a viernes", "lunes-viernes".
const RANGE = new RegExp(
  `\\b(${WEEKDAY_WORDS})\\s*(?:to|through|thru|until|till|-|–|a|al|hasta)\\s*(${WEEKDAY_WORDS})\\b`,
);

type Named = { offset: number; byWeekday: boolean };

// The offsets of the days a message names: each weekday (a range of them
// counts every day between, at most a week) and each relative day.
function namedDays(text: string, weekdayToday: number): Named[] {
  const relative = relativeOffsets(text).map((offset) => ({
    offset,
    byWeekday: false,
  }));
  const range = RANGE.exec(text);
  if (range !== null) {
    const [, from = '', to = ''] = range;
    const start = weekdayOffset(text, from, weekdayToday);
    const length =
      ((WEEKDAY_NAMES[to] ?? 0) - (WEEKDAY_NAMES[from] ?? 0) + 7) % 7;
    const days = Math.min(length, MAX_DAYS - 1) + 1;
    return [
      ...Array.from({ length: days }, (_, at) => ({
        offset: start + at,
        byWeekday: true,
      })),
      ...relative,
    ];
  }
  const names = new Set(
    [...text.matchAll(WEEKDAYS_ALL)].map((match) => match[1] ?? ''),
  );
  return [
    ...[...names].map((name) => ({
      offset: weekdayOffset(text, name, weekdayToday),
      byWeekday: true,
    })),
    ...relative,
  ];
}

// Every day the message names ("¿lunes o martes?", "hoy o mañana", "Monday to
// Friday"), in the visitor's zone, by date, each once: at most a week of them,
// all within the booking horizon. None when it names a week and no weekday
// ("Hoy no puedo, ¿la semana que viene?"): the span wins.
export function resolvedDays(
  message: string,
  now: number,
  zone: string,
): ResolvedDay[] {
  const text = fold(message);
  if (!WEEKDAY.test(text) && (NEXT_WEEK.test(text) || THIS_WEEK.test(text))) {
    return [];
  }
  const byOffset = new Map<number, boolean>();
  for (const { offset, byWeekday } of namedDays(
    text,
    zonedParts(now, zone).weekday,
  )) {
    if (offset > BOOKING_RULES.horizonDays) continue;
    byOffset.set(offset, byWeekday || (byOffset.get(offset) ?? false));
  }
  return [...byOffset]
    .sort(([a], [b]) => a - b)
    .slice(0, MAX_DAYS)
    .map(([offset, byWeekday]) => dayAt(now, zone, offset, byWeekday));
}

// The single day the message names, or null (none, or several).
export function resolvedDay(
  message: string,
  now: number,
  zone: string,
): ResolvedDay | null {
  const days = resolvedDays(message, now, zone);
  return days.length === 1 ? (days[0] ?? null) : null;
}

// Whether the message is about free times: a booking request, or words such
// as "free", "slots", "anything", "hueco", "disponible".
export function asksAvailability(message: string): boolean {
  const text = fold(message);
  return bookingIntent(message) || AVAILABILITY.test(text) || onlyDays(text);
}

// The few words that tie day names together ("¿lunes o martes?", "on Monday
// or Tuesday", "¿y el jueves que viene?").
const DAY_GLUE =
  /\b(?:o|y|u|or|and|on|the|el|la|los|las|de|del|a|al|que|viene|next|this|este|esta|then|entonces|mejor|better|maybe|quizas)\b/g;

// A message that is only day names ("¿lunes o martes?") asks about those days.
function onlyDays(text: string): boolean {
  const rest = text
    .replace(WEEKDAYS_ALL, ' ')
    .replace(AFTER_TOMORROW, ' ')
    .replace(TOMORROW, ' ')
    .replace(TODAY, ' ');
  return (
    rest !== text &&
    rest.replace(DAY_GLUE, ' ').replace(/[\s\p{P}\p{S}]/gu, '') === ''
  );
}

// The days to look at for check_availability: every day the message names,
// from the earliest to the latest (at most a week), else "next week" / "this
// week" as a span. Null when none is named.
export function requestedDays(
  message: string,
  now: number,
  zone: string,
): DayRange | null {
  const days = resolvedDays(message, now, zone);
  const first = days[0];
  if (first !== undefined) {
    // At most a week from the earliest day named.
    const within = days.filter(
      (day) =>
        Date.UTC(day.year, day.month - 1, day.day) -
          Date.UTC(first.year, first.month - 1, first.day) <
        MAX_DAYS * DAY_MS,
    );
    const last = within.at(-1) ?? first;
    const spanDays =
      (Date.UTC(last.year, last.month - 1, last.day) -
        Date.UTC(first.year, first.month - 1, first.day)) /
        DAY_MS +
      1;
    return within.length > 1 && within.length < spanDays
      ? { from: first.key, to: last.key, days: within.map((day) => day.key) }
      : { from: first.key, to: last.key };
  }
  const text = fold(message);
  const { weekday } = zonedParts(now, zone);
  const span = (from: number, to: number) => ({
    from: dayAt(now, zone, from).key,
    to: dayAt(now, zone, to).key,
  });
  if (NEXT_WEEK.test(text)) return span(8 - weekday, 14 - weekday);
  if (THIS_WEEK.test(text)) return span(0, 7 - weekday);
  return null;
}

// Business software a visitor may ask about: the folded name that matches and
// the name the reply uses. Longer names first, so "SAP Business One" wins over
// "SAP".
const PRODUCTS: ReadonlyArray<readonly [string, string]> = [
  ['sap business one', 'SAP Business One'],
  ['dynamics 365', 'Dynamics 365'],
  ['sap', 'SAP'],
  ['odoo', 'Odoo'],
  ['sage', 'Sage'],
  ['netsuite', 'NetSuite'],
  ['salesforce', 'Salesforce'],
  ['zoho', 'Zoho'],
  ['quickbooks', 'QuickBooks'],
  ['navision', 'Navision'],
  ['magento', 'Magento'],
  ['bigcommerce', 'BigCommerce'],
  ['a3erp', 'a3ERP'],
  ['a3innuva', 'a3innuva'],
  ['contasol', 'ContaSOL'],
  ['factusol', 'FactuSOL'],
  ['holded', 'Holded'],
  ['prestashop', 'PrestaShop'],
  ['woocommerce', 'WooCommerce'],
  ['shopify', 'Shopify'],
  ['hubspot', 'HubSpot'],
  ['xero', 'Xero'],
  ['myob', 'MYOB'],
  ['pipedrive', 'Pipedrive'],
  ['airtable', 'Airtable'],
  ['stripe', 'Stripe'],
  ['lightspeed', 'Lightspeed'],
  ['mailchimp', 'Mailchimp'],
  ['klaviyo', 'Klaviyo'],
  ['zendesk', 'Zendesk'],
  ['freshdesk', 'Freshdesk'],
  ['intercom', 'Intercom'],
  ['teamleader', 'Teamleader'],
  ['squarespace', 'Squarespace'],
  ['wix', 'Wix'],
];

// The first product the message names that the official tool list does not,
// by its own display name (never the visitor's text): the reply must not claim
// it is supported. Names match as whole words, so "SAP" is not found inside
// "WhatsApp", and a longer name hides the shorter one it contains.
export function unlistedTool(message: string, list: string): string | null {
  let text = fold(message);
  const official = fold(list);
  for (const [key, name] of PRODUCTS) {
    if (!hasWord(text, key)) continue;
    if (!hasWord(official, key)) return name;
    text = text.replace(wordPattern(key, 'gu'), ' ');
  }
  return null;
}
