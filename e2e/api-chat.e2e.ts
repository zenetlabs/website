import { expect, test } from '@playwright/test';
import { ASSISTANT_PUBLISHED } from './helpers';

const ORIGIN = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:4173';
const GOOD = {
  locale: 'en',
  message: 'hi',
  page: '/',
  turnstileToken: 'XXXX.DUMMY.TOKEN.XXXX',
};

test('GET answers 405 with Allow: POST', async ({ request }) => {
  const response = await request.get('/api/chat');
  expect(response.status()).toBe(405);
  expect(response.headers().allow).toBe('POST');
});

test.describe('while the assistant is dark', () => {
  test.skip(ASSISTANT_PUBLISHED, 'the assistant is published in this build');

  test('POST answers 503 unavailable before looking at anything else', async ({
    request,
  }) => {
    const response = await request.post('/api/chat', { data: GOOD });
    expect(response.status()).toBe(503);
    expect(await response.json()).toEqual({ ok: false, error: 'unavailable' });
  });
});

test.describe('contract', () => {
  test.skip(
    !ASSISTANT_PUBLISHED,
    'the assistant is not published in this build',
  );

  test('403 without Origin and with a foreign Origin', async ({ request }) => {
    const attempts: Record<string, string>[] = [
      {},
      { Origin: 'https://evil.example' },
    ];
    for (const headers of attempts) {
      const response = await request.post('/api/chat', { data: GOOD, headers });
      expect(response.status()).toBe(403);
      expect(await response.json()).toEqual({ ok: false, error: 'origin' });
    }
  });

  test('415 for a non-JSON body', async ({ request }) => {
    const response = await request.post('/api/chat', {
      headers: { Origin: ORIGIN, 'Content-Type': 'text/plain' },
      data: 'hello',
    });
    expect(response.status()).toBe(415);
  });

  test('400 for a body the schema rejects, and for a client-supplied history', async ({
    request,
  }) => {
    for (const data of [
      {},
      { ...GOOD, sessionId: '5f0c2a52-6f4e-4a6c-9d4e-0b1d7b3b0a11' },
      { ...GOOD, message: 'a'.repeat(1001) },
    ]) {
      const response = await request.post('/api/chat', {
        data,
        headers: { Origin: ORIGIN },
      });
      expect(response.status()).toBe(400);
      expect(await response.json()).toEqual({ ok: false, error: 'invalid' });
    }
  });

  test('413 for an oversize body', async ({ request }) => {
    const response = await request.post('/api/chat', {
      data: { ...GOOD, message: 'x'.repeat(9000) },
      headers: { Origin: ORIGIN },
    });
    expect(response.status()).toBe(413);
  });

  test('404 for an unknown session', async ({ request }) => {
    const { turnstileToken: _token, ...rest } = GOOD;
    const response = await request.post('/api/chat', {
      data: { ...rest, sessionId: '5f0c2a52-6f4e-4a6c-9d4e-0b1d7b3b0a11' },
      headers: { Origin: ORIGIN },
    });
    expect(response.status()).toBe(404);
    expect(await response.json()).toEqual({ ok: false, error: 'session' });
  });

  test('streams NDJSON that starts with the session and ends with done', async ({
    request,
  }) => {
    const response = await request.post('/api/chat', {
      data: GOOD,
      headers: { Origin: ORIGIN },
    });
    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toContain(
      'application/x-ndjson',
    );
    expect(response.headers()['cache-control']).toContain('no-store');
    const lines = (await response.text())
      .trim()
      .split('\n')
      .map((line) => JSON.parse(line));
    expect(lines[0]).toMatchObject({ t: 'session' });
    expect(lines.at(-1)).toEqual({ t: 'done', remaining: 19 });
  });
});
