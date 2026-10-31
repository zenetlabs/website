import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ACCEPT_ALL, REJECT_ALL, saveConsent } from '@/lib/consent';
import { captureFirstTouch } from '@/lib/first-touch';
import { attribution, isLeadResult, submitLead } from '@/lib/lead-client';
import { type LeadRequest, leadRequestSchema } from '@/lib/lead-schema';
import {
  navigationEntry,
  setLocation,
  setReferrer,
} from '../../test/navigation';

const REQUEST: LeadRequest = {
  source: 'form',
  locale: 'en',
  name: 'Ada Lovelace',
  email: 'ada@example.com',
  message: 'We would like to automate our inbox triage.',
  consent: true,
  turnstileToken: 'token',
  website: '',
  attribution: { landing: '/', referrer: '', page: '/' },
};

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  localStorage.clear();
});

describe('attribution', () => {
  const NOW = Date.UTC(2026, 10, 1);

  beforeEach(() => {
    vi.stubGlobal('__GA4_ID__', 'G-TEST1234');
    setLocation('/pricing?utm_source=later');
    setReferrer('https://example.com/');
    navigationEntry('http://localhost:4173/pricing?utm_source=later');
  });

  it('describes the current page load without marketing consent', async () => {
    saveConsent(REJECT_ALL, NOW);
    expect(await attribution(NOW)).toEqual({
      landing: '/pricing?utm_source=later',
      referrer: 'https://example.com/',
      page: '/pricing',
    });
  });

  it('keeps the first touch for later page loads once marketing is accepted', async () => {
    saveConsent(ACCEPT_ALL, NOW);
    captureFirstTouch(NOW, {
      landing: '/?utm_source=first&gclid=g1',
      referrer: 'https://news.example/',
      page: '/',
    });
    expect(await attribution(NOW + 1000)).toEqual({
      landing: '/?utm_source=first&gclid=g1',
      referrer: 'https://news.example/',
      page: '/pricing',
    });
  });

  it('ignores a stored first touch when marketing is not accepted', async () => {
    saveConsent({ analytics: true, marketing: false }, NOW);
    localStorage.setItem(
      'zenet-first-touch',
      JSON.stringify({ landing: '/old', referrer: '', at: NOW }),
    );
    expect((await attribution(NOW)).landing).toBe('/pricing?utm_source=later');
  });

  it('falls back to the page load when the first touch is older than 90 days', async () => {
    saveConsent(ACCEPT_ALL, NOW);
    localStorage.setItem(
      'zenet-first-touch',
      JSON.stringify({ landing: '/old', referrer: '', at: NOW }),
    );
    expect((await attribution(NOW + 91 * 86_400_000)).landing).toBe(
      '/pricing?utm_source=later',
    );
  });

  it('ignores any stored record when analytics is not configured', async () => {
    vi.stubGlobal('__GA4_ID__', null);
    saveConsent(ACCEPT_ALL, NOW);
    localStorage.setItem(
      'zenet-first-touch',
      JSON.stringify({ landing: '/old', referrer: '', at: NOW }),
    );
    expect((await attribution(NOW)).landing).toBe('/pricing?utm_source=later');
  });

  it('still satisfies the server schema for an oversized landing URL', async () => {
    navigationEntry(`http://localhost:4173/?q=${'a'.repeat(5000)}`);
    const parsed = leadRequestSchema.shape.attribution.safeParse(
      await attribution(NOW),
    );
    expect(parsed.success).toBe(true);
  });
});

describe('isLeadResult', () => {
  it.each([
    [{ ok: true }, true],
    [{ ok: false, error: 'rate' }, true],
    [{ ok: false, error: 'captcha' }, true],
    [{ ok: false, error: 'too-large' }, true],
    [{ ok: false, error: 'nope' }, false],
    [{ ok: false }, false],
    [{ ok: 'true' }, false],
    [{}, false],
    [null, false],
    ['ok', false],
    [[], false],
  ])('%j -> %s', (value, expected) => {
    expect(isLeadResult(value)).toBe(expected);
  });
});

describe('submitLead', () => {
  it('posts JSON to /api/lead and returns the parsed result', async () => {
    const fetchMock = vi.fn<typeof fetch>(async () =>
      Response.json({ ok: true }),
    );
    vi.stubGlobal('fetch', fetchMock);
    expect(await submitLead(REQUEST)).toEqual({ ok: true });
    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(url).toBe('/api/lead');
    expect(init?.method).toBe('POST');
    expect(new Headers(init?.headers).get('content-type')).toBe(
      'application/json',
    );
    expect(JSON.parse(String(init?.body))).toEqual(REQUEST);
  });

  it('passes a known error through, whatever the status', async () => {
    vi.stubGlobal('fetch', async () =>
      Response.json({ ok: false, error: 'rate' }, { status: 429 }),
    );
    expect(await submitLead(REQUEST)).toEqual({ ok: false, error: 'rate' });
  });

  it('maps a non-JSON 429 from the edge to rate', async () => {
    vi.stubGlobal(
      'fetch',
      async () => new Response('Too many requests', { status: 429 }),
    );
    expect(await submitLead(REQUEST)).toEqual({ ok: false, error: 'rate' });
  });

  it.each([
    ['an HTML 500', async () => new Response('<html>', { status: 500 })],
    ['an unknown shape', async () => Response.json({ hello: 1 })],
    ['a network error', async () => Promise.reject(new TypeError('offline'))],
  ])('maps %s to unavailable', async (_label, impl) => {
    vi.stubGlobal('fetch', impl);
    expect(await submitLead(REQUEST)).toEqual({
      ok: false,
      error: 'unavailable',
    });
  });
});
