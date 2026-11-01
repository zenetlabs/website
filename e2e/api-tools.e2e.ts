import { expect, test } from '@playwright/test';
import { z } from 'zod';
import { TOOL_SECRET } from './fakes';

const manifestSchema = z.object({
  version: z.number(),
  tools: z.array(
    z.object({
      name: z.string(),
      readOnly: z.boolean(),
      clientOnly: z.boolean(),
      inputSchema: z.object({ type: z.literal('object') }),
    }),
  ),
});

const envelope = z.object({
  ok: z.boolean(),
  error: z.string().optional(),
  result: z.looseObject({ status: z.string().optional() }).optional(),
});

const BOOKING = {
  slot: '2030-01-01T09:00:00.000Z',
  name: 'Ada Lovelace',
  email: 'ada@example.com',
  topic: 'Automate our inbox triage please.',
};

test('GET /api/tools serves the manifest', async ({ request }) => {
  const response = await request.get('/api/tools');
  expect(response.status()).toBe(200);
  expect(response.headers()['cache-control']).toBe('public, max-age=300');
  const manifest = manifestSchema.parse(await response.json());
  expect(manifest.tools.map((tool) => tool.name)).toEqual([
    'get_faq',
    'get_pricing',
    'estimate_project',
    'check_availability',
    'book_meeting',
    'navigate',
  ]);
  expect(
    manifest.tools.find((tool) => tool.name === 'navigate')?.clientOnly,
  ).toBe(true);
});

test('read tools answer 200 in a stable envelope', async ({ request }) => {
  const pricing = await request.post('/api/tools/get_pricing', {
    data: { locale: 'es' },
  });
  expect(pricing.status()).toBe(200);
  expect(pricing.headers()['cache-control']).toBe('no-store');
  expect(envelope.parse(await pricing.json())).toMatchObject({
    ok: true,
    result: { currency: 'EUR' },
  });

  const faq = await request.post('/api/tools/get_faq', {
    data: { query: 'how long' },
  });
  expect(envelope.parse(await faq.json()).ok).toBe(true);

  const estimate = await request.post('/api/tools/estimate_project', {
    data: {
      answers: {
        type: 'automation',
        tools: ['erp'],
        volume: 'low',
        agent: false,
        web: false,
        urgency: 'standard',
        maintenance: false,
      },
    },
  });
  expect(envelope.parse(await estimate.json()).ok).toBe(true);

  const slots = await request.post('/api/tools/check_availability', {
    data: { timeZone: 'Asia/Tokyo' },
  });
  const body = envelope.parse(await slots.json());
  expect(body.result?.status).toBe('ok');
});

test('transport failures use 4xx with an error code', async ({ request }) => {
  expect((await request.get('/api/tools/get_pricing')).status()).toBe(405);
  expect((await request.get('/api/tools/get_pricing')).headers().allow).toBe(
    'POST',
  );
  expect((await request.post('/api/tools/nope', { data: {} })).status()).toBe(
    404,
  );
  expect(
    (await request.post('/api/tools/navigate', { data: {} })).status(),
  ).toBe(404);

  const noOrigin = await request.post('/api/tools/book_meeting', {
    data: BOOKING,
  });
  expect(noOrigin.status()).toBe(403);
  expect(envelope.parse(await noOrigin.json()).error).toBe('origin');

  const wrongBearer = await request.post('/api/tools/book_meeting', {
    headers: { Authorization: 'Bearer wrong' },
    data: BOOKING,
  });
  expect(wrongBearer.status()).toBe(401);

  const text = await request.post('/api/tools/get_pricing', {
    headers: { 'Content-Type': 'text/plain' },
    data: '{}',
  });
  expect(text.status()).toBe(415);

  const invalid = await request.post('/api/tools/get_pricing', {
    data: { service: 'nope' },
  });
  expect(invalid.status()).toBe(400);
  expect(envelope.parse(await invalid.json()).error).toBe('invalid');
});

test('a bearer caller books on the test calendar', async ({ request }) => {
  // A late window, so this never shares a slot with booking.e2e.ts.
  const from = new Date(Date.now() + 11 * 86_400_000)
    .toISOString()
    .slice(0, 10);
  const check = await request.post('/api/tools/check_availability', {
    data: { from, timeZone: 'UTC' },
  });
  const slots = z
    .object({
      result: z.object({ slots: z.array(z.object({ start: z.string() })) }),
    })
    .parse(await check.json()).result.slots;
  const start = slots.at(0)?.start;
  if (!start) throw new Error('no slot left to book');
  const response = await request.post('/api/tools/book_meeting', {
    headers: { Authorization: `Bearer ${TOOL_SECRET}` },
    data: {
      ...BOOKING,
      slot: start,
      name: '[TEST] Bearer',
      email: `bearer-${crypto.randomUUID().slice(0, 8)}@example.com`,
    },
  });
  expect(response.status()).toBe(200);
  expect(envelope.parse(await response.json()).result?.status).toBe('booked');
});

test('/api/health reports booleans only', async ({ request }) => {
  const response = await request.get('/api/health');
  expect(response.headers()['cache-control']).toBe('no-store');
  expect(
    z
      .strictObject({
        ok: z.literal(true),
        booking: z.boolean(),
        toolsBearer: z.boolean(),
      })
      .parse(await response.json()),
  ).toEqual({
    ok: true,
    booking: true,
    toolsBearer: true,
  });
});

test('/api/book/slots serves the whole horizon in one answer', async ({
  request,
}) => {
  const response = await request.get('/api/book/slots');
  expect(response.status()).toBe(200);
  expect(response.headers()['cache-control']).toBe('no-store');
  const body = z
    .object({
      status: z.literal('ok'),
      slots: z.array(z.object({ start: z.number(), end: z.number() })),
    })
    .parse(await response.json());
  expect(body.slots.length).toBeGreaterThan(60);
  expect((await request.post('/api/book/slots', { data: {} })).status()).toBe(
    405,
  );
});

test('an unknown tool is a 404 for any method', async ({ request }) => {
  expect((await request.get('/api/tools/nope')).status()).toBe(404);
  expect((await request.get('/api/tools/navigate')).status()).toBe(404);
});
