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

vi.mock('@/server/page-markdown', async () => {
  const { parsePage } = await import('@/server/page-outline');
  return { loadPage: vi.fn(async () => parsePage(PAGE_FIXTURE)) };
});

const PAGE_FIXTURE = [
  '---',
  'title: "Fixture page | Zenet Labs"',
  'description: "A fixture."',
  '---',
  '',
  '# Fixture',
  '',
  'Intro.',
  '',
  '## First',
  '',
  'First body with a [link](https://zenetlabs.com/pricing).',
  '',
  '## Second',
  '',
  'Second body.',
  '',
].join('\n');

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
    chatSessionId: null,
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
  world = newWorld(NOW);
  background = [];
  secret = JSON.stringify((await signingCredentials()).credentials);
  clearTokenCache();
  clearBusyCache();
  await DB.prepare('DELETE FROM bookings').run();
  await DB.prepare('DELETE FROM booking_ip_usage').run();
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

describe('list_pages', () => {
  it('lists the pages of the locale, and keeps the Spanish-only ones off the English list', async () => {
    const en = await call('list_pages', {});
    const es = await call('list_pages', { locale: 'es' });
    if (!en.ok || !es.ok) throw new Error('expected result');
    const parse = (result: unknown) =>
      z
        .object({
          pages: z.array(z.object({ id: z.string(), title: z.string() })),
        })
        .parse(result).pages;
    const english = parse(en.result);
    const spanish = parse(es.result);
    expect(english.map((page) => page.id)).not.toContain('verifactu');
    expect(english.map((page) => page.id)).toContain('pricing');
    expect(spanish.map((page) => page.id)).toContain('verifactu');
    expect(english.map((page) => page.id)).not.toContain('calculator');
    for (const pages of [english, spanish]) {
      for (const page of pages) expect(page.title).not.toBe('');
      expect(JSON.stringify(pages).length).toBeLessThanOrEqual(3000);
    }
  });
});

describe('get_page', () => {
  it('returns the outline, then a section, from the rendered markdown', async () => {
    const outline = await call('get_page', { page: 'pricing' });
    expect(outline).toMatchObject({
      ok: true,
      result: {
        status: 'page',
        page: 'pricing',
        title: 'Fixture page | Zenet Labs',
        sections: ['# Fixture', '## First', '## Second'],
      },
    });
    const section = await call('get_page', {
      page: 'pricing',
      section: 'first',
    });
    expect(section).toMatchObject({
      ok: true,
      result: {
        status: 'section',
        section: '## First',
        text: 'First body with a link.',
        part: 1,
        parts: 1,
        next: '## Second',
      },
    });
  });

  it('says not_found, with what does exist, for an unknown section or part', async () => {
    expect(
      await call('get_page', { page: 'pricing', section: 'Nope' }),
    ).toMatchObject({
      ok: true,
      result: {
        status: 'not_found',
        sections: ['# Fixture', '## First', '## Second'],
      },
    });
    expect(
      await call('get_page', { page: 'pricing', section: 'First', part: 4 }),
    ).toMatchObject({ ok: true, result: { status: 'not_found', parts: 1 } });
  });

  it('answers not_available, and never throws, when the page cannot be rendered', async () => {
    const { loadPage } = await import('@/server/page-markdown');
    vi.mocked(loadPage).mockResolvedValueOnce(null);
    expect(await call('get_page', { page: 'about' })).toMatchObject({
      ok: true,
      result: { status: 'not_available', page: 'about' },
    });
  });

  it('is not available for book, a page missing in the locale, or a dark page', async () => {
    for (const [page, locale] of [
      ['book', 'en'],
      ['legalNotice', 'en'],
      ['verifactu', 'en'],
      ['calculator', 'en'],
    ] as const) {
      expect(await call('get_page', { page, locale }), page).toMatchObject({
        ok: true,
        result: { status: 'not_available', page },
      });
    }
  });

  it('accepts only registry ids, never a path or a URL', async () => {
    for (const page of ['/pricing', 'https://example.com', '../x', 'PRICING']) {
      expect((await call('get_page', { page })).ok, page).toBe(false);
    }
    expect((await call('get_page', { page: 'pricing', part: 0 })).ok).toBe(
      false,
    );
    expect(
      (await call('get_page', { page: 'pricing', section: 'a'.repeat(201) }))
        .ok,
    ).toBe(false);
  });
});

describe('search_site', () => {
  it('finds passages with their page and the contact block, in the locale', async () => {
    const outcome = await call('search_site', { query: 'whatsapp' });
    expect(outcome).toMatchObject({
      ok: true,
      result: { contact: { email: 'hello@zenetlabs.com' } },
    });
    if (!outcome.ok) throw new Error('expected result');
    const { results } = z
      .object({
        results: z.array(z.object({ page: z.string(), excerpt: z.string() })),
      })
      .parse(outcome.result);
    expect(results.length).toBeGreaterThan(0);
    expect(results.length).toBeLessThanOrEqual(5);
    expect(results.map((hit) => hit.page)).toContain('integrations');
  });

  it('answers an empty list for Holded in English and results in Spanish', async () => {
    expect(await call('search_site', { query: 'holded' })).toMatchObject({
      ok: true,
      result: { results: [] },
    });
    const es = await call('search_site', { query: 'holded', locale: 'es' });
    if (!es.ok) throw new Error('expected result');
    expect(JSON.stringify(es.result)).toContain('holded');
  });

  it('rejects an empty or oversized query', async () => {
    expect((await call('search_site', { query: ' ' })).ok).toBe(false);
    expect((await call('search_site', { query: 'a'.repeat(201) })).ok).toBe(
      false,
    );
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
    // The start is the visitor's wall clock with its offset, so the hour in it
    // is the hour in the label; it is the same instant as 09:00 UTC.
    expect(result.slots[0]).toEqual({
      start: '2027-01-05T17:00:00+08:00',
      end: '2027-01-05T17:30:00+08:00',
      label: 'Tuesday 5 January, 5:00 pm',
    });
    expect(Date.parse(result.slots[0]?.start ?? '')).toBe(
      Date.UTC(2027, 0, 5, 9),
    );
  });

  it.each([
    [
      'Europe/Madrid',
      '2027-01-05T10:00:00+01:00',
      'Tuesday 5 January, 10:00 am',
    ],
    [
      'Pacific/Honolulu',
      '2027-01-04T23:00:00-10:00',
      'Monday 4 January, 11:00 pm',
    ],
  ])(
    'writes each start in %s with its offset, matching the label',
    async (timeZone, start, label) => {
      const outcome = await call('check_availability', { timeZone });
      if (!outcome.ok) throw new Error('expected result');
      const result = SLOTS_RESULT.parse(outcome.result);
      expect(result.slots[0]).toMatchObject({ start, label });
    },
  );

  it('takes an offset start back as the same slot in book_meeting', async () => {
    const offered = await call('check_availability', {
      timeZone: 'Asia/Singapore',
    });
    if (!offered.ok) throw new Error('expected result');
    const [first] = SLOTS_RESULT.parse(offered.result).slots;
    const booked = await call('book_meeting', {
      slot: first?.start,
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      topic: 'We want to automate our inbox triage.',
      timeZone: 'Asia/Singapore',
    });
    expect(booked).toMatchObject({
      ok: true,
      result: { status: 'pending', start: '2027-01-05T09:00:00.000Z' },
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
    expect(result.slots).toHaveLength(12);
    expect(result.more).toBe(false);
    expect(result.slots[0]?.label).toBe('martes 12 de enero, 10:00');
    expect(result.slots.at(-1)?.label).toBe('martes 12 de enero, 15:30');
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

  it('holds the slot, labels the time in the visitor zone and emails the lowercased address', async () => {
    const outcome = await call('book_meeting', BODY);
    expect(outcome).toMatchObject({
      ok: true,
      result: {
        status: 'pending',
        start: '2027-01-12T09:00:00.000Z',
        label: 'Tuesday 12 January, 5:00 pm',
        expiresAt: '2027-01-04T08:30:00.000Z',
        resent: false,
      },
    });
    await Promise.allSettled(background);
    expect(world.events).toEqual([]);
    expect(world.sent.map((mail) => mail.to)).toEqual(['ada@example.com']);
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

  it('holds on the test calendar only on a non-live host, the rule availability uses', async () => {
    await call(
      'book_meeting',
      { ...BODY, name: '[TEST] Acceptance' },
      context({ hostname: 'localhost' }),
    );
    await Promise.allSettled(background);
    expect(world.freebusyCalls).toEqual(['test-calendar']);
    expect(await DB.prepare('SELECT is_test FROM bookings').first()).toEqual({
      is_test: 1,
    });
  });

  it('keeps a [TEST] name on the live calendar: the host decides, never the name', async () => {
    await call('book_meeting', { ...BODY, name: '[TEST] Acceptance' });
    await Promise.allSettled(background);
    expect(world.freebusyCalls).toEqual(['main-calendar']);
    expect(await DB.prepare('SELECT is_test FROM bookings').first()).toEqual({
      is_test: 0,
    });
  });
});
