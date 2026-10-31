import { describe, expect, it } from 'vitest';
import { serverConfig, siteConfig } from '../site.config';

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

describe('serverConfig', () => {
  it('points Resend and Access at the local fake services', () => {
    const local = serverConfig(undefined);
    expect(local.resendBaseUrl).toBe('http://127.0.0.1:4175');
    expect(local.access?.teamDomain).toBe('http://127.0.0.1:4175');
    expect(local.leads.notifyTo).toMatch(/@example\.com$/);
  });

  it('sends production mail to Resend and notifies a real address', () => {
    const production = serverConfig('production');
    expect(new URL(production.resendBaseUrl).protocol).toBe('https:');
    expect(production.leads.notifyTo).toMatch(/^[^@\s]+@[^@\s]+$/);
    expect(production.leads.notifyTo).not.toMatch(/example\./);
  });

  it('keeps Access closed until the app exists', () => {
    const { access } = serverConfig('production');
    if (access === null) return;
    expect(new URL(access.teamDomain).protocol).toBe('https:');
    expect(new URL(access.teamDomain).hostname).toMatch(
      /\.cloudflareaccess\.com$/,
    );
    expect(access.aud).not.toBe('');
  });

  it('rejects unknown environments', () => {
    expect(() => serverConfig('staging')).toThrow('Unknown CLOUDFLARE_ENV');
  });
});
