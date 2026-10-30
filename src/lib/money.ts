import type { Currency, Price } from '@/content/types';
import type { Locale } from '@/lib/i18n';

type Style = { tag: string; currency: Currency; symbol?: string };

const STYLE: Record<Locale, Style> = {
  en: { tag: 'en-US', currency: 'SGD', symbol: 'S$' },
  es: { tag: 'es-ES', currency: 'EUR' },
};

const moneyFormats: Partial<Record<string, Intl.NumberFormat>> = {};
const numberFormats: Partial<Record<Locale, Intl.NumberFormat>> = {};

function moneyFormat(locale: Locale, whole: boolean): Intl.NumberFormat {
  const key = `${locale}:${whole}`;
  const { tag, currency } = STYLE[locale];
  moneyFormats[key] ??= new Intl.NumberFormat(tag, {
    style: 'currency',
    currency,
    currencyDisplay: 'narrowSymbol',
    useGrouping: 'always',
    ...(whole ? { maximumFractionDigits: 0 } : {}),
  });
  return moneyFormats[key];
}

export function formatMoney(locale: Locale, amount: number): string {
  const { symbol } = STYLE[locale];
  return moneyFormat(locale, Number.isInteger(amount))
    .formatToParts(amount)
    .map((part) =>
      part.type === 'currency' && symbol !== undefined ? symbol : part.value,
    )
    .join('');
}

export function formatNumber(locale: Locale, amount: number): string {
  numberFormats[locale] ??= new Intl.NumberFormat(STYLE[locale].tag, {
    useGrouping: 'always',
  });
  return numberFormats[locale].format(amount);
}

const RANGE = '–';

const WORDS: Record<Locale, { from: string; month: string; perMonth: string }> =
  {
    en: { from: 'from ', month: '/month', perMonth: ' per month' },
    es: { from: 'desde ', month: '/mes', perMonth: ' al mes' },
  };

function formatAmount(locale: Locale, price: Price): string {
  const { min, max } = price;
  if (max === undefined) return formatMoney(locale, min);
  return locale === 'en'
    ? `${formatMoney(locale, min)}${RANGE}${formatNumber(locale, max)}`
    : `${formatNumber(locale, min)}${RANGE}${formatMoney(locale, max)}`;
}

export function formatPrice(locale: Locale, price: Price): string {
  const words = WORDS[locale];
  const lead = price.qualifier === 'from' ? words.from : '';
  const tail = price.unit === 'month' ? words.month : '';
  return `${lead}${formatAmount(locale, price)}${tail}`;
}

function isTier(price: Price, first: Price): boolean {
  return (
    price.unit === first.unit &&
    price.qualifier === undefined &&
    price.max === undefined
  );
}

function formatTiers(
  locale: Locale,
  prices: readonly [Price, ...Price[]],
): string {
  const unit = prices[0].unit === 'month' ? WORDS[locale].perMonth : '';
  const edge = locale === 'en' ? 0 : prices.length - 1;
  const amounts = prices.map((price, index) =>
    index === edge
      ? formatMoney(locale, price.min)
      : formatNumber(locale, price.min),
  );
  return `${amounts.join(' / ')}${unit}`;
}

export function formatPriceSummary(
  locale: Locale,
  prices: readonly [Price, ...Price[]],
): string {
  const [first, ...rest] = prices;
  if (rest.length === 0) return formatPrice(locale, first);
  if (prices.every((price) => isTier(price, first))) {
    return formatTiers(locale, prices);
  }
  return prices
    .map((price) =>
      price.label
        ? `${price.label} ${formatPrice(locale, price)}`
        : formatPrice(locale, price),
    )
    .join(' · ');
}
