import { expect, test } from '@playwright/test';

const JSON_HEADERS = { 'Content-Type': 'application/json' };

test('methods other than POST get 405 with Allow, never the SSR page', async ({
  request,
}) => {
  for (const method of ['GET', 'PUT', 'DELETE', 'PATCH'] as const) {
    const response = await request.fetch('/api/lead', { method });
    expect(response.status(), method).toBe(405);
    expect(response.headers().allow, method).toBe('POST');
    expect(response.headers()['content-type'] ?? '').not.toContain('text/html');
  }
  const head = await request.head('/api/lead');
  expect(head.status()).toBe(405);
});

test('a POST without an Origin header is refused', async ({ request }) => {
  const response = await request.post('/api/lead', {
    headers: JSON_HEADERS,
    data: {},
  });
  expect(response.status()).toBe(403);
  expect(await response.json()).toEqual({ ok: false, error: 'origin' });
  expect(response.headers()['cache-control']).toBe('no-store');
});

test('a POST from another origin is refused', async ({ request }) => {
  const response = await request.post('/api/lead', {
    headers: { ...JSON_HEADERS, Origin: 'https://evil.example' },
    data: {},
  });
  expect(response.status()).toBe(403);
});

test('a non-JSON POST gets 415', async ({ request, baseURL }) => {
  const response = await request.post('/api/lead', {
    headers: { 'Content-Type': 'text/plain', Origin: baseURL ?? '' },
    data: '{}',
  });
  expect(response.status()).toBe(415);
  expect(await response.json()).toEqual({ ok: false, error: 'unsupported' });
});

test('an empty object gets 400', async ({ request, baseURL }) => {
  const response = await request.post('/api/lead', {
    headers: { ...JSON_HEADERS, Origin: baseURL ?? '' },
    data: {},
  });
  expect(response.status()).toBe(400);
  expect(await response.json()).toEqual({ ok: false, error: 'invalid' });
});

test('an oversized body gets 413', async ({ request, baseURL }) => {
  const response = await request.post('/api/lead', {
    headers: { ...JSON_HEADERS, Origin: baseURL ?? '' },
    data: { filler: 'x'.repeat(40_000) },
  });
  expect(response.status()).toBe(413);
  expect(await response.json()).toEqual({ ok: false, error: 'too-large' });
});
