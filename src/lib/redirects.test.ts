import { describe, expect, it } from 'vitest';
import { locales } from '@/lib/i18n';
import { hasLocale, PAGE_IDS, pagePath, slugForms } from '@/lib/page-registry';
import { redirectTarget } from '@/lib/redirects';
import { PATH_CASES } from '../../test/redirect-cases';

const ALIAS_HOSTS = [
  'www.zenetlabs.com',
  'zenettech.com',
  'www.zenettech.com',
  'zenettechnology.com',
  'www.zenettechnology.com',
  'sabatemartinez.com',
  'www.sabatemartinez.com',
];

const CANONICAL = [
  '/',
  '/pricing',
  '/about',
  '/privacy',
  '/cookies',
  '/es',
  '/es/precios',
  '/es/sobre-nosotros',
  '/es/privacidad',
  '/es/cookies',
  '/es/aviso-legal',
];

const SITE = 'https://zenetlabs.com';

describe('redirectTarget on alias hosts', () => {
  const cases = ALIAS_HOSTS.flatMap((host) =>
    PATH_CASES.map(([from, to]) => [host, from, to] as const),
  );

  it.each(cases)(
    '%s%s goes to the canonical host in one hop',
    (host, from, to) => {
      expect(redirectTarget(new URL(`https://${host}${from}`))).toBe(
        `${SITE}${to}`,
      );
    },
  );

  it.each(
    ALIAS_HOSTS.flatMap((host) =>
      CANONICAL.map((path) => [host, path] as const),
    ),
  )('%s%s goes to the same path on the canonical host', (host, path) => {
    expect(redirectTarget(new URL(`https://${host}${path}`))).toBe(
      `${SITE}${path}`,
    );
  });

  it('upgrades alias hosts requested over http', () => {
    expect(redirectTarget(new URL('http://zenettech.com/es?x=1'))).toBe(
      `${SITE}/es?x=1`,
    );
  });
});

describe('redirectTarget for single-locale pages', () => {
  const cases = PAGE_IDS.flatMap((page) =>
    locales
      .filter((locale) => !hasLocale(page, locale))
      .flatMap((missing) =>
        slugForms(page).map((form) => [page, missing, form] as const),
      ),
  );

  it('covers at least the legal notice', () => {
    expect(cases.length).toBeGreaterThan(0);
  });

  it.each(cases)(
    '%s requested in %s as %s goes to its only locale',
    (page, missing, form) => {
      const path = missing === 'en' ? form : `/${missing}${form}`;
      expect(redirectTarget(new URL(`${SITE}${path}`))).toBe(
        `${SITE}${pagePath(missing, page)}`,
      );
    },
  );

  it('keeps the query across host, protocol and slug in one hop', () => {
    expect(
      redirectTarget(new URL('http://zenettech.com/aviso-legal?x=1')),
    ).toBe(`${SITE}/es/aviso-legal?x=1`);
  });
});

describe('redirectTarget on the canonical host', () => {
  it('upgrades http to https keeping path and query', () => {
    expect(redirectTarget(new URL('http://zenetlabs.com/es'))).toBe(
      `${SITE}/es`,
    );
    expect(redirectTarget(new URL('http://zenetlabs.com/?a=b'))).toBe(
      `${SITE}/?a=b`,
    );
  });

  it.each([
    ...CANONICAL,
    '/sitemap.xml',
    '/robots.txt',
    '/llms.txt',
    '/_serverFn/x',
    '/foo',
    '/fr',
    '/fr/privacy-policy',
    '/es/foo',
    '/enterprise',
  ])('leaves %s alone', (path) => {
    expect(redirectTarget(new URL(`${SITE}${path}`))).toBeNull();
  });

  it.each([
    ['/es/', '/es'],
    ['/privacy/', '/privacy'],
    ['/sitemap.xml/', '/sitemap.xml'],
  ])('strips the trailing slash of %s', (from, to) => {
    expect(redirectTarget(new URL(`${SITE}${from}`))).toBe(`${SITE}${to}`);
  });

  it('maps legacy paths on https without changing the host', () => {
    expect(redirectTarget(new URL(`${SITE}/blog/x?y=1`))).toBe(`${SITE}/?y=1`);
  });

  it.each([
    ['http://zenettech.com/es/cookies-policy?x=1', `${SITE}/es/cookies?x=1`],
    ['https://zenettech.com/en/privacy-policy', `${SITE}/privacy`],
    ['https://www.zenetlabs.com/', `${SITE}/`],
  ])('maps %s in one hop', (from, to) => {
    expect(redirectTarget(new URL(from))).toBe(to);
  });
});

describe('redirectTarget chains', () => {
  const origins = [SITE, 'http://zenetlabs.com', 'https://zenettech.com'];
  const paths = [
    ...PATH_CASES.map(([from]) => from),
    ...CANONICAL,
    '//evil.com//',
    '/en//evil.com',
    '/en/en/en/privacy',
    '/en///en//es',
  ];

  it('every target is final', () => {
    for (const origin of origins) {
      for (const path of paths) {
        const input = `${origin}${path}`;
        const target = redirectTarget(new URL(input));
        if (target === null) continue;
        expect(
          redirectTarget(new URL(target)),
          `${input} -> ${target}`,
        ).toBeNull();
      }
    }
  });
});

describe('redirectTarget never names a foreign host', () => {
  const PATHS = [
    '//evil.com/',
    '//evil.com//',
    '/%2F%2Fevil.com/',
    '/\\evil.com/',
  ];
  const origins = [SITE, 'https://www.zenetlabs.com', 'http://zenettech.com'];

  it.each(
    origins.flatMap((origin) => PATHS.map((path) => [origin, path] as const)),
  )('%s%s', (origin, path) => {
    const result = redirectTarget(new URL(`${origin}${path}`));
    if (result === null) return;
    expect(new URL(result).host).toBe('zenetlabs.com');
  });

  it('never redirects on a host we do not own', () => {
    expect(redirectTarget(new URL('http://evil.com//'))).toBeNull();
    expect(redirectTarget(new URL('https://evil.com/blog/x'))).toBeNull();
  });

  it('collapses leading slashes into one path', () => {
    expect(redirectTarget(new URL(`${SITE}//evil.com//`))).toBe(
      `${SITE}/evil.com`,
    );
    expect(
      redirectTarget(new URL('https://www.zenetlabs.com//evil.com//')),
    ).toBe(`${SITE}/evil.com`);
  });
});

describe('redirectTarget on other hosts', () => {
  const origins = [
    'http://localhost:4173',
    'https://rebuild-prod-zenet-web.zenetlabs.workers.dev',
  ];

  it.each(origins)('keeps the host of %s', (origin) => {
    expect(redirectTarget(new URL(`${origin}/es/privacidad`))).toBeNull();
    expect(redirectTarget(new URL(`${origin}/`))).toBeNull();
  });

  it.each(origins)('maps legacy paths on %s', (origin) => {
    expect(redirectTarget(new URL(`${origin}/blog/x`))).toBe(`${origin}/`);
    expect(redirectTarget(new URL(`${origin}/es/about-us`))).toBe(
      `${origin}/es/sobre-nosotros`,
    );
    expect(redirectTarget(new URL(`${origin}/es/`))).toBe(`${origin}/es`);
    expect(redirectTarget(new URL(`${origin}/privacy-policy`))).toBe(
      `${origin}/privacy`,
    );
    expect(redirectTarget(new URL(`${origin}/en/cookies-policy`))).toBe(
      `${origin}/cookies`,
    );
  });
});
