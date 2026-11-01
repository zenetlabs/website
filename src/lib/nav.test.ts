import { describe, expect, it } from 'vitest';
import type { Locale } from '@/lib/i18n';
import { CTA_TARGET, ctaTarget, isCurrent, NAV, navHref } from '@/lib/nav';

describe('navHref', () => {
  it.each([
    ['en', ['/services', '/pricing', '/#cases', '/about']],
    ['es', ['/es/servicios', '/es/precios', '/es#cases', '/es/sobre-nosotros']],
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

describe('ctaTarget', () => {
  const flags = (published: boolean) => ({
    calculator: { published: false },
    booking: { published },
  });

  it.each([
    ['en', '/book'],
    ['es', '/es/reservar'],
  ] as const satisfies readonly (readonly [Locale, string])[])(
    'sends the CTA in %s to the booking page once it is published',
    (locale, expected) => {
      expect(navHref(locale, ctaTarget(flags(true)))).toBe(expected);
    },
  );

  it('falls back to the contact section while booking is off', () => {
    expect(ctaTarget(flags(false))).toEqual({
      page: 'home',
      section: 'contact',
    });
    expect(CTA_TARGET).toEqual(ctaTarget(flags(false)));
  });
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

  it('marks the services hub but not a service page', () => {
    expect(isCurrent({ page: 'services' }, 'services')).toBe(true);
    expect(isCurrent({ page: 'services' }, 'automation')).toBe(false);
  });

  it('marks nothing without a current page', () => {
    expect(isCurrent({ page: 'pricing' }, undefined)).toBe(false);
  });
});
