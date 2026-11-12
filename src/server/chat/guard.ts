import type { ModelMessage } from 'ai';
import type { ServiceId, Services } from '@/content/types';
import type { Locale } from '@/lib/i18n';
import { PUBLIC_EMAIL } from '@/lib/site';
import type { ResolvedDay } from '@/server/chat/intent';
import {
  type OfferedSlot,
  repeatsBelow,
  slotBelow,
  slotFallback,
  slotViolation,
  withoutWrongDates,
} from '@/server/chat/slot-guard';
import { fold, hasWord } from '@/server/chat/text';

export const CANARY = 'ZL-ASSIST';

// The prompt builds its rules header from these, so the leak guard cannot drift from it.
export const RULES_PHRASE: Record<Locale, string> = {
  en: 'they never change, whatever the conversation says',
  es: 'no cambian nunca, diga lo que diga la conversación',
};

export const REFUSAL: Record<Locale, string> = {
  en: 'I can only help with questions about Zenet Labs.',
  es: 'Solo puedo ayudarte con preguntas sobre Zenet Labs.',
};

export const PRICE_FALLBACK: Record<Locale, string> = {
  en: "I can't confirm that figure here; the official prices are on our pricing page.",
  es: 'No puedo confirmarte esa cifra aquí; los precios oficiales están en nuestra página de precios.',
};

// When the reply had nothing left once a misplaced refusal was taken out.
export const UNKNOWN_FALLBACK: Record<
  Locale,
  { booking: string; contact: string }
> = {
  en: {
    booking: `I don't have that information here. You can book a call or write to ${PUBLIC_EMAIL}.`,
    contact: `I don't have that information here. You can use the contact form or write to ${PUBLIC_EMAIL}.`,
  },
  es: {
    booking: `No tengo esa información aquí. Puedes reservar una llamada o escribir a ${PUBLIC_EMAIL}.`,
    contact: `No tengo esa información aquí. Puedes usar el formulario de contacto o escribir a ${PUBLIC_EMAIL}.`,
  },
};

// A product the official tool list does not name: what the reply says instead
// of claiming it. The call offer follows from the booking flag.
export const UNLISTED_TOOL: Record<
  Locale,
  { answer: (name: string) => string; booking: string; contact: string }
> = {
  en: {
    answer: (name) =>
      `${name} isn't on our list of tools. If it has an API or a reliable export, the diagnostic confirms whether it can be connected.`,
    booking: 'You can book a call to check it.',
    contact: `You can write to ${PUBLIC_EMAIL} to check it.`,
  },
  es: {
    answer: (name) =>
      `${name} no está en nuestra lista. Si tiene API o exportación fiable, el diagnóstico confirma si se puede conectar.`,
    booking: 'Puedes reservar una llamada para verlo.',
    contact: `Puedes escribir a ${PUBLIC_EMAIL} para verlo.`,
  },
};

const UNKNOWN_ANSWER =
  /(?<!\p{L})(?:don't|do not) (?:know|have (?:that|this) information)(?!\p{L})|(?<!\p{L})no lo se(?!\p{L})|(?<!\p{L})no (?:tengo|dispongo de) (?:esa|esta) informacion(?!\p{L})/u;

// A reply that says it doesn't know, so it gets a way to ask a person.
export function saysUnknown(text: string): boolean {
  return UNKNOWN_ANSWER.test(fold(text).replace(/[’‘]/g, "'"));
}

const EMAIL_REPLACEMENT: Record<Locale, string> = {
  en: 'your email',
  es: 'tu email',
};

// `time` is a time with no day the visitor can see: the sentence is replaced
// but the reply goes on, since it may be office hours, not an offer.
export type GuardKind =
  | 'price'
  | 'slot'
  | 'time'
  | 'claim'
  | 'weekday'
  | 'refusal'
  | 'link'
  | 'email'
  | 'oversight'
  | 'leak';

// A guard that replaced the whole sentence: the rest of the reply is dropped,
// so nothing the model wrote around the bad claim follows the canned text.
export function replacesReply(guard: GuardKind | null): boolean {
  return (
    guard === 'price' ||
    guard === 'slot' ||
    guard === 'claim' ||
    guard === 'leak'
  );
}

// "I own the code", "somos los dueños del código": the FAQ says the client
// owns both. The thing owned must be named next to the claim.
const OWNED = `(?:the |your |all |any |this )?(?:source code|code|data|software|ip|intellectual property)`;
const OWNERSHIP_CLAIM = [
  new RegExp(
    String.raw`\b(?:i|we|zenet(?: labs)?) (?:own|owns|retain (?:ownership of|the rights to)) ${OWNED}\b`,
  ),
  /\b(?:code|data|software|ip) (?:belongs?|belonging) to (?:us|me|zenet)\b/,
  /\b(?:code|data|software) (?:is|are|remains?|stays?) (?:ours|mine)\b/,
  /\b(?:somos|soy) (?:los |el |la )?(?:duen[oa]s?|propietari[oa]s?) (?:del|de los|de la|de tu|de tus) (?:codigo|datos|software)\b/,
  /\b(?:codigo|datos|software) (?:nos|me) pertenecen?\b/,
  /\b(?:codigo|datos|software) (?:es|son|sigue siendo|siguen siendo|queda|quedan) (?:nuestr[oa]s?|mi[oa]s?)\b/,
];

const SUPPORT_CLAIM =
  /(?<!\p{L})(?:yes|we (?:work|integrate|connect)|we can (?:connect|integrate)|we support|trabajamos|conectamos|integramos)(?!\p{L})/u;
// Folded, "sí" (yes) would read as "si" (if), so it is read with its accent.
const SI = /(?<!\p{L})sí(?!\p{L})/u;
const DENIAL =
  /(?<!\p{L})(?:no|not|isn't|is not|never|nunca)(?!\p{L})|n't(?!\p{L})/u;

function denies(sentence: string): boolean {
  return DENIAL.test(fold(sentence).replace(/[’‘]/g, "'"));
}

// "Sí, trabajamos con SAP Business One": a product off the list, claimed.
function claimsSupport(sentence: string, name: string): boolean {
  const text = fold(sentence);
  const claim = SUPPORT_CLAIM.test(text) || SI.test(sentence.toLowerCase());
  return hasWord(text, fold(name)) && claim && !denies(sentence);
}

function claimsOwnership(sentence: string): boolean {
  const text = fold(sentence);
  return (
    OWNERSHIP_CLAIM.some((pattern) => pattern.test(text)) && !denies(sentence)
  );
}

const REFUSAL_LINES = Object.values(REFUSAL).map(
  (line) => new RegExp(`${line.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'iu'),
);
const LEFTOVER =
  /^[\s,.;:!?¡¿-]*(?:sorry|lo siento|perdona|disculpa)?[\s,.;:!?¡¿-]*$/i;

// The refusal sentence, said where it does not belong, taken out of the
// sentence; what is left of it stands.
function withoutRefusal(sentence: string): string | null {
  for (const line of REFUSAL_LINES) {
    if (!line.test(sentence)) continue;
    const rest = sentence.replace(line, '');
    return LEFTOVER.test(rest) ? '' : rest.trimStart();
  }
  return null;
}

const LOWER_AFTER_STOP = /([!?…]\s+[¿¡"«“(]*|[.!?…]\s*[¿¡])(\p{Ll})/gu;
const LOWER_START = /^(\s*[¿¡"«“(]*)(\p{Ll})/u;

// A sentence glued to the one before it ("primero?¿te interesa") or started
// in lower case where a new sentence begins. `previous` is the text already
// shown; a new paragraph or a question before it starts a sentence. After a
// full stop only an opening ¿ or ¡ does, since "e.g. a" is not a new sentence.
export function tidySentence(sentence: string, previous: string): string {
  const spaced = sentence.replace(/([.!?…])([¿¡])/g, '$1 $2');
  const fresh =
    previous.trim() === '' ||
    /(?:[!?…]|\n)\s*$/.test(previous) ||
    (/\.\s*$/.test(previous) && /^\s*[¿¡]/.test(spaced));
  const upper = (_: string, lead: string, letter: string) =>
    `${lead}${letter.toUpperCase()}`;
  const head = fresh ? spaced.replace(LOWER_START, upper) : spaced;
  return head.replace(LOWER_AFTER_STOP, upper);
}

const MAX_SENTENCE = 400;
const TERMINATORS = new Set(['.', '!', '?', '…']);
const WHITESPACE = /\s/;

export class SentenceBuffer {
  private pending = '';

  push(delta: string): string[] {
    this.pending += delta;
    const sentences: string[] = [];
    let start = 0;
    for (let index = 0; index < this.pending.length; index += 1) {
      const char = this.pending.charAt(index);
      const next = this.pending.charAt(index + 1);
      if (char === '\n') {
        sentences.push(this.pending.slice(start, index + 1));
        start = index + 1;
      } else if (TERMINATORS.has(char) && WHITESPACE.test(next)) {
        sentences.push(this.pending.slice(start, index + 2));
        start = index + 2;
        index += 1;
      }
    }
    this.pending = this.pending.slice(start);
    if (this.pending.length > MAX_SENTENCE) {
      sentences.push(this.pending);
      this.pending = '';
    }
    return sentences;
  }

  flush(): string {
    const rest = this.pending;
    this.pending = '';
    return rest;
  }
}

type AmountCurrency = 'SGD' | 'EUR' | 'USD';
type Amount = { value: number; currency: AmountCurrency };

type Token = {
  start: number;
  end: number;
  value: number;
  currency: AmountCurrency | null;
};

const NUMBER = /(\d{1,3}(?:[.,   ]\d{3})+|\d+)(?:[.,]\d{1,2}(?!\d))?/g;
const DOLLARS = String.raw`(?:(?:us|singapore)\s+)?dollars?|d[oó]lares?(?:\s+(?:de|americanos?)(?:\s+singapur)?)?`;
const BEFORE = new RegExp(
  String.raw`(US\$|S\$|SGD|USD|EUR|\$|€|\b(?:euros?|${DOLLARS}))\s*$`,
  'iu',
);
const MULTIPLIER = /^\s?(k|mil)(?![\p{L}])/iu;
const AFTER = new RegExp(
  String.raw`^\s*(€|EUR|SGD|USD|euros?|${DOLLARS})(?![\p{L}])`,
  'iu',
);
const CONNECTOR = /^\s*(?:[\u2010-\u2015\u2212/-]|to|a|y|and|or|o)\s*$/i;
const UNIT_AFTER =
  /^\s?(?:%|\+|weeks?|days?|months?|hours?|years?|semanas?|d[ií]as?|meses|mes|horas?|a[nñ]os?|people|personas|pedidos|orders|tools|herramientas)(?![\p{L}])/iu;

function currencyOf(marker: string): AmountCurrency {
  const upper = marker.toUpperCase();
  if (upper.startsWith('US') || upper.includes('AMERICAN')) return 'USD';
  if (upper === '€' || upper.startsWith('EUR')) return 'EUR';
  return 'SGD';
}

function tokensOf(text: string, from: number): Token[] {
  const tokens: Token[] = [];
  for (const match of text.matchAll(NUMBER)) {
    const [whole, digits = ''] = match;
    const index = match.index ?? 0;
    if (index < from) continue;
    let start = index;
    let end = index + whole.length;
    let currency: AmountCurrency | null = null;
    const before = BEFORE.exec(text.slice(0, index));
    if (before?.[1] !== undefined) {
      currency = currencyOf(before[1]);
      start = index - before[0].length;
    }
    let value = Number(digits.replace(/[.,   ]/g, ''));
    const multiplier = MULTIPLIER.exec(text.slice(end));
    if (multiplier) {
      value *= 1000;
      end += multiplier[0].length;
    }
    const after = AFTER.exec(text.slice(end));
    if (after?.[1] !== undefined) {
      currency ??= currencyOf(after[1]);
      end += after[0].length;
    }
    tokens.push({ start, end, value, currency });
  }
  return tokens;
}

// Every money amount in the text. A number is money when a currency marker sits
// right before or after it; a chain of numbers joined only by a range or list
// connector shares one marker ("S$15,000–35,000", "300 / 750 / 1.500 €").
// `from` skips numbers before that offset: text carried in only so a currency
// marker at the end of the previous sentence is seen.
export function findAmounts(text: string, from = 0): Amount[] {
  const tokens = tokensOf(text, from);
  const amounts: Amount[] = [];
  let group: Token[] = [];
  const close = () => {
    const shared = group.find((token) => token.currency !== null)?.currency;
    for (const token of group) {
      const currency = token.currency ?? shared ?? null;
      const inherited = token.currency === null;
      if (
        currency !== null &&
        !(inherited && UNIT_AFTER.test(text.slice(token.end)))
      ) {
        amounts.push({ value: token.value, currency });
      }
    }
    group = [];
  };
  for (const token of tokens) {
    const last = group.at(-1);
    if (last && !CONNECTOR.test(text.slice(last.end, token.start))) close();
    group.push(token);
  }
  close();
  return amounts;
}

const LOCALE_CURRENCY: Record<Locale, AmountCurrency> = {
  en: 'SGD',
  es: 'EUR',
};

const EMAIL = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g;
const URL_LIKE = /(?:https?:\/\/|www\.)\S+/gi;
// Any dotted name that ends in a TLD-shaped word. These names are not links
// and the allowlist keeps them readable.
const BARE_DOMAIN =
  /\b[a-z0-9-]+(?:\.[a-z0-9-]+)*\.(?:[a-z]{2,}|xn--[a-z0-9-]+)\b(?:\/\S*)?/gi;
const NOT_A_LINK = new Set(['node.js', 'next.js', 'vue.js', 'react.js']);
const MASK = /\ue000(\d+)\ue001/g;
const PREVIOUS_CHARS = 16;

type Allowed = ReadonlySet<number>;

// What is checked and what is shown: compatibility-normalised (full-width
// digits, non-breaking spaces and the like become plain), invisible format
// characters (zero-width joiners, bidi marks, soft hyphens) removed.
function normalise(text: string): string {
  return text.normalize('NFKC').replace(/\p{Cf}/gu, '');
}

// Markup goes first, so nothing can be hidden from a check by wrapping it in it.
function stripMarkup(text: string): string {
  return text
    .replace(/^(\s*)#+\s*/gm, '$1')
    .replace(/^(\s*)[*-] /gm, '$1- ')
    .replace(/\*+|~~|`+/g, '')
    .replace(/__|(?<!\w)_|_(?!\w)/g, '');
}

// The unicode hyphens and minus signs all read as "-" for a check, never in the output.
function foldDashes(text: string): string {
  return text.replace(/[\u2010-\u2015\u2212]/g, '-').toLowerCase();
}

function priceViolation(
  sentence: string,
  before: string,
  locale: Locale,
  allowed: Allowed,
) {
  return findAmounts(before + sentence, before.length).some(
    ({ value, currency }) =>
      currency !== LOCALE_CURRENCY[locale] || !allowed.has(value),
  );
}

function stripLinks(text: string): string {
  return text
    .replace(URL_LIKE, '')
    .replace(BARE_DOMAIN, (name) =>
      NOT_A_LINK.has(name.toLowerCase()) ? name : '',
    )
    .replace(/ {2,}/g, ' ')
    .replace(/ +([.,;:!?])/g, '$1');
}

const LEAK_MARKERS = new RegExp(
  [CANARY, ...Object.values(RULES_PHRASE)]
    .map((marker) => foldDashes(marker).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('|'),
);

function isLeak(sentence: string): boolean {
  return LEAK_MARKERS.test(foldDashes(sentence));
}

function isForeign(address: string): boolean {
  return address.toLowerCase() !== PUBLIC_EMAIL;
}

// Splits the sentence from its trailing whitespace so a replacement keeps the layout.
function trailing(sentence: string): string {
  return /\s*$/.exec(sentence)?.[0] ?? '';
}

type Guarded = { text: string; guard: GuardKind | null };

// Facts the reply must not turn around, with the official text that replaces
// a sentence that does; `refusal: false` when the message was on topic, so the
// refusal sentence has no place in the reply.
type Facts = {
  ownership: string;
  // A product the visitor named that the official tool list does not.
  unlisted?: { name: string; answer: string };
};

type GuardOptions = {
  locale: Locale;
  allowed: Allowed;
  // The clock of the turn: dates are checked against it.
  now: number;
  previous?: string;
  language?: Locale;
  // The slots check_availability returned in this conversation; absent while
  // booking is dark, and the slot check waits until there are some.
  slots?: readonly OfferedSlot[];
  // The panel shows this turn's times as chips (times came back this turn and
  // no booking is proposed): a replaced time points at them, never lists any.
  chips?: boolean;
  // The days the visitor's words name, when the website worked them out.
  visitorDays?: readonly ResolvedDay[];
  facts?: Facts;
  refusal?: boolean;
  // The visitor asks whether a person checks everything: the answer is no.
  oversight?: boolean;
};

const YES_OPENER =
  /^(?:yes|yeah|yep|si|sí|claro|por supuesto|of course)(?=[\s,.:;!]|$)[,.:;!]*/i;
const NOT_EVERYTHING: Record<Locale, string> = {
  en: 'Not everything:',
  es: 'No todo:',
};

// `previous` is what the visitor already saw just before this sentence, so a
// currency sign at the end of it still counts for the number that starts this
// one, and a time takes its day from the last date in it. `language` is the
// reply's language (canned text); `locale` sets the currency.
export function guardSentence(
  sentence: string,
  options: GuardOptions,
): Guarded {
  const {
    locale,
    allowed,
    now,
    previous = '',
    language = locale,
    slots,
    chips = false,
    visitorDays = [],
    facts,
    refusal = true,
    oversight = false,
  } = options;
  const clean = stripMarkup(normalise(sentence));
  const tail = trailing(clean);
  if (isLeak(clean)) {
    return { text: `${REFUSAL[language]}${tail}`, guard: 'leak' };
  }
  if (!refusal) {
    const rest = withoutRefusal(clean);
    if (rest === '') return { text: '', guard: 'refusal' };
    if (rest !== null) {
      const kept = guardSentence(rest, options);
      return { text: kept.text, guard: kept.guard ?? 'refusal' };
    }
  }
  // The first sentence of an oversight answer must not say yes: routine steps
  // run unchecked, so the opener becomes "Not everything:".
  if (oversight && previous.trim() === '' && YES_OPENER.test(clean)) {
    const rest = clean.replace(YES_OPENER, '');
    const text = `${NOT_EVERYTHING[language]}${rest}`;
    const kept = guardSentence(text, { ...options, oversight: false });
    return { text: kept.text, guard: kept.guard ?? 'oversight' };
  }
  // A weekday beside a date it does not fall on is put right (any sentence,
  // booking or not); the rest is checked as usual.
  const dated = withoutWrongDates(clean, { now, language, visitorDays });
  if (dated !== null) {
    const kept = guardSentence(dated, options);
    return { text: kept.text, guard: kept.guard ?? 'weekday' };
  }
  if (facts !== undefined && claimsOwnership(clean)) {
    return { text: `${facts.ownership}${tail}`, guard: 'claim' };
  }
  if (
    facts?.unlisted !== undefined &&
    claimsSupport(clean, facts.unlisted.name)
  ) {
    return { text: `${facts.unlisted.answer}${tail}`, guard: 'claim' };
  }
  const shown = normalise(previous);
  const before = shown.slice(-PREVIOUS_CHARS);
  if (priceViolation(clean, before, locale, allowed)) {
    return { text: `${PRICE_FALLBACK[language]}${tail}`, guard: 'price' };
  }
  // Until check_availability has answered in this session there is nothing to
  // compare with, so the slot check waits for it.
  const slot =
    slots === undefined || slots.length === 0
      ? null
      : slotViolation(clean, { slots, now, previous: shown });
  if (slot !== null) {
    const text = chips
      ? slotBelow(language, shown)
      : slotFallback(language, slots ?? [], now);
    return {
      text: text === '' ? '' : `${text}${tail}`,
      guard: slot === 'date' ? 'slot' : 'time',
    };
  }
  // The model's own "the times are below" after the pointer said so: once is enough.
  if (chips && repeatsBelow(language, clean, shown)) {
    return { text: '', guard: null };
  }
  const kept: string[] = [];
  const foreignEmail = (clean.match(EMAIL) ?? []).some(isForeign);
  const masked = clean.replace(EMAIL, (address) => {
    if (isForeign(address)) return EMAIL_REPLACEMENT[language];
    kept.push(address);
    return `\ue000${kept.length - 1}\ue001`;
  });
  const unlinked = stripLinks(masked);
  const text = unlinked.replace(
    MASK,
    (_, index: string) => kept[Number(index)] ?? '',
  );
  if (foreignEmail) return { text, guard: 'email' };
  return { text, guard: unlinked === masked ? null : 'link' };
}

export const LADDER = [
  'diagnostic',
  'integration',
  'agent',
  'web',
  'training',
  'maintenance',
  'growth',
] as const satisfies readonly ServiceId[];

// Every amount the site publishes for the locale.
export function officialAmounts(services: Services): Set<number> {
  const amounts = new Set<number>();
  for (const id of LADDER) {
    for (const { min, max } of services[id].prices) {
      amounts.add(min);
      if (max !== undefined) amounts.add(max);
    }
  }
  return amounts;
}

// The amounts a tool returned: `min` and `max` fields and any price text. Other
// numbers (weeks, counts, times) are not prices and are not let through.
const NOT_PRICES = new Set(['weeks']);

export function numbersIn(value: unknown): number[] {
  if (typeof value === 'string') {
    return findAmounts(normalise(value)).map(({ value: amount }) => amount);
  }
  if (Array.isArray(value)) return value.flatMap(numbersIn);
  if (typeof value === 'object' && value !== null) {
    return Object.entries(value).flatMap(([key, entry]) => {
      if (NOT_PRICES.has(key)) return [];
      if ((key === 'min' || key === 'max') && typeof entry === 'number') {
        return [entry];
      }
      return numbersIn(entry);
    });
  }
  return [];
}

export function toolNumbers(messages: readonly ModelMessage[]): number[] {
  return messages.flatMap((message) =>
    message.role === 'tool'
      ? message.content.flatMap((part) =>
          part.type === 'tool-result' ? numbersIn(part.output) : [],
        )
      : [],
  );
}
