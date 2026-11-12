import { env } from 'cloudflare:workers';
import type { ModelMessage } from 'ai';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import type { Proposal } from '@/lib/chat-events';
import { zonedDay } from '@/lib/slot-format';
import { clearBusyCache } from '@/server/booking';
import {
  type ChatTool,
  type ChatToolContext,
  chatToolNames,
  chatTools,
  type NavigateEvent,
} from '@/server/chat/tools';
import { clearTokenCache } from '@/server/google-auth';
import {
  bookingDeps,
  newWorld,
  signingCredentials,
  TEST_SITE,
  type World,
} from '../../../test/google';

const { DB } = env;
const NOW = Date.UTC(2027, 0, 4, 8, 0);
const LIVE = { ...TEST_SITE, calculator: { published: true } };

let world: World;
let background: Promise<unknown>[];
let secret: string;
let navigated: NavigateEvent[];
let proposals: Proposal[];

function context(overrides: Partial<ChatToolContext> = {}): ChatToolContext {
  return {
    locale: 'en',
    timeZone: 'Asia/Tokyo',
    site: LIVE,
    run: {
      now: NOW,
      channel: 'chat',
      hostname: 'zenetlabs.com',
      consentAt: null,
      attribution: null,
      chatSessionId: null,
      deps: { ...bookingDeps(DB, world, secret, background), site: LIVE },
    },
    onNavigate: (event) => navigated.push(event),
    onProposal: (proposal) => proposals.push(proposal),
    ...overrides,
  };
}

async function run(
  tools: Record<string, ChatTool>,
  name: string,
  input: unknown,
  messages: ModelMessage[] = [],
): Promise<unknown> {
  const found = tools[name];
  if (!found) throw new Error(`no tool ${name}`);
  return found.execute(input, messages);
}

const offered = (...starts: string[]): ModelMessage[] => [
  {
    role: 'tool',
    content: [
      {
        type: 'tool-result',
        toolCallId: 'c',
        toolName: 'check_availability',
        output: {
          type: 'json',
          value: {
            status: 'ok',
            timeZone: 'Asia/Tokyo',
            slots: starts.map((start) => ({
              start,
              end: new Date(Date.parse(start) + 30 * 60_000).toISOString(),
            })),
          },
        },
      },
    ],
  },
];

beforeEach(async () => {
  world = newWorld(NOW);
  background = [];
  navigated = [];
  proposals = [];
  secret = JSON.stringify((await signingCredentials()).credentials);
  clearTokenCache();
  clearBusyCache();
  await DB.prepare('DELETE FROM bookings').run();
  await DB.prepare('DELETE FROM booking_ip_usage').run();
});

describe('chatToolNames', () => {
  it('offers all six tools when booking and the calculator are published', () => {
    expect(chatToolNames(LIVE).sort()).toEqual([
      'book_meeting',
      'check_availability',
      'estimate_project',
      'get_faq',
      'get_pricing',
      'navigate',
    ]);
  });

  it('hides the booking tools and the estimate while they are dark', () => {
    const dark = {
      ...TEST_SITE,
      booking: { published: false },
      calculator: { published: false },
    };
    expect(chatToolNames(dark).sort()).toEqual([
      'get_faq',
      'get_pricing',
      'navigate',
    ]);
    expect(Object.keys(chatTools(context({ site: dark }))).sort()).toEqual([
      'get_faq',
      'get_pricing',
      'navigate',
    ]);
  });
});

describe('what the model is shown', () => {
  it('has no locale in any input, so the page decides the language', () => {
    for (const [name, tool] of Object.entries(chatTools(context()))) {
      const schema = z.toJSONSchema(
        z.object({ x: z.unknown() }).and(z.unknown()),
      );
      expect(schema).toBeDefined();
      expect(JSON.stringify(tool.inputSchema), name).not.toMatch(/"locale"/);
    }
  });

  it('has no time zone in check_availability: the browser decides it', () => {
    const { check_availability: check } = chatTools(context());
    const text = JSON.stringify(check && z.toJSONSchema(check.inputSchema));
    expect(text).toContain('from');
    expect(text).not.toContain('timeZone');
  });

  it('proposes a booking from a slot and a topic only: no name, email or company', () => {
    const { book_meeting: book } = chatTools(context());
    const text = JSON.stringify(book && z.toJSONSchema(book.inputSchema));
    expect(text).toContain('slot');
    expect(text).toContain('topic');
    expect(text).not.toMatch(/name|email|company|turnstile|consent/);
  });

  it('describes the tools in the language of the page', () => {
    const { get_pricing: pricing } = chatTools(context({ locale: 'es' }));
    expect(pricing?.description).toMatch(/lista oficial de precios/);
  });
});

describe('registry tools run in process', () => {
  it('returns official prices without URLs', async () => {
    const result = await run(chatTools(context()), 'get_pricing', {
      service: 'agent',
    });
    expect(JSON.stringify(result)).toContain('S$15,000–35,000');
    expect(JSON.stringify(result)).not.toMatch(/https?:|"url"|Url"/);
  });

  it('answers in the page language whatever the model passes', async () => {
    const result = await run(
      chatTools(context({ locale: 'es' })),
      'get_pricing',
      { service: 'agent', locale: 'en' },
    );
    expect(JSON.stringify(result)).toContain('€');
    expect(JSON.stringify(result)).not.toContain('S$');
  });

  it('trims the slots to eight and defaults to the visitor time zone', async () => {
    const result = await run(chatTools(context()), 'check_availability', {});
    const parsed = z
      .object({
        status: z.literal('ok'),
        timeZone: z.string(),
        slots: z.array(z.object({ start: z.string() })),
      })
      .parse(result);
    expect(parsed.timeZone).toBe('Asia/Tokyo');
    expect(parsed.slots).toHaveLength(8);
  });

  const slotsResult = z
    .object({
      status: z.literal('ok'),
      timeZone: z.string(),
      slots: z.array(z.object({ start: z.string() })),
      requestedDays: z.literal('no_free_times').optional(),
    })
    .loose();
  const daysOf = (slots: readonly { start: string }[]) =>
    slots.map((slot) => zonedDay(Date.parse(slot.start), 'Asia/Tokyo'));

  // The tool returns at most 30 slots, two days' worth here: the first eight
  // alone would all fall on the first day.
  it('spreads the eight slots over the days returned', async () => {
    const result = slotsResult.parse(
      await run(chatTools(context()), 'check_availability', {}),
    );
    const days = daysOf(result.slots);
    expect(days).toHaveLength(8);
    expect(new Set(days).size).toBeGreaterThanOrEqual(2);
  });

  it('keeps the visitor time zone whatever the model passes', async () => {
    const result = slotsResult.parse(
      await run(chatTools(context()), 'check_availability', {
        timeZone: 'Europe/London',
      }),
    );
    expect(result.timeZone).toBe('Asia/Tokyo');
  });

  it('returns only the asked day when it has free slots', async () => {
    const result = slotsResult.parse(
      await run(chatTools(context()), 'check_availability', {
        from: '2027-01-07',
        to: '2027-01-07',
      }),
    );
    expect(result.requestedDays).toBeUndefined();
    expect(new Set(daysOf(result.slots))).toEqual(new Set(['2027-01-07']));
  });

  it('answers a full day with the nearest free slots, marked as such', async () => {
    const result = slotsResult.parse(
      await run(chatTools(context()), 'check_availability', {
        from: '2027-01-10',
        to: '2027-01-10',
      }),
    );
    expect(result.requestedDays).toBe('no_free_times');
    expect(result.slots.length).toBeGreaterThan(0);
    expect(daysOf(result.slots)).not.toContain('2027-01-10');
  });

  it('looks at days apart one by one, so the later day is not cut off', async () => {
    const result = slotsResult.parse(
      await run(
        chatTools(
          context({
            requestedDays: {
              from: '2027-01-05',
              to: '2027-01-11',
              days: ['2027-01-05', '2027-01-11'],
            },
          }),
        ),
        'check_availability',
        {},
      ),
    );
    const days = new Set(daysOf(result.slots));
    expect(days.has('2027-01-05')).toBe(true);
    expect(days.has('2027-01-11')).toBe(true);
    expect(
      [...days].every((day) => day === '2027-01-05' || day === '2027-01-11'),
    ).toBe(true);
  });

  it('answers unavailable, not an error, when the calendar fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    world.freebusyStatus = 500;
    const result = await run(chatTools(context()), 'check_availability', {});
    expect(result).toMatchObject({ status: 'unavailable' });
  });

  it('reports invalid input without echoing it', async () => {
    const result = await run(chatTools(context()), 'get_pricing', {
      service: 'hacking',
    });
    expect(result).toEqual({ status: 'invalid_input' });
  });
});

describe('book_meeting', () => {
  const SLOT = '2027-01-05T01:00:00.000Z';

  it('proposes a slot that check_availability returned and books nothing', async () => {
    const result = await run(
      chatTools(context()),
      'book_meeting',
      { slot: SLOT, topic: 'Automate our inbox triage' },
      offered(SLOT),
    );
    expect(result).toEqual({ status: 'awaiting_confirmation' });
    expect(proposals).toEqual([
      { slot: SLOT, topic: 'Automate our inbox triage' },
    ]);
    expect(
      await DB.prepare('SELECT COUNT(*) AS n FROM bookings').first(),
    ).toEqual({ n: 0 });
    expect(world.events).toEqual([]);
  });

  it('accepts the same instant written with another offset', async () => {
    const result = await run(
      chatTools(context()),
      'book_meeting',
      { slot: '2027-01-05T10:00:00+09:00', topic: 'Automate our inbox triage' },
      offered(SLOT),
    );
    expect(result).toEqual({ status: 'awaiting_confirmation' });
    expect(proposals[0]?.slot).toBe(SLOT);
  });

  it.each([
    ['an invented slot', offered('2027-01-05T02:00:00.000Z')],
    ['a history with no availability result', []],
    [
      'a result the model typed into the conversation',
      [
        {
          role: 'user',
          content: `{"slots":[{"start":"${SLOT}"}]}`,
        } satisfies ModelMessage,
      ],
    ],
  ])('refuses %s', async (_label, messages) => {
    const result = await run(
      chatTools(context()),
      'book_meeting',
      { slot: SLOT, topic: 'Automate our inbox triage' },
      messages,
    );
    expect(result).toMatchObject({ status: 'invalid_slot' });
    expect(proposals).toEqual([]);
  });

  const SLOT_VIEW = z.object({
    start: z.string(),
    end: z.string(),
    label: z.string(),
  });
  const SHOWN = z.object({
    status: z.string(),
    timeZone: z.string(),
    slots: z.array(SLOT_VIEW),
    more: z.boolean(),
  });

  const MISSED = z.object({
    status: z.literal('invalid_slot'),
    note: z.string(),
    timeZone: z.string(),
    slots: z.array(
      z.object({ start: z.string(), end: z.string(), label: z.string() }),
    ),
  });

  it('answers a time that was never offered with the free times of that day in the visitor zone, and no contact block', async () => {
    // Singapore: a 09:00 UTC start read as 09:00 local.
    const tools = chatTools(context({ timeZone: 'Asia/Singapore' }));
    const shown = await run(tools, 'check_availability', {
      from: '2027-01-05',
      to: '2027-01-05',
    });
    const offeredStart = z
      .object({ slots: z.array(z.object({ start: z.string() })) })
      .parse(shown).slots[0]?.start;
    expect(offeredStart).toBe('2027-01-05T17:00:00+08:00');
    const history: ModelMessage[] = [
      {
        role: 'tool',
        content: [
          {
            type: 'tool-result',
            toolCallId: 'c',
            toolName: 'check_availability',
            output: { type: 'json', value: SHOWN.parse(shown) },
          },
        ],
      },
    ];
    const result = await run(
      tools,
      'book_meeting',
      { slot: '2027-01-05T09:00:00+08:00', topic: 'Automate our inbox triage' },
      history,
    );
    const missed = MISSED.parse(result);
    expect(missed.note).toMatch(/not free/);
    expect(missed.timeZone).toBe('Asia/Singapore');
    expect(missed.slots.length).toBeGreaterThan(0);
    for (const slot of missed.slots) {
      expect(slot.start).toMatch(/^2027-01-05T\d\d:\d\d:00\+08:00$/);
      expect(slot.label).toMatch(/^Tuesday 5 January, /);
    }
    expect(JSON.stringify(result)).not.toMatch(/contact|url/i);
    expect(proposals).toEqual([]);
  });

  it('books a start copied from the recovery answer', async () => {
    const tools = chatTools(context({ timeZone: 'Asia/Singapore' }));
    const missed = MISSED.parse(
      await run(tools, 'book_meeting', {
        slot: '2027-01-05T09:00:00+08:00',
        topic: 'Automate our inbox triage',
      }),
    );
    const [first] = missed.slots;
    if (first === undefined) throw new Error('expected a free time');
    const history: ModelMessage[] = [
      {
        role: 'tool',
        content: [
          {
            type: 'tool-result',
            toolCallId: 'b',
            toolName: 'book_meeting',
            output: { type: 'json', value: missed },
          },
        ],
      },
    ];
    const result = await run(
      tools,
      'book_meeting',
      { slot: first.start, topic: 'Automate our inbox triage' },
      history,
    );
    expect(result).toEqual({ status: 'awaiting_confirmation' });
    expect(proposals).toEqual([
      {
        slot: new Date(Date.parse(first.start)).toISOString(),
        topic: 'Automate our inbox triage',
      },
    ]);
  });

  it('answers a day with no free time with the nearest ones, marked', async () => {
    const result = await run(chatTools(context()), 'book_meeting', {
      slot: '2027-01-09T10:00:00+09:00',
      topic: 'Automate our inbox triage',
    });
    expect(result).toMatchObject({
      status: 'invalid_slot',
      requestedDays: 'no_free_times',
      note: 'That day is full; the nearest free times are in slots.',
    });
    expect(MISSED.parse(result).slots.length).toBeGreaterThan(0);
  });

  it('says the calendar could not be checked when it fails, never "below"', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    world.freebusyStatus = 500;
    const result = await run(chatTools(context()), 'book_meeting', {
      slot: SLOT,
      topic: 'Automate our inbox triage',
    });
    expect(result).toEqual({
      status: 'invalid_slot',
      calendar: 'unavailable',
      note: 'That time is not one of the offered times, and the calendar could not be checked just now.',
    });
    expect(proposals).toEqual([]);
  });

  it('proposes a time that was not shown but is free: the card and the server still check it', async () => {
    const result = await run(
      chatTools(context({ timeZone: 'Asia/Singapore' })),
      'book_meeting',
      { slot: '2027-01-05T17:00:00+08:00', topic: 'Automate our inbox triage' },
    );
    expect(result).toEqual({ status: 'awaiting_confirmation' });
    expect(proposals).toEqual([
      { slot: '2027-01-05T09:00:00.000Z', topic: 'Automate our inbox triage' },
    ]);
  });

  it('asks the calendar once for a miss on a day already shown', async () => {
    const tools = chatTools(context({ timeZone: 'Asia/Singapore' }));
    const before = world.freebusyCalls.length;
    const result = MISSED.parse(
      await run(
        tools,
        'book_meeting',
        {
          slot: '2027-01-05T09:00:00+08:00',
          topic: 'Automate our inbox triage',
        },
        offered('2027-01-05T09:00:00.000Z', '2027-01-05T09:30:00.000Z'),
      ),
    );
    expect(world.freebusyCalls.length).toBe(before + 1);
    expect(result.note).toBe(
      'That time is not free; the free times for that day are in slots.',
    );
    const starts = result.slots.map((slot) => slot.start);
    expect(starts).toContain('2027-01-05T17:00:00+08:00');
    expect(starts).toContain('2027-01-05T17:30:00+08:00');
  });

  it('proposes a free time on a shown day that was not among the shown times', async () => {
    const result = await run(
      chatTools(context({ timeZone: 'Asia/Singapore' })),
      'book_meeting',
      { slot: '2027-01-05T18:00:00+08:00', topic: 'Automate our inbox triage' },
      offered('2027-01-05T09:00:00.000Z'),
    );
    expect(result).toEqual({ status: 'awaiting_confirmation' });
    expect(proposals).toEqual([
      { slot: '2027-01-05T10:00:00.000Z', topic: 'Automate our inbox triage' },
    ]);
  });

  it('lists no earlier times when the calendar cannot be read for a shown day', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    world.freebusyStatus = 500;
    const result = await run(
      chatTools(context({ timeZone: 'Asia/Singapore' })),
      'book_meeting',
      { slot: '2027-01-05T09:00:00+08:00', topic: 'Automate our inbox triage' },
      offered('2027-01-05T09:00:00.000Z'),
    );
    expect(result).toMatchObject({
      status: 'invalid_slot',
      calendar: 'unavailable',
    });
    expect(result).not.toHaveProperty('slots');
  });

  it('looks at the day of the UTC-as-local misread too, across midnight (Honolulu)', async () => {
    // 09:00Z on Tuesday 5 January is 23:00 on Monday 4 January in Honolulu;
    // the model wrote it as 09:00 Honolulu time on the 5th.
    const result = MISSED.parse(
      await run(
        chatTools(context({ timeZone: 'Pacific/Honolulu' })),
        'book_meeting',
        {
          slot: '2027-01-05T09:00:00-10:00',
          topic: 'Automate our inbox triage',
        },
      ),
    );
    const starts = result.slots.map((slot) => slot.start);
    expect(starts).toContain('2027-01-04T23:00:00-10:00');
    expect(result.slots.length).toBeLessThanOrEqual(8);
    expect(starts).toEqual([...starts].sort());
  });

  it('centres the free times on the wanted time', async () => {
    // 13:07 Madrid on Tuesday 12 January: the nearest of its twelve slots.
    const result = MISSED.parse(
      await run(
        chatTools(context({ timeZone: 'Europe/Madrid' })),
        'book_meeting',
        {
          slot: '2027-01-12T13:07:00+01:00',
          topic: 'Automate our inbox triage',
        },
      ),
    );
    expect(result.slots).toHaveLength(8);
    const hours = result.slots.map((slot) => slot.start.slice(11, 16));
    expect(hours).toContain('13:00');
    expect(hours).toContain('13:30');
    expect(hours).not.toContain('10:00');
  });

  it('writes the note in the reply language', async () => {
    const result = MISSED.parse(
      await run(
        chatTools(context({ timeZone: 'Asia/Singapore', language: 'es' })),
        'book_meeting',
        {
          slot: '2027-01-05T09:00:00+08:00',
          topic: 'Automate our inbox triage',
        },
      ),
    );
    expect(result.note).toBe(
      'Esa hora no está libre; las horas libres de ese día están en slots.',
    );
  });
});

describe('navigate', () => {
  it('resolves the target on the server, per locale', async () => {
    expect(
      await run(chatTools(context()), 'navigate', { page: 'pricing' }),
    ).toEqual({ ok: true });
    expect(
      await run(chatTools(context({ locale: 'es' })), 'navigate', {
        page: 'pricing',
      }),
    ).toEqual({ ok: true });
    expect(
      await run(chatTools(context()), 'navigate', {
        page: 'home',
        section: 'faq',
      }),
    ).toEqual({ ok: true });
    expect(navigated).toEqual([
      { page: 'pricing', href: '/pricing' },
      { page: 'pricing', href: '/es/precios' },
      { page: 'home', section: 'faq', href: '/#faq' },
    ]);
  });

  it.each([
    ['an unknown page', { page: 'https://evil.example' }],
    ['a page the locale does not have', { page: 'verifactu' }],
    ['a section of another page', { page: 'pricing', section: 'nope' }],
  ])('answers ok:false for %s and emits nothing', async (_label, input) => {
    expect(await run(chatTools(context()), 'navigate', input)).toEqual({
      ok: false,
    });
    expect(navigated).toEqual([]);
  });

  it('does not open a page that is not published', async () => {
    const dark = { ...LIVE, calculator: { published: false } };
    const tools = chatTools(context({ site: dark }));
    expect(await run(tools, 'navigate', { page: 'calculator' })).toEqual({
      ok: false,
    });
  });
});
