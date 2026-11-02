import { describe, expect, it } from 'vitest';
import { legalMeta as en } from '@/content/en/legal-meta';
import { legalMeta as es } from '@/content/es/legal-meta';
import { legalMetaKey } from '@/lib/pages';

describe('legalMetaKey', () => {
  it('keeps the plain cookies meta while analytics is off', () => {
    expect(legalMetaKey('cookies', false)).toBe('cookies');
    expect(legalMetaKey('cookies')).toBe('cookies');
  });

  it('switches to the analytics description only for the cookies page', () => {
    expect(legalMetaKey('cookies', true)).toBe('cookiesAnalytics');
    expect(legalMetaKey('privacy', true)).toBe('privacy');
  });

  it.each([
    ['en', en, /sets no analytics/],
    ['es', es, /no usa cookies analíticas/],
  ])('no longer says it sets no analytics cookies in %s', (_l, meta, plain) => {
    expect(meta.cookies.description).toMatch(plain);
    expect(meta.cookiesAnalytics.description).not.toMatch(plain);
    expect(meta.cookiesAnalytics.description).toContain('Google Analytics');
    expect(meta.cookiesAnalytics.title).toBe(meta.cookies.title);
    expect(meta.cookiesAnalytics.description.length).toBeLessThanOrEqual(160);
  });
});
