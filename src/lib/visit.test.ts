import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { currentVisit } from '@/lib/visit';
import {
  navigationEntry,
  setLocation,
  setReferrer,
} from '../../test/navigation';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('currentVisit', () => {
  beforeEach(() => {
    setLocation('/services/ai-automation?x=1');
    setReferrer('https://example.org/a');
  });

  it('takes the landing page from the navigation entry, so UTMs survive client navigation', () => {
    navigationEntry('http://localhost:4173/?utm_source=news&gclid=g1#top');
    expect(currentVisit()).toEqual({
      landing: '/?utm_source=news&gclid=g1',
      referrer: 'https://example.org/a',
      page: '/services/ai-automation',
    });
  });

  it('falls back to the current location without a navigation entry', () => {
    navigationEntry(null);
    expect(currentVisit().landing).toBe('/services/ai-automation?x=1');
  });

  it('falls back when the entry name is not a URL', () => {
    navigationEntry('not a url');
    expect(currentVisit().landing).toBe('/services/ai-automation?x=1');
  });

  it('clips long values so the server schema still accepts them', () => {
    navigationEntry(`http://localhost:4173/?q=${'a'.repeat(3000)}`);
    expect(currentVisit().landing).toHaveLength(2048);
  });

  it('drops a protocol-relative landing path', () => {
    navigationEntry('http://localhost:4173//evil.example/x');
    expect(currentVisit().landing).toBe('');
  });
});
