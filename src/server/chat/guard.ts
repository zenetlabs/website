import type { ModelMessage } from 'ai';
import type { ServiceId, Services } from '@/content/types';
import type { Locale } from '@/lib/i18n';
import { PUBLIC_EMAIL } from '@/lib/site';

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

const EMAIL_REPLACEMENT: Record<Locale, string> = {
  en: 'your email',
  es: 'tu email',
};

type GuardKind = 'price' | 'link' | 'email' | 'leak';

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
function fold(text: string): string {
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

function isLeak(sentence: string): boolean {
  const probe = fold(sentence);
  return (
    probe.includes(fold(CANARY)) ||
    Object.values(RULES_PHRASE).some((phrase) => probe.includes(fold(phrase)))
  );
}

function isForeign(address: string): boolean {
  return address.toLowerCase() !== PUBLIC_EMAIL;
}

// Splits the sentence from its trailing whitespace so a replacement keeps the layout.
function trailing(sentence: string): string {
  return /\s*$/.exec(sentence)?.[0] ?? '';
}

type Guarded = { text: string; guard: GuardKind | null };

// `previous` is what the visitor already saw just before this sentence, so a
// currency sign at the end of it still counts for the number that starts this one.
export function guardSentence(
  sentence: string,
  {
    locale,
    allowed,
    previous = '',
  }: { locale: Locale; allowed: Allowed; previous?: string },
): Guarded {
  const clean = stripMarkup(normalise(sentence));
  const tail = trailing(clean);
  if (isLeak(clean)) {
    return { text: `${REFUSAL[locale]}${tail}`, guard: 'leak' };
  }
  const before = normalise(previous).slice(-PREVIOUS_CHARS);
  if (priceViolation(clean, before, locale, allowed)) {
    return { text: `${PRICE_FALLBACK[locale]}${tail}`, guard: 'price' };
  }
  const kept: string[] = [];
  const foreignEmail = (clean.match(EMAIL) ?? []).some(isForeign);
  const masked = clean.replace(EMAIL, (address) => {
    if (isForeign(address)) return EMAIL_REPLACEMENT[locale];
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
