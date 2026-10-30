import { describe, expect, it } from 'vitest';
import type { Price, ServiceId } from '@/content/types';
import { type Locale, locales } from '@/lib/i18n';
import {
  formatMoney,
  formatNumber,
  formatPrice,
  formatPriceSummary,
} from '@/lib/money';
import { CURRENCY, SERVICES } from '../../test/page-content';

const NBSP = '\u00A0';
const DASH = '\u2013';

describe('formatMoney', () => {
  it.each([
    [0, 'S$0', `0${NBSP}€`],
    [300, 'S$300', `300${NBSP}€`],
    [500, 'S$500', `500${NBSP}€`],
    [1500, 'S$1,500', `1.500${NBSP}€`],
    [3000, 'S$3,000', `3.000${NBSP}€`],
    [20000, 'S$20,000', `20.000${NBSP}€`],
    [35000, 'S$35,000', `35.000${NBSP}€`],
    [1000000, 'S$1,000,000', `1.000.000${NBSP}€`],
  ])('formats %d', (amount, en, es) => {
    expect(formatMoney('en', amount)).toBe(en);
    expect(formatMoney('es', amount)).toBe(es);
  });

  it.each([
    [0.5, 'S$0.50', `0,50${NBSP}€`],
    [12.34, 'S$12.34', `12,34${NBSP}€`],
    [1500.5, 'S$1,500.50', `1.500,50${NBSP}€`],
    [3000.99, 'S$3,000.99', `3.000,99${NBSP}€`],
  ])('keeps the decimals of %d', (amount, en, es) => {
    expect(formatMoney('en', amount)).toBe(en);
    expect(formatMoney('es', amount)).toBe(es);
  });
});

describe('formatNumber', () => {
  it.each([
    [0, '0', '0'],
    [1500, '1,500', '1.500'],
    [1000000, '1,000,000', '1.000.000'],
  ])('groups %d', (amount, en, es) => {
    expect(formatNumber('en', amount)).toBe(en);
    expect(formatNumber('es', amount)).toBe(es);
  });
});

const SUMMARIES: ReadonlyArray<readonly [ServiceId, string, string]> = [
  ['diagnostic', 'S$3,000', `1.500${NBSP}€`],
  ['integration', 'from S$8,000', `desde 4.000${NBSP}€`],
  ['agent', `S$15,000${DASH}35,000`, `8.000${DASH}20.000${NBSP}€`],
  ['web', 'from S$12,000', `desde 6.000${NBSP}€`],
  [
    'training',
    'Workshop from S$2,500 · Mentoring S$1,200/month',
    `Taller desde 1.200${NBSP}€ · Mentoría 600${NBSP}€/mes`,
  ],
  [
    'maintenance',
    'S$500 / 1,200 / 2,500 per month',
    `300 / 750 / 1.500${NBSP}€ al mes`,
  ],
  ['growth', 'from S$1,500/month', `desde 800${NBSP}€/mes`],
];

describe('formatPriceSummary', () => {
  it.each(SUMMARIES)('%s matches the brief', (id, en, es) => {
    expect(formatPriceSummary('en', SERVICES.en[id].prices)).toBe(en);
    expect(formatPriceSummary('es', SERVICES.es[id].prices)).toBe(es);
  });

  it('uses the tiers rule only for same-unit exact prices', () => {
    const mixed: readonly [Price, ...Price[]] = [
      { id: 'a', min: 100, unit: 'month', currency: 'SGD' },
      { id: 'b', min: 200, unit: 'one-off', currency: 'SGD' },
    ];
    expect(formatPriceSummary('en', mixed)).toBe('S$100/month · S$200');
  });
});

describe.each(locales)('formatPrice (%s)', (locale: Locale) => {
  const rows = Object.values(SERVICES[locale]).flatMap(
    (service) => service.prices,
  );

  it('covers every price row of the ladder', () => {
    expect(rows).toHaveLength(10);
  });

  it.each(rows.map((row) => [row.id, row] as const))(
    'formats %s with one currency mark',
    (_id, row) => {
      const text = formatPrice(locale, row);
      const mark = locale === 'en' ? 'S$' : '€';
      expect(text.split(mark)).toHaveLength(2);
      expect(text).toContain(formatNumber(locale, row.min));
      if (row.max !== undefined) expect(text).toContain(DASH);
    },
  );

  it('uses the locale currency on every row', () => {
    expect(rows.every((row) => row.currency === CURRENCY[locale])).toBe(true);
  });

  it('puts a no-break space before the euro sign', () => {
    const text = rows.map((row) => formatPrice(locale, row)).join('');
    expect(text.includes(`${NBSP}€`)).toBe(locale === 'es');
  });
});
