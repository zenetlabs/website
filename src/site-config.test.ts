import { describe, expect, it } from 'vitest';
import { siteConfig } from '../site.config';

const CLOUDFLARE_TEST_KEY = /^[123]x0+/;

describe('siteConfig', () => {
  it('uses a Turnstile test key locally', () => {
    expect(siteConfig(undefined).turnstileSiteKey).toMatch(CLOUDFLARE_TEST_KEY);
  });

  it('has real public values in production', () => {
    const production = siteConfig('production');
    expect(new URL(production.url).protocol).toBe('https:');
    expect(production.turnstileSiteKey).not.toBe('');
    expect(production.turnstileSiteKey).not.toMatch(CLOUDFLARE_TEST_KEY);
    expect(production.cfBeaconToken).not.toBe('');
  });

  it('rejects unknown environments', () => {
    expect(() => siteConfig('staging')).toThrow('Unknown CLOUDFLARE_ENV');
  });
});
