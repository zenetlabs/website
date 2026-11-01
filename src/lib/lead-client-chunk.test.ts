import { afterEach, describe, expect, it, vi } from 'vitest';
import { attribution, submitLead } from '@/lib/lead-client';
import type { LeadRequest } from '@/lib/lead-schema';
import {
  navigationEntry,
  setLocation,
  setReferrer,
} from '../../test/navigation';

vi.mock('@/lib/first-touch', () => {
  throw new Error(
    'ChunkLoadError: Failed to fetch dynamically imported module',
  );
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('a chunk that fails to load', () => {
  it('still sends the lead, described by the current page load', async () => {
    vi.stubGlobal('__GA4_ID__', 'G-TEST1234');
    setLocation('/pricing?utm_source=later');
    setReferrer('https://example.com/');
    navigationEntry('http://localhost:4173/pricing?utm_source=later');
    const fetchMock = vi.fn<typeof fetch>(async () =>
      Response.json({ ok: true }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const request: LeadRequest = {
      source: 'form',
      locale: 'en',
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      message: 'We would like to automate our inbox triage.',
      consent: true,
      turnstileToken: 'token',
      website: '',
      attribution: await attribution(),
    };
    expect(await submitLead(request)).toEqual({ ok: true });

    const [, init] = fetchMock.mock.calls[0] ?? [];
    expect(JSON.parse(String(init?.body)).attribution).toEqual({
      landing: '/pricing?utm_source=later',
      referrer: 'https://example.com/',
      page: '/pricing',
    });
  });
});
