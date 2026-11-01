import type { ModelMessage } from 'ai';
import { z } from 'zod';
import { CHAT_LIMITS } from '@/lib/chat-events';
import { locales } from '@/lib/i18n';
import { DAY_MS, HOUR_MS } from '@/lib/time';
import { type TurnUsage, utcDay } from '@/server/chat/usage';
import { errorName } from '@/server/responses';

const RETENTION_MS = 30 * DAY_MS;
const LINK_WINDOW_MS = 24 * HOUR_MS;
const HISTORY_LIMIT = 16;
const TOOL_RESULT_BYTES = 4096;

type SessionStart = {
  id: string;
  now: number;
  locale: (typeof locales)[number];
  model: string;
  startPage: string;
  isTest: boolean;
};

function sessionCounted(db: D1Database, day: string) {
  return db
    .prepare(
      `INSERT INTO ai_usage (day, sessions) VALUES (?1, 1)
       ON CONFLICT (day) DO UPDATE SET sessions = sessions + 1`,
    )
    .bind(day);
}

export async function createSession(
  db: D1Database,
  start: SessionStart,
): Promise<void> {
  await db.batch([
    db
      .prepare(
        `INSERT INTO chat_sessions (id, created_at, last_at, locale, model, start_page, user_messages, is_test)
         VALUES (?1, ?2, ?2, ?3, ?4, ?5, 1, ?6)`,
      )
      .bind(
        start.id,
        start.now,
        start.locale,
        start.model,
        start.startPage,
        start.isTest ? 1 : 0,
      ),
    sessionCounted(db, utcDay(start.now)),
  ]);
}

const sessionRowSchema = z.object({
  locale: z.enum(locales),
  is_test: z.union([z.literal(0), z.literal(1)]),
  user_messages: z.number(),
});

type ClaimedSession = {
  locale: (typeof locales)[number];
  isTest: boolean;
  userMessages: number;
};

type Claim =
  | { status: 'ok'; session: ClaimedSession }
  | { status: 'session' | 'session-full' };

// One atomic UPDATE enforces the cap, the idle expiry and the absolute expiry.
export async function claimTurn(
  db: D1Database,
  id: string,
  now: number,
): Promise<Claim> {
  const claimed = await db
    .prepare(
      `UPDATE chat_sessions SET user_messages = user_messages + 1, last_at = ?2
       WHERE id = ?1 AND user_messages < ?3 AND last_at > ?4 AND created_at > ?5
       RETURNING locale, is_test, user_messages`,
    )
    .bind(
      id,
      now,
      CHAT_LIMITS.messages,
      now - CHAT_LIMITS.idleMs,
      now - CHAT_LIMITS.absoluteMs,
    )
    .first();
  if (claimed !== null) {
    const row = sessionRowSchema.parse(claimed);
    return {
      status: 'ok',
      session: {
        locale: row.locale,
        isTest: row.is_test === 1,
        userMessages: row.user_messages,
      },
    };
  }
  const existing = await db
    .prepare(
      'SELECT user_messages, last_at, created_at FROM chat_sessions WHERE id = ?1',
    )
    .bind(id)
    .first();
  if (existing === null) return { status: 'session' };
  const row = z
    .object({
      user_messages: z.number(),
      last_at: z.number(),
      created_at: z.number(),
    })
    .parse(existing);
  const expired =
    row.last_at <= now - CHAT_LIMITS.idleMs ||
    row.created_at <= now - CHAT_LIMITS.absoluteMs;
  return {
    status:
      !expired && row.user_messages >= CHAT_LIMITS.messages
        ? 'session-full'
        : 'session',
  };
}

const messageRowSchema = z.object({ role: z.string(), content: z.string() });

// The subset of AI SDK messages that gets stored: the visitor's text, the
// assistant's tool calls and closing text, and tool results. Parsing it here,
// not with the SDK's schema, keeps the SDK out of every route that touches D1.
const toolCallSchema = z.object({
  type: z.literal('tool-call'),
  toolCallId: z.string(),
  toolName: z.string(),
  input: z.unknown(),
});
// Every output type the SDK can write for a tool result. A failed tool call is
// stored as `error-text` or `error-json`; leaving one out would make every row
// after it unreadable.
const toolOutputSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('text'), value: z.string() }),
  z.object({ type: z.literal('json'), value: z.json() }),
  z.object({ type: z.literal('error-text'), value: z.string() }),
  z.object({ type: z.literal('error-json'), value: z.json() }),
  z.object({
    type: z.literal('execution-denied'),
    reason: z.string().optional(),
  }),
  z.object({
    type: z.literal('content'),
    value: z.array(z.object({ type: z.literal('text'), text: z.string() })),
  }),
]);
const toolResultSchema = z.object({
  type: z.literal('tool-result'),
  toolCallId: z.string(),
  toolName: z.string(),
  output: toolOutputSchema,
});
const storedMessageSchema = z.discriminatedUnion('role', [
  z.object({ role: z.literal('user'), content: z.string() }),
  z.object({
    role: z.literal('assistant'),
    content: z.union([z.string(), z.array(toolCallSchema)]),
  }),
  z.object({ role: z.literal('tool'), content: z.array(toolResultSchema) }),
]);

function parseMessage(content: string): ModelMessage | null {
  try {
    const parsed = storedMessageSchema.safeParse(JSON.parse(content));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

type Kept = { message: ModelMessage; chars: number };

// A row that cannot be read is skipped on its own. A tool call whose result is
// gone (or the other way round) goes with it, since a provider rejects a half pair.
function pairedOnly(kept: readonly Kept[]): Kept[] {
  const calls = new Set<string>();
  const results = new Set<string>();
  for (const { message } of kept) {
    if (message.role === 'tool') {
      for (const part of message.content) {
        if (part.type === 'tool-result') results.add(part.toolCallId);
      }
    } else if (message.role === 'assistant' && Array.isArray(message.content)) {
      for (const part of message.content) {
        if (part.type === 'tool-call') calls.add(part.toolCallId);
      }
    }
  }
  return kept.filter(({ message }) => {
    if (message.role === 'tool') {
      return message.content.every(
        (part) => part.type !== 'tool-result' || calls.has(part.toolCallId),
      );
    }
    if (message.role === 'assistant' && Array.isArray(message.content)) {
      return message.content.every(
        (part) => part.type !== 'tool-call' || results.has(part.toolCallId),
      );
    }
    return true;
  });
}

// The last rows of the transcript, cut so the first message is the visitor's.
export async function history(
  db: D1Database,
  id: string,
  limit: number = HISTORY_LIMIT,
): Promise<{ messages: ModelMessage[]; chars: number }> {
  const { results } = await db
    .prepare(
      'SELECT role, content FROM chat_messages WHERE session_id = ?1 ORDER BY id DESC LIMIT ?2',
    )
    .bind(id, limit)
    .all();
  const rows = results
    .flatMap((raw) => {
      const row = messageRowSchema.safeParse(raw);
      return row.success ? [row.data] : [];
    })
    .reverse();
  const first = rows.findIndex((row) => row.role === 'user');
  if (first === -1) return { messages: [], chars: 0 };
  const kept = pairedOnly(
    rows.slice(first).flatMap((row) => {
      const message = parseMessage(row.content);
      return message === null ? [] : [{ message, chars: row.content.length }];
    }),
  );
  const start = kept.findIndex(({ message }) => message.role === 'user');
  const used = start === -1 ? [] : kept.slice(start);
  return {
    messages: used.map(({ message }) => message),
    chars: used.reduce((sum, { chars }) => sum + chars, 0),
  };
}

type StoredTurn = {
  sessionId: string;
  now: number;
  user: string;
  responseMessages: readonly ModelMessage[];
  shown: string;
  usage: TurnUsage;
  neurons: number;
  // What the turn set aside before it ran; the day's total is corrected by the difference.
  reserved: number;
  guards: number;
};

function clip(text: string): string {
  const bytes = new TextEncoder().encode(text);
  return bytes.length <= TOOL_RESULT_BYTES
    ? text
    : new TextDecoder().decode(bytes.slice(0, TOOL_RESULT_BYTES));
}

// Tool results are cut to 4 KB; a cut one is kept as text, no longer JSON.
function storableTool(message: ModelMessage): ModelMessage {
  if (message.role !== 'tool') return message;
  return {
    ...message,
    content: message.content.map((part) => {
      if (part.type !== 'tool-result') return part;
      const json = JSON.stringify(part.output);
      return new TextEncoder().encode(json).length <= TOOL_RESULT_BYTES
        ? part
        : { ...part, output: { type: 'text' as const, value: clip(json) } };
    }),
  };
}

// An assistant step keeps only its tool calls; the text the visitor saw is
// stored once, guarded, in the closing assistant row.
function storableAssistant(message: ModelMessage): ModelMessage | null {
  if (message.role !== 'assistant' || typeof message.content === 'string') {
    return null;
  }
  const calls = message.content.filter((part) => part.type === 'tool-call');
  return calls.length === 0 ? null : { ...message, content: calls };
}

function storableMessages(messages: readonly ModelMessage[]): ModelMessage[] {
  return messages.flatMap((message) => {
    if (message.role === 'tool') return [storableTool(message)];
    const assistant = storableAssistant(message);
    return assistant === null ? [] : [assistant];
  });
}

export async function persistTurn(
  db: D1Database,
  turn: StoredTurn,
): Promise<void> {
  const insert = db.prepare(
    'INSERT INTO chat_messages (session_id, created_at, role, content, shown) VALUES (?1, ?2, ?3, ?4, ?5)',
  );
  const add = (message: ModelMessage, shown: string | null) =>
    insert.bind(
      turn.sessionId,
      turn.now,
      message.role,
      JSON.stringify(message),
      shown,
    );
  const statements = [
    add({ role: 'user', content: turn.user }, turn.user),
    ...storableMessages(turn.responseMessages).map((message) =>
      add(message, null),
    ),
    ...(turn.shown === ''
      ? []
      : [add({ role: 'assistant', content: turn.shown }, turn.shown)]),
    db
      .prepare(
        `UPDATE chat_sessions SET input_tokens = input_tokens + ?2, output_tokens = output_tokens + ?3,
           neurons = neurons + ?4, guards = guards + ?5 WHERE id = ?1`,
      )
      .bind(
        turn.sessionId,
        turn.usage.inputTokens,
        turn.usage.outputTokens,
        turn.neurons,
        turn.guards,
      ),
    db
      .prepare(
        `INSERT INTO ai_usage (day, turns, input_tokens, cached_input_tokens, output_tokens, neurons)
         VALUES (?1, 1, ?2, ?3, ?4, ?5)
         ON CONFLICT (day) DO UPDATE SET turns = turns + 1,
           input_tokens = input_tokens + ?2, cached_input_tokens = cached_input_tokens + ?3,
           output_tokens = output_tokens + ?4, neurons = neurons + ?5`,
      )
      .bind(
        utcDay(turn.now),
        turn.usage.inputTokens,
        turn.usage.cachedInputTokens,
        turn.usage.outputTokens,
        turn.neurons - turn.reserved,
      ),
  ];
  await db.batch(statements);
}

export async function todayNeurons(
  db: D1Database,
  day: string,
): Promise<number> {
  const row = await db
    .prepare('SELECT neurons FROM ai_usage WHERE day = ?1')
    .bind(day)
    .first();
  return row === null
    ? 0
    : z.object({ neurons: z.number() }).parse(row).neurons;
}

export async function refuse(db: D1Database, day: string): Promise<void> {
  await db
    .prepare(
      `INSERT INTO ai_usage (day, refused) VALUES (?1, 1)
       ON CONFLICT (day) DO UPDATE SET refused = refused + 1`,
    )
    .bind(day)
    .run();
}

// A session may be attached to a lead only on the visit it belongs to.
async function linkableSession(
  db: D1Database,
  id: string,
  now: number,
): Promise<boolean> {
  const row = await db
    .prepare(
      'SELECT 1 AS found FROM chat_sessions WHERE id = ?1 AND created_at > ?2',
    )
    .bind(id, now - LINK_WINDOW_MS)
    .first();
  return row !== null;
}

// The session a lead or booking may link to: only while the assistant is
// published, and only on the visit it belongs to. A failed read links nothing.
export async function linkedChatSession(
  db: D1Database,
  site: { assistant: { published: boolean } },
  id: string | undefined,
  now: number,
): Promise<string | null> {
  if (id === undefined || !site.assistant.published) return null;
  try {
    return (await linkableSession(db, id, now)) ? id : null;
  } catch (error) {
    console.error('chat: link failed', { code: errorName(error) });
    return null;
  }
}

const transcriptSessionSchema = z.object({
  created_at: z.number(),
  locale: z.enum(locales),
  model: z.string(),
  start_page: z.string(),
  user_messages: z.number(),
  neurons: z.number(),
  guards: z.number(),
  is_test: z.number(),
});

const transcriptMessageSchema = z.object({
  created_at: z.number(),
  role: z.enum(['user', 'assistant', 'tool']),
  content: z.string(),
  shown: z.string().nullable(),
});

export type Transcript = {
  session: z.output<typeof transcriptSessionSchema>;
  messages: Array<{
    at: number;
    role: 'user' | 'assistant' | 'tool';
    text: string;
  }>;
};

const toolNameSchema = z.object({
  content: z.array(z.object({ toolName: z.string().optional() })),
});

function toolNames(content: string): string {
  try {
    const parsed = toolNameSchema.safeParse(JSON.parse(content));
    if (!parsed.success) return 'tool';
    return parsed.data.content
      .map((part) => part.toolName ?? 'tool')
      .join(', ');
  } catch {
    return 'tool';
  }
}

export async function transcript(
  db: D1Database,
  id: string,
): Promise<Transcript | null> {
  const [session, messages] = await db.batch([
    db
      .prepare(
        `SELECT created_at, locale, model, start_page, user_messages, neurons, guards, is_test
         FROM chat_sessions WHERE id = ?1`,
      )
      .bind(id),
    db
      .prepare(
        'SELECT created_at, role, content, shown FROM chat_messages WHERE session_id = ?1 ORDER BY id',
      )
      .bind(id),
  ]);
  const head = transcriptSessionSchema.safeParse(session?.results[0]);
  if (!head.success) return null;
  return {
    session: head.data,
    messages: (messages?.results ?? []).flatMap((raw) => {
      const row = transcriptMessageSchema.safeParse(raw);
      if (!row.success) return [];
      const { role, shown, content, created_at } = row.data;
      if (role === 'tool') return [];
      const called = role === 'assistant' && shown === null;
      return [
        {
          at: created_at,
          role: called ? ('tool' as const) : role,
          text: called ? toolNames(content) : (shown ?? ''),
        },
      ];
    }),
  };
}

// Unlinked sessions go 30 days after they start; their messages follow by cascade.
// RETURNING counts the sessions, not the cascaded rows. The per-address counters
// of yesterday and older go with them.
export async function purgeChats(db: D1Database, now: number): Promise<number> {
  const [sessions] = await db.batch([
    db
      .prepare(
        `DELETE FROM chat_sessions
         WHERE created_at < ?1
           AND id NOT IN (SELECT chat_session_id FROM leads WHERE chat_session_id IS NOT NULL)
         RETURNING id`,
      )
      .bind(now - RETENTION_MS),
    db
      .prepare('DELETE FROM chat_ip_usage WHERE day < ?1')
      .bind(utcDay(now - DAY_MS)),
  ]);
  return sessions?.results.length ?? 0;
}

// Sets neurons aside for a turn before it runs, unless that would pass the
// day's budget. One atomic statement, so turns in parallel cannot all pass.
export async function reserveNeurons(
  db: D1Database,
  day: string,
  estimate: number,
  budget: number,
): Promise<boolean> {
  if (estimate <= 0) return true;
  if (estimate > budget) return false;
  const row = await db
    .prepare(
      `INSERT INTO ai_usage (day, neurons) VALUES (?1, ?2)
       ON CONFLICT (day) DO UPDATE SET neurons = neurons + ?2 WHERE neurons + ?2 <= ?3
       RETURNING neurons`,
    )
    .bind(day, estimate, budget)
    .first();
  return row !== null;
}

const encoder = new TextEncoder();

async function addressKey(secret: string, day: string, address: string) {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const mac = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(`${day}|${address}`),
  );
  return [...new Uint8Array(mac).slice(0, 16)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

// Counts one turn for this address today, unless it already used its share.
// The address is never stored: only a keyed fingerprint that cannot be reversed.
export async function countAddressTurn(
  db: D1Database,
  {
    secret,
    address,
    day,
    limit,
  }: {
    secret: string;
    address: string;
    day: string;
    limit: number;
  },
): Promise<boolean> {
  const row = await db
    .prepare(
      `INSERT INTO chat_ip_usage (day, key, turns) VALUES (?1, ?2, 1)
       ON CONFLICT (day, key) DO UPDATE SET turns = turns + 1 WHERE turns < ?3
       RETURNING turns`,
    )
    .bind(day, await addressKey(secret, day, address), limit)
    .first();
  return row !== null;
}
