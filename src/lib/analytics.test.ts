import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ACCEPT_ALL,
  CONSENT_KEY,
  REJECT_ALL,
  saveConsent,
} from '@/lib/consent';
import { FIRST_TOUCH_KEY } from '@/lib/first-touch';
import {
  navigationEntry,
  setLocation,
  setReferrer,
} from '../../test/navigation';

const NOW = Date.UTC(2026, 10, 1);
const ID = 'G-TEST1234';
const GRANTED = {
  ad_storage: 'granted',
  ad_user_data: 'granted',
  ad_personalization: 'granted',
  analytics_storage: 'granted',
};
const ANALYTICS_ONLY = {
  ad_storage: 'denied',
  ad_user_data: 'denied',
  ad_personalization: 'denied',
  analytics_storage: 'granted',
};
const DENIED = {
  ad_storage: 'denied',
  ad_user_data: 'denied',
  ad_personalization: 'denied',
  analytics_storage: 'denied',
};

let calls: unknown[][];
let appended: HTMLScriptElement[];

function installGtag() {
  calls = [];
  window.gtag = (...args: unknown[]) => {
    calls.push(args);
  };
}

async function load() {
  vi.resetModules();
  return import('@/lib/analytics');
}

function commands() {
  return calls.map(([command, arg]) => [command, arg]);
}

beforeEach(() => {
  installGtag();
  appended = [];
  vi.spyOn(document.head, 'appendChild').mockImplementation((node) => {
    if (node instanceof HTMLScriptElement) appended.push(node);
    return node;
  });
  setLocation('/');
  setReferrer('');
  navigationEntry(null);
});

afterEach(() => {
  window.gtag = undefined;
  window.zenetTracking = undefined;
  Reflect.deleteProperty(window, `ga-disable-${ID}`);
  localStorage.clear();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('consentSignals', () => {
  it.each([
    [{ analytics: false, marketing: false }, DENIED],
    [{ analytics: true, marketing: false }, ANALYTICS_ONLY],
    [
      { analytics: false, marketing: true },
      {
        ...DENIED,
        ad_storage: 'granted',
        ad_user_data: 'granted',
        ad_personalization: 'granted',
      },
    ],
    [{ analytics: true, marketing: true }, GRANTED],
  ])('maps %j', async (choice, expected) => {
    const { consentSignals } = await load();
    expect(consentSignals(choice)).toEqual(expected);
  });
});

describe('startAnalytics', () => {
  it('does nothing without a stored choice', async () => {
    const { startAnalytics } = await load();
    startAnalytics(ID, NOW);
    expect(calls).toEqual([]);
    expect(appended).toEqual([]);
  });

  it('drops an expired choice', async () => {
    saveConsent(ACCEPT_ALL, NOW);
    const { startAnalytics } = await load();
    startAnalytics(ID, NOW + 400 * 86_400_000);
    expect(localStorage.getItem(CONSENT_KEY)).toBeNull();
    expect(calls).toEqual([]);
  });

  it('queues the update, js and config, then loads gtag.js', async () => {
    saveConsent({ analytics: true, marketing: false }, NOW);
    const { startAnalytics } = await load();
    startAnalytics(ID, NOW);
    expect(commands()).toEqual([
      ['consent', 'update'],
      ['js', expect.any(Date)],
      ['config', ID],
    ]);
    expect(calls[0]?.[2]).toEqual(ANALYTICS_ONLY);
    expect(calls[2]?.[2]).toEqual({ cookie_expires: 34_128_000 });
    expect(appended).toHaveLength(1);
    expect(appended[0]?.src).toBe(
      `https://www.googletagmanager.com/gtag/js?id=${ID}`,
    );
    expect(appended[0]?.async).toBe(true);
    expect(window.zenetTracking).toBe(true);
  });

  it('sends pricing_view only on the pricing page', async () => {
    saveConsent({ analytics: true, marketing: false }, NOW);
    setLocation('/es/precios');
    const { startAnalytics } = await load();
    startAnalytics(ID, NOW);
    expect(calls.some((call) => call[1] === 'pricing_view')).toBe(true);

    installGtag();
    setLocation('/');
    const fresh = await load();
    fresh.startAnalytics(ID, NOW);
    expect(calls.some((call) => call[1] === 'pricing_view')).toBe(false);
  });

  it('sends a denied update and loads nothing after a rejection', async () => {
    saveConsent(REJECT_ALL, NOW);
    const { startAnalytics } = await load();
    startAnalytics(ID, NOW);
    expect(commands()).toEqual([['consent', 'update']]);
    expect(calls[0]?.[2]).toEqual(DENIED);
    expect(appended).toEqual([]);
  });

  it('with marketing only, loads no tag but captures the first touch', async () => {
    saveConsent({ analytics: false, marketing: true }, NOW);
    const { startAnalytics } = await load();
    startAnalytics(ID, NOW);
    expect(calls.map((call) => call[0])).toEqual(['consent']);
    expect(appended).toEqual([]);
    expect(localStorage.getItem(FIRST_TOUCH_KEY)).not.toBeNull();
  });

  it('clears a stale first touch when there is no choice', async () => {
    localStorage.setItem(
      FIRST_TOUCH_KEY,
      JSON.stringify({ landing: '/', referrer: '', at: NOW }),
    );
    const { startAnalytics } = await load();
    startAnalytics(ID, NOW);
    expect(localStorage.getItem(FIRST_TOUCH_KEY)).toBeNull();
  });
});

describe('applyConsent', () => {
  it('turns analytics off on the same page: flag, denied update, cookie deletion', async () => {
    const deleted: unknown[] = [];
    vi.stubGlobal('cookieStore', {
      getAll: async () => [
        { name: '_ga' },
        { name: '_ga_TEST' },
        { name: 'other' },
      ],
      delete: async (options: unknown) => {
        deleted.push(options);
      },
    });
    const { applyConsent } = await load();
    applyConsent(ID, REJECT_ALL, NOW);
    expect(window[`ga-disable-${ID}`]).toBe(true);
    expect(window.zenetTracking).toBe(false);
    expect(calls[0]?.[2]).toEqual(DENIED);
    await vi.waitFor(() => expect(deleted.length).toBeGreaterThanOrEqual(2));
    const names = deleted.map((options) =>
      typeof options === 'object' && options !== null && 'name' in options
        ? options.name
        : undefined,
    );
    expect(names).toContain('_ga');
    expect(names).toContain('_ga_TEST');
    expect(names).not.toContain('other');
  });

  it('removes the first touch when marketing is withdrawn', async () => {
    saveConsent(ACCEPT_ALL, NOW);
    const { applyConsent } = await load();
    applyConsent(ID, ACCEPT_ALL, NOW);
    expect(localStorage.getItem(FIRST_TOUCH_KEY)).not.toBeNull();
    applyConsent(ID, { analytics: true, marketing: false }, NOW);
    expect(localStorage.getItem(FIRST_TOUCH_KEY)).toBeNull();
  });

  it('re-grants on the same page without a second script', async () => {
    vi.stubGlobal('cookieStore', {
      getAll: async () => [],
      delete: async () => {},
    });
    const { applyConsent } = await load();
    applyConsent(ID, ACCEPT_ALL, NOW);
    applyConsent(ID, REJECT_ALL, NOW);
    applyConsent(ID, ACCEPT_ALL, NOW);
    expect(window[`ga-disable-${ID}`]).toBe(false);
    expect(appended).toHaveLength(1);
    expect(calls.filter((call) => call[0] === 'js')).toHaveLength(1);
  });

  it('still switches tracking off where the Cookie Store API is missing', async () => {
    vi.stubGlobal('cookieStore', undefined);
    const { applyConsent } = await load();
    expect(() => applyConsent(ID, REJECT_ALL, NOW)).not.toThrow();
    expect(window[`ga-disable-${ID}`]).toBe(true);
    expect(window.zenetTracking).toBe(false);
    expect(calls[0]?.[2]).toEqual(DENIED);
  });

  it('deletes cookies on every denied update, even without an earlier grant', async () => {
    const deleted: string[] = [];
    vi.stubGlobal('cookieStore', {
      getAll: async () => [{ name: '_ga' }, { name: '_gcl_aw' }],
      delete: async (options: { name: string }) => {
        deleted.push(options.name);
      },
    });
    const { applyConsent } = await load();
    applyConsent(ID, REJECT_ALL, NOW);
    await vi.waitFor(() => expect(deleted).toContain('_gcl_aw'));
    expect(deleted).toContain('_ga');
    expect(window[`ga-disable-${ID}`]).toBe(true);
  });

  it('still captures the first touch when gtag is missing', async () => {
    window.gtag = undefined;
    const { applyConsent } = await load();
    applyConsent(ID, ACCEPT_ALL, NOW);
    expect(localStorage.getItem(FIRST_TOUCH_KEY)).not.toBeNull();
    expect(appended).toEqual([]);
  });
});

describe('another tab', () => {
  it('withdrawing there switches tracking off here and deletes the cookies', async () => {
    const deleted: string[] = [];
    vi.stubGlobal('cookieStore', {
      getAll: async () => [{ name: '_ga' }],
      delete: async (options: { name: string }) => {
        deleted.push(options.name);
      },
    });
    saveConsent(ACCEPT_ALL, NOW);
    const { startAnalytics } = await load();
    startAnalytics(ID, NOW);
    expect(window.zenetTracking).toBe(true);

    saveConsent(REJECT_ALL, NOW + 1);
    window.dispatchEvent(new StorageEvent('storage', { key: CONSENT_KEY }));
    expect(window.zenetTracking).toBe(false);
    expect(window[`ga-disable-${ID}`]).toBe(true);
    expect(calls.filter((call) => call[1] === 'update').at(-1)?.[2]).toEqual(
      DENIED,
    );
    await vi.waitFor(() => expect(deleted).toContain('_ga'));
  });

  it('removing the record there is treated as a withdrawal', async () => {
    saveConsent(ACCEPT_ALL, NOW);
    const { startAnalytics } = await load();
    startAnalytics(ID, NOW);
    localStorage.removeItem(CONSENT_KEY);
    window.dispatchEvent(new StorageEvent('storage', { key: CONSENT_KEY }));
    expect(window.zenetTracking).toBe(false);
  });

  it('ignores storage events for other keys', async () => {
    saveConsent(ACCEPT_ALL, NOW);
    const { startAnalytics } = await load();
    startAnalytics(ID, NOW);
    const before = calls.length;
    window.dispatchEvent(
      new StorageEvent('storage', { key: 'something-else' }),
    );
    expect(calls).toHaveLength(before);
  });
});
