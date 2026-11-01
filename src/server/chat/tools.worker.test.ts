import { env } from 'cloudflare:workers';
import type { ModelMessage } from 'ai';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import type { Proposal } from '@/lib/chat-events';
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
          value: { slots: starts.map((start) => ({ start })) },
        },
      },
    ],
  },
];

beforeEach(async () => {
  world = newWorld();
  background = [];
  navigated = [];
  proposals = [];
  secret = JSON.stringify((await signingCredentials()).credentials);
  clearTokenCache();
  clearBusyCache();
  await DB.prepare('DELETE FROM bookings').run();
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
    expect(result).toEqual({ status: 'invalid_slot' });
    expect(proposals).toEqual([]);
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
