import { describe, expect, it } from 'vitest';
import { searchFaq } from '@/lib/faq-search';
import { FAQ } from '../../test/faq';

function ids(locale: 'en' | 'es', query: string, limit = 3): string[] {
  return searchFaq(FAQ[locale], query, limit).map((item) => item.id);
}

describe('searchFaq', () => {
  it('finds the timeline question for "how long"', () => {
    expect(ids('en', 'how long does a project take')[0]).toBe('timeline');
  });

  it('finds the prices question in Spanish, ignoring accents and case', () => {
    expect(ids('es', 'Cuánto cuesta')).toContain('prices');
    expect(ids('es', 'cuanto CUESTA')).toContain('prices');
  });

  it('finds Verifactu only in Spanish', () => {
    expect(ids('es', 'Verifactu')).toContain('verifactu');
    expect(ids('en', 'Verifactu')).not.toContain('verifactu');
  });

  it('matches word prefixes of at least four letters', () => {
    expect(ids('en', 'mainte')).toContain('maintenance');
    expect(ids('en', 'ma')).toEqual([]);
  });

  it('returns nothing for nonsense or stop words only', () => {
    expect(ids('en', 'xqzv wplk')).toEqual([]);
    expect(ids('en', 'the of and')).toEqual([]);
    expect(ids('en', '   ')).toEqual([]);
  });

  it('caps the result and keeps ties in content order', () => {
    const found = ids('en', 'tools', 2);
    expect(found).toHaveLength(2);
    const order = FAQ.en.map((item) => item.id);
    expect(order.indexOf(found[0] ?? '')).toBeLessThan(
      order.indexOf(found[1] ?? ''),
    );
  });

  it('is stable across calls', () => {
    expect(ids('en', 'data privacy')).toEqual(ids('en', 'data privacy'));
  });
});
