import type { Currency } from '@/content/types';
import type { Locale } from '@/lib/i18n';

type Style = { tag: string; currency: Currency; symbol?: string };

const STYLE: Record<Locale, Style> = {
  en: { tag: 'en-US', currency: 'SGD', symbol: 'S$' },
  es: { tag: 'es-ES', currency: 'EUR' },
};

function formatter(style: Style, fractionDigits?: 0): Intl.NumberFormat {
  return new Intl.NumberFormat(style.tag, {
    style: 'currency',
    currency: style.currency,
    currencyDisplay: 'narrowSymbol',
    useGrouping: 'always',
    ...(fractionDigits === 0 ? { maximumFractionDigits: 0 } : {}),
  });
}

const WHOLE: Record<Locale, Intl.NumberFormat> = {
  en: formatter(STYLE.en, 0),
  es: formatter(STYLE.es, 0),
};
const EXACT: Record<Locale, Intl.NumberFormat> = {
  en: formatter(STYLE.en),
  es: formatter(STYLE.es),
};

export function formatMoney(locale: Locale, amount: number): string {
  const { symbol } = STYLE[locale];
  const parts = (
    Number.isInteger(amount) ? WHOLE[locale] : EXACT[locale]
  ).formatToParts(amount);
  return parts
    .map((part) =>
      part.type === 'currency' && symbol !== undefined ? symbol : part.value,
    )
    .join('');
}
