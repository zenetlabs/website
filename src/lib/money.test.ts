import { describe, expect, it } from 'vitest';
import { formatMoney } from '@/lib/money';

describe('formatMoney', () => {
  it.each([
    [0, 'S$0', '0 €'],
    [300, 'S$300', '300 €'],
    [500, 'S$500', '500 €'],
    [1500, 'S$1,500', '1.500 €'],
    [3000, 'S$3,000', '3.000 €'],
    [20000, 'S$20,000', '20.000 €'],
    [35000, 'S$35,000', '35.000 €'],
    [1000000, 'S$1,000,000', '1.000.000 €'],
  ])('formats %d', (amount, en, es) => {
    expect(formatMoney('en', amount)).toBe(en);
    expect(formatMoney('es', amount)).toBe(es);
  });

  it.each([
    [0.5, 'S$0.50', '0,50 €'],
    [12.34, 'S$12.34', '12,34 €'],
    [1500.5, 'S$1,500.50', '1.500,50 €'],
    [3000.99, 'S$3,000.99', '3.000,99 €'],
  ])('keeps the decimals of %d', (amount, en, es) => {
    expect(formatMoney('en', amount)).toBe(en);
    expect(formatMoney('es', amount)).toBe(es);
  });
});
