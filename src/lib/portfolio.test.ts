import { describe, expect, it } from 'vitest';
import { PORTFOLIO, portfolioOf } from '@/lib/portfolio';

describe('portfolioOf', () => {
  it('finds every company by its key', () => {
    for (const company of PORTFOLIO) {
      expect(portfolioOf(company.key)).toBe(company);
    }
  });
});
