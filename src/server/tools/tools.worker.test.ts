import { env } from 'cloudflare:workers';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { loadCalculatorContent, loadPricingContent } from '@/content/load';
import { estimate, market } from '@/lib/estimate';
import { formatPrice } from '@/lib/money';
import { clearBusyCache } from '@/server/booking';
import { clearTokenCache } from '@/server/google-auth';
import { toolByName } from '@/server/tools/registry';
import type { ServerTool, ToolContext } from '@/server/tools/types';
import { G1 } from '../../../test/calculator-fixtures';
import {
  bookingDeps,
  newWorld,
  signingCredentials,
  TEST_SITE,
  type World,
} from '../../../test/google';

const { DB } = env;
const NOW = Date.UTC(2027, 0, 4, 8, 0);

let world: World;
let background: Promise<unknown>[];
let secret: string | null;

function context(
  overrides: Partial<ToolContext> = {},
  site = TEST_SITE,
): ToolContext {
  return {
    now: NOW,
    channel: 'web',
    hostname: 'zenetlabs.com',
    consentAt: NOW,
    attribution: null,
    deps: { ...bookingDeps(DB, world, secret, background), site },
    ...overrides,
  };
}

function tool(name: string): ServerTool {
  const found = toolByName(name);
  if (!found || found.clientOnly) throw new Error(`no server tool ${name}`);
  return found;
}

async function call(name: string, input: unknown, ctx = context()) {
  const found = tool(name);
  const outcome = await found.run(input, ctx);
  if (!outcome.ok) return outcome;
  expect(found.output.safeParse(outcome.result).success, `${name} output`).toBe(
    true,
  );
  return outcome;
}

beforeEach(async () => {
  world = newWorld();
  background = [];
  secret = JSON.stringify((await signingCredentials()).credentials);
  clearTokenCache();
  clearBusyCache();
  await DB.prepare('DELETE FROM bookings').run();
  await DB.prepare('DELETE FROM leads').run();
});

const PRICING_RESULT = z.object({
  currency: z.string(),
  services: z.array(
    z.object({
      id: z.enum([
        'diagnostic',
        'integration',
        'agent',
        'web',
        'training',
        'maintenance',
        'growth',
      ]),
      prices: z.array(z.object({ min: z.number(), display: z.string() })),
    }),
  ),
});

const SLOTS_RESULT = z.object({
  timeZone: z.string(),
  more: z.boolean(),
  slots: z.array(
    z.object({ start: z.string(), end: z.string(), label: z.string() }),
  ),
});

describe('get_pricing', () => {
  it('returns the content prices with their formatted display, never recomputed', async () => {
    for (const locale of ['en', 'es'] as const) {
      const outcome = await call('get_pricing', { locale });
      const { services } = await loadPricingContent(locale);
      if (!outcome.ok) throw new Error('expected result');
      const result = PRICING_RESULT.parse(outcome.result);
      expect(result.currency).toBe(locale === 'en' ? 'SGD' : 'EUR');
      expect(result.services).toHaveLength(7);
      for (const entry of result.services) {
        const source = services[entry.id].prices;
        expect(source.length).toBeGreaterThan(0);
        expect(entry.prices.map((price) => price.min)).toEqual(
          source.map((price) => price.min),
        );
        expect(entry.prices.map((price) => price.display)).toEqual(
          source.map((price) => formatPrice(locale, price)),
        );
      }
    }
  });

  it('filters by service and defaults to English', async () => {
    const outcome = await call('get_pricing', { service: 'diagnostic' });
    expect(outcome).toMatchObject({
      ok: true,
      result: { currency: 'SGD', services: [{ id: 'diagnostic' }] },
    });
  });

  it('rejects an unknown service with issues instead of a result', async () => {
    const outcome = await call('get_pricing', { service: 'free-lunch' });
    expect(outcome).toMatchObject({ ok: false, issues: [{ path: 'service' }] });
  });
});

const FAQ_RESULT = z.object({
  items: z.array(z.object({ id: z.string(), url: z.string() })),
  contact: z.object({ email: z.string(), bookUrl: z.string().nullable() }),
});

describe('get_faq', () => {
  it('answers English and Spanish queries from the FAQ with the contact block', async () => {
    const en = await call('get_faq', { query: 'how long does a project take' });
    if (!en.ok) throw new Error('expected result');
    const found = FAQ_RESULT.parse(en.result);
    expect(found.items[0]).toMatchObject({
      id: 'timeline',
      url: 'https://zenetlabs.com/#faq-timeline',
    });
    expect(found.items.length).toBeLessThanOrEqual(3);
    expect(found.contact).toMatchObject({
      email: 'hello@zenetlabs.com',
      bookUrl: 'https://zenetlabs.com/book',
    });
    const es = await call('get_faq', { query: 'Verifactu', locale: 'es' });
    if (!es.ok) throw new Error('expected result');
    expect(FAQ_RESULT.parse(es.result).items[0]?.id).toBe('verifactu');
  });

  it('returns no items for a nonsense query, and no book link while booking is off', async () => {
    const off = context({}, { ...TEST_SITE, booking: { published: false } });
    const outcome = await call('get_faq', { query: 'xqzv wplk' }, off);
    expect(outcome).toMatchObject({
      ok: true,
      result: { items: [], contact: { bookUrl: null } },
    });
  });

  it('rejects an empty or oversized query', async () => {
    expect((await call('get_faq', { query: '  ' })).ok).toBe(false);
    expect((await call('get_faq', { query: 'a'.repeat(201) })).ok).toBe(false);
  });
});

describe('estimate_project', () => {
  it('is unavailable while the calculator is unpublished', async () => {
    const outcome = await call('estimate_project', { answers: G1 });
    expect(outcome).toMatchObject({
      ok: true,
      result: {
        status: 'unavailable',
        reason: 'not_published',
        pricingUrl: 'https://zenetlabs.com/pricing',
      },
    });
  });

  it('returns the calculator estimate once published', async () => {
    const published = { ...TEST_SITE, calculator: { published: true } };
    for (const locale of ['en', 'es'] as const) {
      const outcome = await call(
        'estimate_project',
        { answers: G1, locale },
        context({}, published),
      );
      const { services } = await loadCalculatorContent(locale);
      const expected = estimate(
        G1,
        market(services.diagnostic.prices[0].currency, services),
      );
      expect(outcome).toMatchObject({
        ok: true,
        result: {
          status: 'ok',
          currency: expected.currency,
          rulesVersion: expected.rulesVersion,
          total: expected.total,
          weeks: expected.weeks,
        },
      });
    }
  });

  it('rejects malformed answers', async () => {
    const published = { ...TEST_SITE, calculator: { published: true } };
    const outcome = await call(
      'estimate_project',
      { answers: { ...G1, type: 'rocket' } },
      context({}, published),
    );
    expect(outcome).toMatchObject({
      ok: false,
      issues: [{ path: 'answers.type' }],
    });
  });
});

describe('check_availability', () => {
  it('is unavailable and makes no request while not configured', async () => {
    secret = null;
    const fetchSpy = vi.fn();
    const ctx = context();
    ctx.deps.fetch = fetchSpy;
    const outcome = await call('check_availability', {}, ctx);
    expect(outcome).toMatchObject({
      ok: true,
      result: {
        status: 'unavailable',
        reason: 'not_configured',
        contact: { email: 'hello@zenetlabs.com' },
      },
    });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('reports calendar_error when Google fails', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    world.freebusyStatus = 500;
    expect(await call('check_availability', {})).toMatchObject({
      ok: true,
      result: { status: 'unavailable', reason: 'calendar_error' },
    });
    log.mockRestore();
  });

  it('returns labelled slots in the requested zone, capped at 30 with a more flag', async () => {
    const outcome = await call('check_availability', {
      timeZone: 'Asia/Singapore',
      limit: 5,
    });
    if (!outcome.ok) throw new Error('expected result');
    const result = SLOTS_RESULT.parse(outcome.result);
    expect(result).toMatchObject({ timeZone: 'Asia/Singapore', more: true });
    expect(result.slots).toHaveLength(30);
    expect(result.slots[0]).toEqual({
      start: '2027-01-05T07:00:00.000Z',
      end: '2027-01-05T07:30:00.000Z',
      label: 'Tuesday 5 January, 3:00 pm',
    });
  });

  it('honours a date range in the visitor zone and a Spanish label', async () => {
    const outcome = await call('check_availability', {
      from: '2027-01-12',
      to: '2027-01-12',
      locale: 'es',
    });
    if (!outcome.ok) throw new Error('expected result');
    const result = SLOTS_RESULT.parse(outcome.result);
    expect(result.timeZone).toBe('Europe/Madrid');
    expect(result.slots).toHaveLength(20);
    expect(result.more).toBe(false);
    expect(result.slots[0]?.label).toBe('martes 12 de enero, 08:00');
  });

  it('uses the test calendar on a non-live host', async () => {
    await call('check_availability', {}, context({ hostname: 'localhost' }));
    expect(world.freebusyCalls).toEqual(['test-calendar']);
  });

  it('rejects an unknown zone or an impossible date', async () => {
    expect(
      (await call('check_availability', { timeZone: 'Mars/Base' })).ok,
    ).toBe(false);
    expect((await call('check_availability', { from: '2027-13-40' })).ok).toBe(
      false,
    );
  });
});

describe('book_meeting', () => {
  const BODY = {
    slot: '2027-01-12T09:00:00.000Z',
    name: 'Ada Lovelace',
    email: 'Ada@Example.com',
    topic: 'We want to automate our inbox triage.',
    timeZone: 'Asia/Singapore',
  };

  it('books, labels the time in the visitor zone and lowercases the address', async () => {
    const outcome = await call('book_meeting', BODY);
    expect(outcome).toMatchObject({
      ok: true,
      result: {
        status: 'booked',
        start: '2027-01-12T09:00:00.000Z',
        label: 'Tuesday 12 January, 5:00 pm',
        meetUrl: 'https://meet.google.com/aaa-bbbb-ccc',
      },
    });
    await Promise.allSettled(background);
    expect(world.events[0]?.body.attendees).toEqual([
      { email: 'ada@example.com' },
    ]);
  });

  it('answers unavailable with the contact block while not configured', async () => {
    secret = null;
    expect(await call('book_meeting', BODY)).toMatchObject({
      ok: true,
      result: {
        status: 'unavailable',
        reason: 'not_configured',
        contact: { email: 'hello@zenetlabs.com' },
      },
    });
  });

  it('refuses to run without consent', async () => {
    await expect(
      tool('book_meeting').run(BODY, context({ consentAt: null })),
    ).rejects.toThrow('consent');
  });

  it.each([
    ['a short topic', { topic: 'short' }],
    ['a name with a line break', { name: 'Ada\nLovelace' }],
    ['a bad email', { email: 'ada' }],
    ['an unknown zone', { timeZone: 'Mars/Base' }],
    ['a slot that is not a date', { slot: 'tomorrow' }],
  ])('rejects %s with issues', async (_label, change) => {
    const outcome = await call('book_meeting', { ...BODY, ...change });
    expect(outcome.ok).toBe(false);
  });

  it('books on the test calendar only on a non-live host, the rule availability uses', async () => {
    await call(
      'book_meeting',
      { ...BODY, name: '[TEST] Acceptance' },
      context({ hostname: 'localhost' }),
    );
    await Promise.allSettled(background);
    expect(world.events.map((event) => event.calendarId)).toEqual([
      'test-calendar',
    ]);
    expect(world.freebusyCalls).toEqual(['test-calendar']);
  });

  it('keeps a [TEST] name on the live calendar: the host decides, never the name', async () => {
    await call('book_meeting', { ...BODY, name: '[TEST] Acceptance' });
    await Promise.allSettled(background);
    expect(world.events.map((event) => event.calendarId)).toEqual([
      'main-calendar',
    ]);
    expect(await DB.prepare('SELECT is_test FROM bookings').first()).toEqual({
      is_test: 0,
    });
  });
});
