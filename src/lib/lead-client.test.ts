import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { attribution, isLeadResult, submitLead } from '@/lib/lead-client';
import type { LeadRequest } from '@/lib/lead-schema';

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

function navigationEntry(name: string | null) {
  vi.spyOn(performance, 'getEntriesByType').mockReturnValue(
    name === null
      ? []
      : [
          {
            name,
            entryType: 'navigation',
            startTime: 0,
            duration: 0,
            toJSON: () => ({}),
          },
        ],
  );
}

function setLocation(path: string) {
  window.history.replaceState(null, '', path);
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('attribution', () => {
  beforeEach(() => {
    setLocation('/services/ai-automation?x=1');
    vi.spyOn(document, 'referrer', 'get').mockReturnValue(
      'https://example.org/a',
    );
  });

  it('takes the landing page from the navigation entry, so UTMs survive client navigation', () => {
    navigationEntry('http://localhost:4173/?utm_source=news&gclid=g1#top');
    expect(attribution()).toEqual({
      landing: '/?utm_source=news&gclid=g1',
      referrer: 'https://example.org/a',
      page: '/services/ai-automation',
    });
  });

  it('falls back to the current location without a navigation entry', () => {
    navigationEntry(null);
    expect(attribution().landing).toBe('/services/ai-automation?x=1');
  });

  it('falls back when the entry name is not a URL', () => {
    navigationEntry('not a url');
    expect(attribution().landing).toBe('/services/ai-automation?x=1');
  });

  it('clips long values so the server schema still accepts them', () => {
    navigationEntry(`http://localhost:4173/?q=${'a'.repeat(3000)}`);
    expect(attribution().landing).toHaveLength(2048);
  });

  it('drops a protocol-relative landing path', () => {
    navigationEntry('http://localhost:4173//evil.example/x');
    expect(attribution().landing).toBe('');
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
