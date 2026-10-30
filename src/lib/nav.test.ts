import { describe, expect, it } from 'vitest';
import type { Locale } from '@/lib/i18n';
import { CTA_TARGET, isCurrent, NAV, navHref } from '@/lib/nav';

describe('navHref', () => {
  it.each([
    ['en', ['/#services', '/pricing', '/#cases', '/about']],
    ['es', ['/es#services', '/es/precios', '/es#cases', '/es/sobre-nosotros']],
  ] as const)('resolves the header targets in %s', (locale, expected) => {
    expect(NAV.map((item) => navHref(locale, item.target))).toEqual(expected);
  });

  it.each([
    ['en', '/#contact'],
    ['es', '/es#contact'],
  ] as const satisfies readonly (readonly [Locale, string])[])(
    'points the CTA in %s at the contact section',
    (locale, expected) => {
      expect(navHref(locale, CTA_TARGET)).toBe(expected);
    },
  );
});

describe('isCurrent', () => {
  it('marks a page target on its own page', () => {
    expect(isCurrent({ page: 'pricing' }, 'pricing')).toBe(true);
    expect(isCurrent({ page: 'pricing' }, 'about')).toBe(false);
  });

  it('never marks a section target', () => {
    expect(isCurrent({ page: 'home', section: 'services' }, 'home')).toBe(
      false,
    );
  });

  it('marks nothing without a current page', () => {
    expect(isCurrent({ page: 'pricing' }, undefined)).toBe(false);
  });
});
