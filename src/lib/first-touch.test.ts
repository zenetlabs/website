import { afterEach, describe, expect, it } from 'vitest';
import {
  captureFirstTouch,
  clearFirstTouch,
  FIRST_TOUCH_KEY,
  FIRST_TOUCH_MAX_AGE_MS,
  readFirstTouch,
} from '@/lib/first-touch';

const NOW = Date.UTC(2026, 10, 1);
const ORIGIN = 'https://zenetlabs.com';
const visit = (referrer: string, landing = '/pricing?utm_source=news') => ({
  landing,
  referrer,
  page: '/pricing',
});

afterEach(() => {
  localStorage.clear();
});

describe('captureFirstTouch', () => {
  it('writes on an empty referrer', () => {
    captureFirstTouch(NOW, visit(''), ORIGIN);
    expect(readFirstTouch(NOW)).toEqual({
      landing: '/pricing?utm_source=news',
      referrer: '',
      at: NOW,
    });
  });

  it('writes on a cross-origin referrer', () => {
    captureFirstTouch(NOW, visit('https://news.example/post'), ORIGIN);
    expect(readFirstTouch(NOW)?.referrer).toBe('https://news.example/post');
  });

  it('does not write on a same-origin referrer', () => {
    captureFirstTouch(NOW, visit('https://zenetlabs.com/about'), ORIGIN);
    expect(readFirstTouch(NOW)).toBeNull();
  });

  it('never overwrites a record younger than 90 days', () => {
    captureFirstTouch(NOW, visit('', '/first'), ORIGIN);
    captureFirstTouch(NOW + 1000, visit('', '/second'), ORIGIN);
    expect(readFirstTouch(NOW + 1000)?.landing).toBe('/first');
  });

  it('overwrites an expired record', () => {
    captureFirstTouch(NOW, visit('', '/first'), ORIGIN);
    const later = NOW + FIRST_TOUCH_MAX_AGE_MS + 1;
    captureFirstTouch(later, visit('', '/second'), ORIGIN);
    expect(readFirstTouch(later)?.landing).toBe('/second');
  });
});

describe('readFirstTouch', () => {
  it('drops an expired record', () => {
    captureFirstTouch(NOW, visit(''), ORIGIN);
    expect(readFirstTouch(NOW + FIRST_TOUCH_MAX_AGE_MS + 1)).toBeNull();
    expect(localStorage.getItem(FIRST_TOUCH_KEY)).toBeNull();
  });

  it.each([
    'not json',
    '{}',
    JSON.stringify({ landing: 'https://evil.example/', referrer: '', at: 1 }),
    JSON.stringify({ landing: '/x', referrer: 3, at: 1 }),
    JSON.stringify({
      landing: '/x',
      referrer: 'https://a.example/\nBcc: x',
      at: 1,
    }),
    JSON.stringify({ landing: '/x\r\ny', referrer: '', at: 1 }),
    JSON.stringify({ landing: '/x', referrer: 'a'.repeat(2049), at: 1 }),
    JSON.stringify({ landing: `/${'a'.repeat(2048)}`, referrer: '', at: 1 }),
  ])('rejects the malformed record %s', (raw) => {
    localStorage.setItem(FIRST_TOUCH_KEY, raw);
    expect(readFirstTouch(NOW)).toBeNull();
  });

  it('clears on request', () => {
    captureFirstTouch(NOW, visit(''), ORIGIN);
    clearFirstTouch();
    expect(readFirstTouch(NOW)).toBeNull();
  });
});
