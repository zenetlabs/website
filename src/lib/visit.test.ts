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

  it('never keeps a booking link token as the landing page', () => {
    navigationEntry(
      'http://localhost:4173/book?confirm=0b3c5f4e-1111-4222-8333-444455556666.secret&outcome=taken&utm_source=mail',
    );
    expect(currentVisit().landing).toBe('/book?utm_source=mail');
    navigationEntry('http://localhost:4173/es/reservar?confirm=abc');
    expect(currentVisit().landing).toBe('/es/reservar');
  });

  it('strips the token from a same-origin referrer and keeps a foreign one whole', () => {
    navigationEntry('http://localhost:4173/');
    setReferrer(
      `${location.origin}/book?confirm=0b3c5f4e-1111-4222-8333-444455556666.secret&tz=UTC`,
    );
    expect(currentVisit().referrer).toBe(`${location.origin}/book?tz=UTC`);
    setReferrer(`${location.origin}/es/reservar?confirm=abc&outcome=booked`);
    expect(currentVisit().referrer).toBe(`${location.origin}/es/reservar`);
    setReferrer('https://example.org/a?confirm=theirs');
    expect(currentVisit().referrer).toBe(
      'https://example.org/a?confirm=theirs',
    );
    setReferrer('');
    expect(currentVisit().referrer).toBe('');
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
