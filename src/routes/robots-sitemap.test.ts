import { describe, expect, it } from 'vitest';
import { robotsTxt } from '@/lib/robots';
import { SITEMAP_XML } from '@/lib/sitemap';

describe('robotsTxt', () => {
  it('allows crawling on the canonical host and points at the sitemap', () => {
    const body = robotsTxt('zenetlabs.com');
    expect(body).toContain('Allow: /');
    expect(body).toContain('Sitemap: https://zenetlabs.com/sitemap.xml');
    expect(body).not.toContain('Disallow');
  });

  it.each([
    'rebuild-prod-zenet-web.zenetlabs.workers.dev',
    'www.zenetlabs.com',
    'localhost:4173',
  ])('disallows everything on %s', (host) => {
    const body = robotsTxt(host);
    expect(body).toContain('Disallow: /');
    expect(body).not.toContain('Sitemap');
  });
});

describe('sitemapXml', () => {
  const xml = SITEMAP_XML;

  it('lists 3 paths in 2 locales', () => {
    const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(
      (match) => match[1],
    );
    expect(locs).toEqual([
      'https://zenetlabs.com/',
      'https://zenetlabs.com/privacy-policy',
      'https://zenetlabs.com/cookies-policy',
      'https://zenetlabs.com/es',
      'https://zenetlabs.com/es/privacy-policy',
      'https://zenetlabs.com/es/cookies-policy',
    ]);
  });

  it('gives every url its alternates', () => {
    const urls = xml.split('<url>').slice(1);
    expect(urls).toHaveLength(6);
    for (const entry of urls) {
      expect(entry).toContain('hreflang="en"');
      expect(entry).toContain('hreflang="es"');
      expect(entry).toContain('hreflang="x-default"');
    }
  });

  it('is well-formed xml', () => {
    const doc = new DOMParser().parseFromString(xml, 'application/xml');
    expect(doc.getElementsByTagName('parsererror')).toHaveLength(0);
  });
});
