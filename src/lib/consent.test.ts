import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  ACCEPT_ALL,
  CONSENT_KEY,
  CONSENT_MAX_AGE_MS,
  COOKIE_CONSENT_REVISION,
  parseConsent,
  pruneConsent,
  REJECT_ALL,
  readConsent,
  saveConsent,
  useConsent,
} from '@/lib/consent';

const NOW = Date.UTC(2026, 10, 1);
const valid = (overrides: object = {}) =>
  JSON.stringify({
    analytics: true,
    marketing: false,
    revision: COOKIE_CONSENT_REVISION,
    at: NOW,
    ...overrides,
  });

afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe('parseConsent', () => {
  it('accepts a valid record', () => {
    expect(parseConsent(valid())).toEqual({
      analytics: true,
      marketing: false,
      revision: COOKIE_CONSENT_REVISION,
      at: NOW,
    });
  });

  it.each([
    ['bad JSON', 'nope'],
    ['a non-object', '3'],
    ['null', 'null'],
    ['missing fields', JSON.stringify({ analytics: true })],
    ['a wrong type', valid({ analytics: 'yes' })],
    [
      'a non-finite time',
      '{"analytics":true,"marketing":true,"revision":1,"at":null}',
    ],
    ['another revision', valid({ revision: 99 })],
  ])('rejects %s', (_label, raw) => {
    expect(parseConsent(raw)).toBeNull();
  });
});

describe('store', () => {
  it('returns the same object for the same raw string, and a new one after a write', () => {
    saveConsent(ACCEPT_ALL, NOW);
    const first = readConsent();
    expect(readConsent()).toBe(first);
    saveConsent(REJECT_ALL, NOW + 1);
    expect(readConsent()).not.toBe(first);
    expect(readConsent()).toMatchObject({ analytics: false, marketing: false });
  });

  it('returns null with no choice', () => {
    expect(readConsent()).toBeNull();
  });

  it('prunes expired records, other revisions and garbage, and keeps fresh ones', () => {
    saveConsent(ACCEPT_ALL, NOW);
    pruneConsent(NOW + CONSENT_MAX_AGE_MS - 1);
    expect(readConsent()).not.toBeNull();
    pruneConsent(NOW + CONSENT_MAX_AGE_MS + 1);
    expect(localStorage.getItem(CONSENT_KEY)).toBeNull();

    localStorage.setItem(CONSENT_KEY, valid({ revision: 7 }));
    pruneConsent(NOW);
    expect(localStorage.getItem(CONSENT_KEY)).toBeNull();
  });
});

describe('pruneConsent and the UI', () => {
  it('notifies subscribers when it removes a record, so the banner can return', () => {
    const { result } = renderHook(() => useConsent());
    act(() => {
      saveConsent(ACCEPT_ALL, NOW);
    });
    expect(result.current).not.toBeNull();
    act(() => {
      pruneConsent(NOW + CONSENT_MAX_AGE_MS + 1);
    });
    expect(result.current).toBeNull();
  });
});

describe('useConsent', () => {
  it('follows saves in the same tab and storage events from other tabs', () => {
    const { result } = renderHook(() => useConsent());
    expect(result.current).toBeNull();

    act(() => {
      saveConsent(ACCEPT_ALL, NOW);
    });
    expect(result.current).toMatchObject({ analytics: true, marketing: true });

    act(() => {
      localStorage.setItem(CONSENT_KEY, valid({ analytics: false }));
      window.dispatchEvent(new StorageEvent('storage', { key: CONSENT_KEY }));
    });
    expect(result.current).toMatchObject({ analytics: false });
  });
});
