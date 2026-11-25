import { expect } from '@playwright/test';
import { z } from 'zod';
import {
  agentHeaders,
  releaseBooking,
  startVoiceSession,
  toolEnvelope,
} from './fakes';
import { test } from './fixtures';
import { CALCULATOR_PUBLISHED, lateSlot } from './helpers';

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
    ...(CALCULATOR_PUBLISHED ? ['estimate_project'] : []),
    'check_availability',
    'book_meeting',
    'navigate',
    'list_pages',
    'get_page',
    'search_site',
    'open_contact_form',
  ]);
  expect(
    manifest.tools.filter((tool) => tool.clientOnly).map((tool) => tool.name),
  ).toEqual(['navigate', 'open_contact_form']);
});

test('read tools answer 200 in a stable envelope', async ({ request }) => {
  const pricing = await request.post('/api/tools/get_pricing', {
    data: { locale: 'es' },
  });
  expect(pricing.status()).toBe(200);
  expect(pricing.headers()['cache-control']).toBe('no-store');
  expect(toolEnvelope.parse(await pricing.json())).toMatchObject({
    ok: true,
    result: { currency: 'EUR' },
  });

  const faq = await request.post('/api/tools/get_faq', {
    data: { query: 'how long' },
  });
  expect(toolEnvelope.parse(await faq.json()).ok).toBe(true);

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
  expect(toolEnvelope.parse(await estimate.json()).ok).toBe(true);

  const slots = await request.post('/api/tools/check_availability', {
    data: { timeZone: 'Asia/Tokyo' },
  });
  const body = toolEnvelope.parse(await slots.json());
  expect(body.result?.status).toBe('ok');
});

test('the site-reading tools answer 200 envelopes, and the contact form tool is client-only', async ({
  request,
}) => {
  const pages = toolEnvelope.parse(
    await (
      await request.post('/api/tools/list_pages', { data: { locale: 'es' } })
    ).json(),
  );
  expect(JSON.stringify(pages)).toContain('"id":"verifactu"');

  const search = toolEnvelope.parse(
    await (
      await request.post('/api/tools/search_site', {
        data: { query: 'whatsapp' },
      })
    ).json(),
  );
  expect(JSON.stringify(search)).toContain('"page":"integrations"');
  expect(
    toolEnvelope.parse(
      await (
        await request.post('/api/tools/search_site', {
          data: { query: 'holded' },
        })
      ).json(),
    ).result,
  ).toMatchObject({ results: [] });

  const page = await request.post('/api/tools/get_page', {
    data: { page: 'pricing', section: 'Automation diagnostic' },
  });
  expect(page.status()).toBe(200);
  expect(page.headers()['cache-control']).toBe('no-store');
  const read = JSON.stringify(toolEnvelope.parse(await page.json()));
  expect(read).toContain('"status":"section"');
  expect(read).toContain('S$');

  expect(
    toolEnvelope.parse(
      await (
        await request.post('/api/tools/get_page', { data: { page: 'book' } })
      ).json(),
    ).result,
  ).toMatchObject({ status: 'not_available' });
  expect(
    (
      await request.post('/api/tools/get_page', { data: { page: '/pricing' } })
    ).status(),
  ).toBe(400);

  const draft = await request.post('/api/tools/open_contact_form', {
    data: { message: 'Hello' },
  });
  expect(draft.status()).toBe(404);
  expect(toolEnvelope.parse(await draft.json()).error).toBe('unknown');
});

test('a bearer caller with a voice session reads a page', async ({
  request,
}) => {
  const response = await request.post('/api/tools/get_page', {
    headers: agentHeaders(await startVoiceSession(request)),
    data: { page: 'about' },
  });
  expect(response.status()).toBe(200);
  expect(toolEnvelope.parse(await response.json())).toMatchObject({
    ok: true,
    result: { status: 'page', page: 'about' },
  });
  const wrong = await request.post('/api/tools/get_page', {
    headers: { Authorization: 'Bearer wrong' },
    data: { page: 'about' },
  });
  expect(wrong.status()).toBe(401);
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
  expect(toolEnvelope.parse(await noOrigin.json()).error).toBe('origin');

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
  expect(toolEnvelope.parse(await invalid.json()).error).toBe('invalid');
});

// An unread body used to 500 now and then in local workerd (vault README, 2026-11-06).
test('refusals sent before the body is read never turn into a 500', async ({
  request,
}) => {
  test.setTimeout(30_000);
  const statuses = new Map<number, number>();
  const count = (status: number) =>
    statuses.set(status, (statuses.get(status) ?? 0) + 1);
  for (let index = 0; index < 280; index += 1) {
    const refused = await request.post('/api/tools/get_pricing', {
      headers: { 'Content-Type': 'text/plain' },
      data: JSON.stringify({ service: 'diagnostic', pad: 'x'.repeat(512) }),
    });
    count(refused.status());
    if (index % 4 === 0) {
      const lead = await request.post('/api/lead', {
        headers: { Origin: 'https://evil.example' },
        data: { name: 'x'.repeat(512) },
      });
      count(lead.status());
    }
  }
  expect(Object.fromEntries(statuses)).toEqual({ 415: 280, 403: 70 });
});

test('a bearer caller books on the test calendar', async ({ request }) => {
  const start = await lateSlot(async (name, input) =>
    (await request.post(`/api/tools/${name}`, { data: input })).json(),
  );
  const email = `bearer-${crypto.randomUUID().slice(0, 8)}@example.com`;
  const response = await request.post('/api/tools/book_meeting', {
    headers: agentHeaders(await startVoiceSession(request)),
    data: {
      ...BOOKING,
      confirmed: true,
      slot: start,
      name: '[TEST] Bearer',
      email,
    },
  });
  expect(response.status()).toBe(200);
  expect(toolEnvelope.parse(await response.json()).result).toMatchObject({
    status: 'pending',
    label: expect.any(String),
    expiresAt: expect.any(String),
    resent: false,
  });
  await releaseBooking(request, email);
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
        assistant: z.boolean(),
        voice: z.boolean(),
      })
      .parse(await response.json()),
  ).toEqual({
    ok: true,
    booking: true,
    toolsBearer: true,
    assistant: true,
    voice: true,
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
