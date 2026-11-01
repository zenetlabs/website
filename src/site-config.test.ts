import { describe, expect, it } from 'vitest';
import { serverConfig, siteConfig } from '../site.config';

const CLOUDFLARE_TEST_KEY = /^[123]x0+/;
const GA4_ID = /^G-[A-Z0-9]{4,16}$/;

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

  it('uses a format-valid dummy GA4 id locally', () => {
    expect(siteConfig(undefined).ga4Id).toMatch(GA4_ID);
  });

  it('keeps analytics off in production until an id is set', () => {
    const { ga4Id } = siteConfig('production');
    if (ga4Id !== null) expect(ga4Id).toMatch(GA4_ID);
  });

  it('publishes the calculator locally but not in production', () => {
    expect(siteConfig(undefined).calculator.published).toBe(true);
    expect(siteConfig('production').calculator.published).toBe(false);
  });

  it('publishes booking locally but not in production until the calendar exists', () => {
    expect(siteConfig(undefined).booking.published).toBe(true);
    expect(siteConfig('production').booking.published).toBe(false);
  });

  it('publishes the assistant locally but not in production until the bake-off passes', () => {
    expect(siteConfig(undefined).assistant.published).toBe(true);
    expect(siteConfig('production').assistant.published).toBe(false);
  });

  it('rejects unknown environments', () => {
    expect(() => siteConfig('staging')).toThrow('Unknown CLOUDFLARE_ENV');
  });
});

describe('serverConfig', () => {
  it('points the Google token and Calendar URLs at the fake locally, uncached', () => {
    const { booking } = serverConfig(undefined);
    expect(booking.tokenUrl).toBe('http://127.0.0.1:4175/__google/token');
    expect(booking.calendarUrl).toBe(
      'http://127.0.0.1:4175/__google/calendar/v3',
    );
    expect(booking.busyCacheMs).toBe(0);
  });

  it('calls the real Google endpoints in production, with a 60 second busy cache', () => {
    const { booking } = serverConfig('production');
    expect(booking.tokenUrl).toBe('https://oauth2.googleapis.com/token');
    expect(booking.calendarUrl).toBe('https://www.googleapis.com/calendar/v3');
    expect(booking.busyCacheMs).toBe(60_000);
  });

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

describe('assistant server config', () => {
  const REAL_MODELS = [
    '@cf/zai-org/glm-4.7-flash',
    '@cf/google/gemma-4-26b-a4b-it',
    '@cf/meta/llama-4-scout-17b-16e-instruct',
  ];

  it('uses the scripted model locally, so nothing calls Workers AI', () => {
    expect(serverConfig(undefined).assistant.model).toBe('fake');
    expect(serverConfig(undefined).assistant.aiGatewayName).toBeNull();
  });

  it('names one of the candidate models in production', () => {
    expect(REAL_MODELS).toContain(serverConfig('production').assistant.model);
  });

  it('keeps the daily budget under the Free-plan cap while no gateway or plan upgrade exists', () => {
    const { dailyNeuronBudget, aiGatewayName } =
      serverConfig('production').assistant;
    if (aiGatewayName === null) {
      expect(dailyNeuronBudget).toBeGreaterThan(0);
      expect(dailyNeuronBudget).toBeLessThanOrEqual(10_000);
    }
  });

  it('accepts only a well-formed gateway name', () => {
    const { aiGatewayName } = serverConfig('production').assistant;
    if (aiGatewayName !== null)
      expect(aiGatewayName).toMatch(/^[a-z0-9-]{1,64}$/);
  });
});
