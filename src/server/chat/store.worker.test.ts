import { env } from 'cloudflare:workers';
import { beforeEach, describe, expect, it } from 'vitest';
import { HOUR_MS as HOUR } from '@/lib/time';
import {
  claimTurn,
  countAddressTurn,
  createSession,
  history,
  linkedChatSession,
  persistTurn,
  purgeChats,
  refuse,
  reserveNeurons,
  todayNeurons,
  transcript,
} from '@/server/chat/store';
import { utcDay } from '@/server/chat/usage';
import { storeLead } from '@/server/lead-store';
import { DAY, NEW_LEAD } from '../../../test/leads';

const { DB } = env;
const NOW = Date.UTC(2026, 10, 1, 12, 0);
const ID = '5f0c2a52-6f4e-4a6c-9d4e-0b1d7b3b0a11';
const USAGE = { inputTokens: 1_000, cachedInputTokens: 100, outputTokens: 50 };

function start(id = ID, now = NOW) {
  return createSession(DB, {
    id,
    now,
    locale: 'en',
    model: 'fake',
    startPage: '/pricing',
    isTest: false,
  });
}

function turn(id: string, now: number, user: string, shown: string) {
  return persistTurn(DB, {
    sessionId: id,
    now,
    user,
    responseMessages: [],
    shown,
    usage: USAGE,
    neurons: 7,
    reserved: 0,
    guards: 1,
  });
}

async function count(table: string): Promise<number> {
  const row = await DB.prepare(`SELECT COUNT(*) AS n FROM ${table}`).first<{
    n: number;
  }>();
  return row?.n ?? 0;
}

beforeEach(async () => {
  await DB.batch([
    DB.prepare('DELETE FROM chat_sessions'),
    DB.prepare('DELETE FROM ai_usage'),
    DB.prepare('DELETE FROM chat_ip_usage'),
    DB.prepare('DELETE FROM leads'),
  ]);
});

describe('createSession', () => {
  it('stores the session with its first message counted and counts it for the day', async () => {
    await start();
    expect(
      await DB.prepare('SELECT * FROM chat_sessions').first(),
    ).toMatchObject({
      id: ID,
      user_messages: 1,
      locale: 'en',
      is_test: 0,
      start_page: '/pricing',
    });
    expect(await DB.prepare('SELECT * FROM ai_usage').first()).toMatchObject({
      day: '2026-11-01',
      sessions: 1,
    });
    await start('6f0c2a52-6f4e-4a6c-9d4e-0b1d7b3b0a11', NOW + 1);
    expect(await DB.prepare('SELECT sessions FROM ai_usage').first()).toEqual({
      sessions: 2,
    });
  });

  it('stores no IP address column at all', async () => {
    const { results } = await DB.prepare(
      'PRAGMA table_info(chat_sessions)',
    ).all<{ name: string }>();
    expect(results.map((column) => column.name).join(' ')).not.toMatch(
      /ip|address/i,
    );
  });
});

describe('claimTurn', () => {
  it('lets a session send 20 messages, then reports it full', async () => {
    await start();
    for (let used = 2; used <= 20; used += 1) {
      expect(await claimTurn(DB, ID, NOW + used)).toMatchObject({
        status: 'ok',
        session: { userMessages: used, locale: 'en', isTest: false },
      });
    }
    expect(await claimTurn(DB, ID, NOW + 21)).toEqual({
      status: 'session-full',
    });
  });

  it('gives exactly one of two concurrent claims at 19 messages', async () => {
    await start();
    await DB.prepare('UPDATE chat_sessions SET user_messages = 19').run();
    const claims = await Promise.all([
      claimTurn(DB, ID, NOW + 1),
      claimTurn(DB, ID, NOW + 1),
    ]);
    expect(claims.map((claim) => claim.status).sort()).toEqual([
      'ok',
      'session-full',
    ]);
  });

  it('expires after 2 hours idle and after 24 hours in all', async () => {
    await start();
    expect((await claimTurn(DB, ID, NOW + 2 * HOUR - 1)).status).toBe('ok');
    expect(
      (await claimTurn(DB, ID, NOW + 2 * HOUR - 1 + 2 * HOUR + 1)).status,
    ).toBe('session');
    const old = '7f0c2a52-6f4e-4a6c-9d4e-0b1d7b3b0a11';
    await start(old, NOW);
    await DB.prepare('UPDATE chat_sessions SET last_at = ?2 WHERE id = ?1')
      .bind(old, NOW + 24 * HOUR - 1)
      .run();
    expect((await claimTurn(DB, old, NOW + 24 * HOUR - 1)).status).toBe('ok');
    expect((await claimTurn(DB, old, NOW + 24 * HOUR + 1)).status).toBe(
      'session',
    );
  });

  it('reports an unknown id as a missing session', async () => {
    expect(await claimTurn(DB, ID, NOW)).toEqual({ status: 'session' });
  });
});

describe('persistTurn and history', () => {
  it('stores the user message, the tool exchange and the guarded text, then reads them back', async () => {
    await start();
    await persistTurn(DB, {
      sessionId: ID,
      now: NOW + 5,
      user: 'How much?',
      responseMessages: [
        {
          role: 'assistant',
          content: [
            { type: 'text', text: 'let me look' },
            {
              type: 'tool-call',
              toolCallId: 'c1',
              toolName: 'get_pricing',
              input: { service: 'agent' },
            },
          ],
        },
        {
          role: 'tool',
          content: [
            {
              type: 'tool-result',
              toolCallId: 'c1',
              toolName: 'get_pricing',
              output: { type: 'json', value: { ok: 1 } },
            },
          ],
        },
        {
          role: 'assistant',
          content: [{ type: 'text', text: 'raw model text' }],
        },
      ],
      shown: 'It costs S$15,000–35,000.',
      usage: USAGE,
      neurons: 7,
      reserved: 0,
      guards: 0,
    });
    const { messages: rows } = await history(DB, ID);
    expect(rows.map((message) => message.role)).toEqual([
      'user',
      'assistant',
      'tool',
      'assistant',
    ]);
    const [, call, , closing] = rows;
    expect(call?.content).toEqual([
      {
        type: 'tool-call',
        toolCallId: 'c1',
        toolName: 'get_pricing',
        input: { service: 'agent' },
      },
    ]);
    expect(closing?.content).toBe('It costs S$15,000–35,000.');
    expect(JSON.stringify(rows)).not.toContain('let me look');
    expect(JSON.stringify(rows)).not.toContain('raw model text');
  });

  it('cuts a tool result to 4 KB', async () => {
    await start();
    await persistTurn(DB, {
      sessionId: ID,
      now: NOW,
      user: 'x',
      responseMessages: [
        {
          role: 'assistant',
          content: [
            {
              type: 'tool-call',
              toolCallId: 'c',
              toolName: 'get_faq',
              input: {},
            },
          ],
        },
        {
          role: 'tool',
          content: [
            {
              type: 'tool-result',
              toolCallId: 'c',
              toolName: 'get_faq',
              output: { type: 'json', value: { text: 'a'.repeat(9_000) } },
            },
          ],
        },
      ],
      shown: '',
      usage: USAGE,
      neurons: 0,
      reserved: 0,
      guards: 0,
    });
    const row = await DB.prepare(
      "SELECT content FROM chat_messages WHERE role = 'tool'",
    ).first<{ content: string }>();
    expect(row?.content.length ?? 0).toBeLessThan(4_400);
  });

  it('adds up the counters and the day across turns', async () => {
    await start();
    await turn(ID, NOW, 'one', 'a');
    await turn(ID, NOW + 1, 'two', 'b');
    expect(
      await DB.prepare(
        'SELECT input_tokens, output_tokens, neurons, guards FROM chat_sessions',
      ).first(),
    ).toEqual({
      input_tokens: 2_000,
      output_tokens: 100,
      neurons: 14,
      guards: 2,
    });
    expect(await DB.prepare('SELECT * FROM ai_usage').first()).toMatchObject({
      turns: 2,
      input_tokens: 2_000,
      cached_input_tokens: 200,
      output_tokens: 100,
      neurons: 14,
    });
  });

  it('returns the last 16 rows, starting at a visitor message', async () => {
    await start();
    for (let index = 1; index <= 10; index += 1) {
      await turn(ID, NOW + index, `question ${index}`, `answer ${index}`);
    }
    const { messages: rows } = await history(DB, ID);
    expect(rows).toHaveLength(16);
    expect(rows[0]).toEqual({ role: 'user', content: 'question 3' });
    expect(rows.at(-1)).toEqual({ role: 'assistant', content: 'answer 10' });
  });

  it('reports how many characters of history it read', async () => {
    await start();
    await turn(ID, NOW, 'q', 'a');
    const { rows } = await DB.prepare(
      'SELECT SUM(LENGTH(content)) AS rows FROM chat_messages',
    )
      .first<{ rows: number }>()
      .then((r) => ({ rows: r?.rows ?? 0 }));
    expect((await history(DB, ID)).chars).toBe(rows);
  });

  it('drops a window that starts on an assistant row', async () => {
    await start();
    await turn(ID, NOW, 'q', 'a');
    expect((await history(DB, ID, 1)).messages).toEqual([]);
  });

  it('refuses content that is not JSON', async () => {
    await start();
    await expect(
      DB.prepare(
        "INSERT INTO chat_messages (session_id, created_at, role, content) VALUES (?1, ?2, 'user', 'not json')",
      )
        .bind(ID, NOW)
        .run(),
    ).rejects.toThrow();
  });
});

describe('budget and links', () => {
  it("reads today's neurons, counts a refusal and cuts the day at midnight UTC", async () => {
    expect(await todayNeurons(DB, '2026-11-01')).toBe(0);
    await start();
    await turn(ID, NOW, 'q', 'a');
    expect(await todayNeurons(DB, utcDay(NOW))).toBe(7);
    expect(await todayNeurons(DB, '2026-11-02')).toBe(0);
    await refuse(DB, '2026-11-01');
    await refuse(DB, '2026-11-01');
    expect(await DB.prepare('SELECT refused FROM ai_usage').first()).toEqual({
      refused: 2,
    });
  });

  it('links a session only within 24 hours of its start, and only while the assistant is published', async () => {
    const live = { assistant: { published: true } };
    await start();
    expect(await linkedChatSession(DB, live, ID, NOW + 24 * HOUR - 1)).toBe(ID);
    expect(
      await linkedChatSession(DB, live, ID, NOW + 24 * HOUR + 1),
    ).toBeNull();
    expect(
      await linkedChatSession(
        DB,
        live,
        '8f0c2a52-6f4e-4a6c-9d4e-0b1d7b3b0a11',
        NOW,
      ),
    ).toBeNull();
    expect(await linkedChatSession(DB, live, undefined, NOW)).toBeNull();
    expect(
      await linkedChatSession(DB, { assistant: { published: false } }, ID, NOW),
    ).toBeNull();
  });
});

describe('transcript', () => {
  it('lists the visitor and assistant text in order and the tool by name only', async () => {
    await start();
    await persistTurn(DB, {
      sessionId: ID,
      now: NOW,
      user: 'Prices?',
      responseMessages: [
        {
          role: 'assistant',
          content: [
            {
              type: 'tool-call',
              toolCallId: 'c',
              toolName: 'get_pricing',
              input: { secret: 'x' },
            },
          ],
        },
        {
          role: 'tool',
          content: [
            {
              type: 'tool-result',
              toolCallId: 'c',
              toolName: 'get_pricing',
              output: { type: 'json', value: { big: 1 } },
            },
          ],
        },
      ],
      shown: 'See below.',
      usage: USAGE,
      neurons: 0,
      reserved: 0,
      guards: 0,
    });
    const found = await transcript(DB, ID);
    expect(found?.session).toMatchObject({
      locale: 'en',
      start_page: '/pricing',
      user_messages: 1,
    });
    expect(found?.messages.map(({ role, text }) => [role, text])).toEqual([
      ['user', 'Prices?'],
      ['tool', 'get_pricing'],
      ['assistant', 'See below.'],
    ]);
    expect(
      await transcript(DB, '9f0c2a52-6f4e-4a6c-9d4e-0b1d7b3b0a11'),
    ).toBeNull();
  });
});

describe('purgeChats', () => {
  it('deletes unlinked sessions after 30 days with their messages, and keeps the rest', async () => {
    const old = '1a0c2a52-6f4e-4a6c-9d4e-0b1d7b3b0a11';
    const fresh = '2a0c2a52-6f4e-4a6c-9d4e-0b1d7b3b0a11';
    const linked = '3a0c2a52-6f4e-4a6c-9d4e-0b1d7b3b0a11';
    await start(old, NOW - 31 * DAY);
    await turn(old, NOW - 31 * DAY, 'q', 'a');
    await start(fresh, NOW - 29 * DAY);
    await start(linked, NOW - 31 * DAY);
    await turn(linked, NOW - 31 * DAY, 'q', 'a');
    const [owner] = await storeLead(
      DB,
      { ...NEW_LEAD, chat_session_id: linked },
      NOW - 31 * DAY,
    );
    expect(await purgeChats(DB, NOW)).toBe(1);
    expect(await count('chat_sessions')).toBe(2);
    expect(await count('chat_messages')).toBe(2);
    await DB.prepare('DELETE FROM leads WHERE id = ?1')
      .bind(owner?.lead.id ?? '')
      .run();
    expect(await purgeChats(DB, NOW)).toBe(1);
    expect(await count('chat_sessions')).toBe(1);
  });
});

const FAILED_CALL = [
  {
    role: 'assistant' as const,
    content: [
      {
        type: 'tool-call' as const,
        toolCallId: 'c1',
        toolName: 'get_faq',
        input: {},
      },
    ],
  },
  {
    role: 'tool' as const,
    content: [
      {
        type: 'tool-result' as const,
        toolCallId: 'c1',
        toolName: 'get_faq',
        output: { type: 'error-text' as const, value: 'tool failed' },
      },
    ],
  },
];

describe('history after a failed tool call', () => {
  it('reads an error-text output back, so one failed call does not empty the history', async () => {
    await start();
    await persistTurn(DB, {
      sessionId: ID,
      now: NOW,
      user: 'q1',
      responseMessages: FAILED_CALL,
      shown: 'sorry',
      usage: USAGE,
      neurons: 1,
      reserved: 0,
      guards: 0,
    });
    await turn(ID, NOW + 1, 'q2', 'a2');
    const { messages } = await history(DB, ID);
    expect(messages.map((message) => message.role)).toEqual([
      'user',
      'assistant',
      'tool',
      'assistant',
      'user',
      'assistant',
    ]);
    expect(JSON.stringify(messages)).toContain('error-text');
  });

  it.each([
    ['error-json', { type: 'error-json', value: { code: 1 } }],
    ['execution-denied', { type: 'execution-denied', reason: 'no' }],
    ['content', { type: 'content', value: [{ type: 'text', text: 'hi' }] }],
  ])('reads a %s output', async (_label, output) => {
    await start();
    const row = (role: string, content: unknown) =>
      DB.prepare(
        'INSERT INTO chat_messages (session_id, created_at, role, content) VALUES (?1, ?2, ?3, ?4)',
      ).bind(ID, NOW, role, JSON.stringify(content));
    await DB.batch([
      row('user', { role: 'user', content: 'q' }),
      row('assistant', {
        role: 'assistant',
        content: [
          { type: 'tool-call', toolCallId: 'c', toolName: 't', input: {} },
        ],
      }),
      row('tool', {
        role: 'tool',
        content: [
          { type: 'tool-result', toolCallId: 'c', toolName: 't', output },
        ],
      }),
    ]);
    expect((await history(DB, ID)).messages).toHaveLength(3);
  });

  it('skips a row it cannot read on its own and keeps the rest', async () => {
    await start();
    await turn(ID, NOW, 'first', 'answer one');
    await DB.prepare(
      'INSERT INTO chat_messages (session_id, created_at, role, content) VALUES (?1, ?2, \'assistant\', \'{"role":"assistant","content":42}\')',
    )
      .bind(ID, NOW)
      .run();
    await turn(ID, NOW + 1, 'second', 'answer two');
    const { messages } = await history(DB, ID);
    expect(messages.map((message) => message.content)).toEqual([
      'first',
      'answer one',
      'second',
      'answer two',
    ]);
  });

  it('drops a tool call whose result row is unreadable, and the other way round', async () => {
    await start();
    await persistTurn(DB, {
      sessionId: ID,
      now: NOW,
      user: 'q1',
      responseMessages: FAILED_CALL,
      shown: 'a1',
      usage: USAGE,
      neurons: 0,
      reserved: 0,
      guards: 0,
    });
    await DB.prepare(
      'UPDATE chat_messages SET content = \'{"role":"tool","content":"broken"}\' WHERE role = \'tool\'',
    ).run();
    await turn(ID, NOW + 1, 'q2', 'a2');
    const { messages } = await history(DB, ID);
    expect(messages.map((message) => message.role)).toEqual([
      'user',
      'assistant',
      'user',
      'assistant',
    ]);
    expect(JSON.stringify(messages)).not.toContain('tool-call');
  });

  it('cuts a tool result by UTF-8 bytes, not by characters', async () => {
    await start();
    // 1,500 three-byte characters are 4,500 bytes but only 1,500 characters.
    await persistTurn(DB, {
      sessionId: ID,
      now: NOW,
      user: 'q',
      responseMessages: [
        ...FAILED_CALL.slice(0, 1),
        {
          role: 'tool',
          content: [
            {
              type: 'tool-result',
              toolCallId: 'c1',
              toolName: 'get_faq',
              output: { type: 'json', value: { text: '€'.repeat(1_500) } },
            },
          ],
        },
      ],
      shown: '',
      usage: USAGE,
      neurons: 0,
      reserved: 0,
      guards: 0,
    });
    const row = await DB.prepare(
      "SELECT content FROM chat_messages WHERE role = 'tool'",
    ).first<{ content: string }>();
    expect(row?.content).toContain('"type":"text"');
    expect(new TextEncoder().encode(row?.content ?? '').length).toBeLessThan(
      4_400,
    );
  });
});

describe('reserveNeurons', () => {
  it('sets neurons aside until the budget would be passed', async () => {
    expect(await reserveNeurons(DB, '2026-11-01', 60, 100)).toBe(true);
    expect(await reserveNeurons(DB, '2026-11-01', 60, 100)).toBe(false);
    expect(await reserveNeurons(DB, '2026-11-01', 40, 100)).toBe(true);
    expect(await todayNeurons(DB, '2026-11-01')).toBe(100);
  });

  it('lets only as many parallel turns through as the budget holds', async () => {
    const results = await Promise.all(
      Array.from({ length: 6 }, () =>
        reserveNeurons(DB, '2026-11-01', 40, 100),
      ),
    );
    expect(results.filter(Boolean)).toHaveLength(2);
    expect(await todayNeurons(DB, '2026-11-01')).toBe(80);
  });

  it('refuses an estimate bigger than the whole budget, and asks nothing for the scripted model', async () => {
    expect(await reserveNeurons(DB, '2026-11-02', 500, 100)).toBe(false);
    expect(await todayNeurons(DB, '2026-11-02')).toBe(0);
    expect(await reserveNeurons(DB, '2026-11-02', 0, 100)).toBe(true);
  });

  it('is corrected by the real cost when the turn is stored', async () => {
    await start();
    expect(await reserveNeurons(DB, utcDay(NOW), 121, 1_000)).toBe(true);
    await persistTurn(DB, {
      sessionId: ID,
      now: NOW,
      user: 'q',
      responseMessages: [],
      shown: 'a',
      usage: USAGE,
      neurons: 55,
      reserved: 121,
      guards: 0,
    });
    expect(await todayNeurons(DB, utcDay(NOW))).toBe(55);
    expect(
      await DB.prepare('SELECT neurons FROM chat_sessions').first(),
    ).toEqual({ neurons: 55 });
  });
});

describe('countAddressTurn', () => {
  const count = (address: string, day = '2026-11-01') =>
    countAddressTurn(DB, { secret: 'k', address, day, limit: 3 });

  it('allows an address its share a day, then stops it, without touching others', async () => {
    expect(await count('203.0.113.7')).toBe(true);
    expect(await count('203.0.113.7')).toBe(true);
    expect(await count('203.0.113.7')).toBe(true);
    expect(await count('203.0.113.7')).toBe(false);
    expect(await count('203.0.113.8')).toBe(true);
    expect(await count('203.0.113.7', '2026-11-02')).toBe(true);
  });

  it('stores a keyed fingerprint, never the address', async () => {
    await count('203.0.113.7');
    const row = await DB.prepare('SELECT key FROM chat_ip_usage').first<{
      key: string;
    }>();
    expect(row?.key).toMatch(/^[0-9a-f]{32}$/);
    expect(row?.key).not.toContain('203');
    await DB.prepare('DELETE FROM chat_ip_usage').run();
    expect(
      await countAddressTurn(DB, {
        secret: 'other',
        address: '203.0.113.7',
        day: '2026-11-01',
        limit: 3,
      }),
    ).toBe(true);
    expect(
      (
        await DB.prepare('SELECT key FROM chat_ip_usage').first<{
          key: string;
        }>()
      )?.key,
    ).not.toBe(row?.key);
  });

  it('is purged after yesterday', async () => {
    await count('a', '2026-10-30');
    await count('b', '2026-10-31');
    await count('c', '2026-11-01');
    await purgeChats(DB, Date.UTC(2026, 10, 1, 3));
    const { results } = await DB.prepare(
      'SELECT day FROM chat_ip_usage ORDER BY day',
    ).all();
    expect(results.map((row) => row.day)).toEqual(['2026-10-31', '2026-11-01']);
  });
});
