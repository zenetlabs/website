import { describe, expect, it } from 'vitest';
import {
  errorName,
  internalHandlers,
  methodNotAllowed,
  privateHeaders,
  textResponse,
} from '@/server/responses';

describe('responses', () => {
  it('marks private responses no-store, noindex and locked down', () => {
    const headers = privateHeaders('text/plain');
    expect(headers.get('cache-control')).toBe('no-store');
    expect(headers.get('x-robots-tag')).toBe('noindex, nofollow');
    expect(headers.get('content-security-policy')).toContain(
      "default-src 'none'",
    );
  });

  it('builds plain-text responses with the private headers', async () => {
    const response = textResponse('Forbidden', 403);
    expect(response.status).toBe(403);
    expect(await response.text()).toBe('Forbidden');
    expect(response.headers.get('content-type')).toBe(
      'text/plain; charset=utf-8',
    );
    expect(response.headers.get('cache-control')).toBe('no-store');
  });

  it('answers 405 with Allow and an empty body', async () => {
    const response = methodNotAllowed('POST');
    expect(response.status).toBe(405);
    expect(response.headers.get('allow')).toBe('POST');
    expect(await response.text()).toBe('');
  });

  it('names errors without their message', () => {
    expect(errorName(new TypeError('ada@example.com'))).toBe('TypeError');
    expect(errorName('boom')).toBe('unknown');
  });

  it('wraps a GET handler and answers 405 to everything else', () => {
    const get = () => 'got';
    const handlers = internalHandlers(get);
    expect(handlers.GET).toBe(get);
    expect(handlers.ANY().status).toBe(405);
    expect(handlers.ANY().headers.get('allow')).toBe('GET');
  });
});
