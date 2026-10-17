import { describe, expect, it } from 'vitest';
import { redirectTarget } from '@/lib/redirects';

const ALIAS_HOSTS = [
  'www.zenetlabs.com',
  'zenettech.com',
  'www.zenettech.com',
  'zenettechnology.com',
  'www.zenettechnology.com',
  'sabatemartinez.com',
  'www.sabatemartinez.com',
];

const PATH_CASES: ReadonlyArray<readonly [string, string]> = [
  ['/', '/'],
  ['/es', '/es'],
  ['/blog', '/'],
  ['/blog/x', '/'],
  ['/es/blog/x', '/es'],
  ['/privacy', '/privacy-policy'],
  ['/es/cookies', '/es/cookies-policy'],
  ['/about-us', '/'],
  ['/en', '/'],
  ['/en/privacy-policy', '/privacy-policy'],
  ['/privacy-policy?x=1', '/privacy-policy?x=1'],
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

  it('upgrades alias hosts requested over http', () => {
    expect(redirectTarget(new URL('http://zenettech.com/es?x=1'))).toBe(
      `${SITE}/es?x=1`,
    );
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
    '/',
    '/es',
    '/privacy-policy',
    '/es/cookies-policy',
    '/sitemap.xml',
    '/enterprise',
  ])('leaves %s alone', (path) => {
    expect(redirectTarget(new URL(`${SITE}${path}`))).toBeNull();
  });

  it('maps legacy paths on https without changing the host', () => {
    expect(redirectTarget(new URL(`${SITE}/blog/x?y=1`))).toBe(`${SITE}/?y=1`);
  });
});

describe('redirectTarget on other hosts', () => {
  const origins = [
    'http://localhost:4173',
    'https://rebuild-prod-zenet-web.zenetlabs.workers.dev',
  ];

  it.each(origins)('keeps the host of %s', (origin) => {
    expect(redirectTarget(new URL(`${origin}/es/privacy-policy`))).toBeNull();
    expect(redirectTarget(new URL(`${origin}/`))).toBeNull();
  });

  it.each(origins)('maps legacy paths on %s', (origin) => {
    expect(redirectTarget(new URL(`${origin}/blog/x`))).toBe(`${origin}/`);
    expect(redirectTarget(new URL(`${origin}/es/about-us`))).toBe(
      `${origin}/es`,
    );
    expect(redirectTarget(new URL(`${origin}/privacy`))).toBe(
      `${origin}/privacy-policy`,
    );
    expect(redirectTarget(new URL(`${origin}/en/cookies-policy`))).toBe(
      `${origin}/cookies-policy`,
    );
  });
});
