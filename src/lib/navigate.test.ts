import { describe, expect, it } from 'vitest';
import { resolveNavigation } from '@/lib/navigate';

const ON = { calculator: { published: false }, booking: { published: true } };
const OFF = { calculator: { published: false }, booking: { published: false } };

describe('resolveNavigation', () => {
  it('resolves registry pages in the visitor locale', () => {
    expect(resolveNavigation({ page: 'pricing' }, 'en', ON)).toBe('/pricing');
    expect(resolveNavigation({ page: 'pricing' }, 'es', ON)).toBe(
      '/es/precios',
    );
  });

  it('adds a section only for the home page', () => {
    expect(resolveNavigation({ page: 'home', section: 'faq' }, 'en', ON)).toBe(
      '/#faq',
    );
    expect(
      resolveNavigation({ page: 'home', section: 'cases' }, 'es', ON),
    ).toBe('/es#cases');
    expect(
      resolveNavigation({ page: 'pricing', section: 'faq' }, 'en', ON),
    ).toBe('/pricing');
  });

  it('refuses unpublished pages and pages missing in the locale', () => {
    expect(resolveNavigation({ page: 'book' }, 'en', OFF)).toBeNull();
    expect(resolveNavigation({ page: 'book' }, 'en', ON)).toBe('/book');
    expect(resolveNavigation({ page: 'verifactu' }, 'en', ON)).toBeNull();
    expect(resolveNavigation({ page: 'calculator' }, 'en', ON)).toBeNull();
  });
});
