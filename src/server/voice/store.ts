import { z } from 'zod';
import { locales } from '@/lib/i18n';
import { DAY_MS } from '@/lib/time';
import { VOICE_SETTINGS } from '@/server/voice/settings';

const RETENTION_MS = VOICE_SETTINGS.retentionDays * DAY_MS;

type NewSession = {
  id: string;
  now: number;
  day: string;
  locale: (typeof locales)[number];
  timeZone: string;
  startPage: string;
  isTest: boolean;
  cap: number;
};

// One conditional INSERT, so calls in parallel cannot pass the day's cap. The
// cap is shared by every session of the day, previews included: a preview alias
// is public and spends the same ElevenLabs minutes.
export async function claimVoiceSession(
  db: D1Database,
  session: NewSession,
): Promise<boolean> {
  const result = await db
    .prepare(
      `INSERT INTO voice_sessions (id, created_at, day, locale, time_zone, start_page, is_test)
       SELECT ?1, ?2, ?3, ?4, ?5, ?6, ?7
       WHERE (SELECT COUNT(*) FROM voice_sessions WHERE day = ?3) < ?8`,
    )
    .bind(
      session.id,
      session.now,
      session.day,
      session.locale,
      session.timeZone,
      session.startPage,
      session.isTest ? 1 : 0,
      session.cap,
    )
    .run();
  return result.meta.changes === 1;
}

export async function deleteVoiceSession(
  db: D1Database,
  id: string,
): Promise<void> {
  await db.prepare('DELETE FROM voice_sessions WHERE id = ?1').bind(id).run();
}

export async function setConversationId(
  db: D1Database,
  id: string,
  conversationId: string,
): Promise<void> {
  await db
    .prepare('UPDATE voice_sessions SET conversation_id = ?2 WHERE id = ?1')
    .bind(id, conversationId)
    .run();
}

const sessionRow = z.object({
  locale: z.enum(locales),
  time_zone: z.string(),
  is_test: z.union([z.literal(0), z.literal(1)]),
  conversation_id: z.string().nullable(),
  bound_conversation_id: z.string().nullable(),
  booked_at: z.number().nullable(),
});

export type VoiceSession = {
  locale: (typeof locales)[number];
  timeZone: string;
  isTest: boolean;
  // The id ElevenLabs sent with the tool calls, else the one the token carried.
  conversationId: string | null;
  booked: boolean;
};

type Claim = { booking: boolean; conversation: string | null };

async function claim(
  db: D1Database,
  id: string,
  now: number,
  { booking, conversation }: Claim,
): Promise<VoiceSession | null> {
  const row = await db
    .prepare(
      `UPDATE voice_sessions
       SET tool_calls = tool_calls + 1,
           book_attempts = book_attempts + ?4,
           booking_started_at = CASE WHEN ?4 = 1 THEN ?6 ELSE booking_started_at END,
           bound_conversation_id = COALESCE(bound_conversation_id, ?8)
       WHERE id = ?1 AND created_at > ?2 AND tool_calls < ?3
         AND (?8 IS NULL OR bound_conversation_id IS NULL OR bound_conversation_id = ?8)
         AND (?4 = 0 OR (
           booked_at IS NULL AND book_attempts < ?5
           AND (booking_started_at IS NULL OR booking_started_at < ?7)))
       RETURNING locale, time_zone, is_test, conversation_id, bound_conversation_id, booked_at`,
    )
    .bind(
      id,
      now - VOICE_SETTINGS.sessionWindowMs,
      VOICE_SETTINGS.toolCallsPerSession,
      booking ? 1 : 0,
      VOICE_SETTINGS.bookAttemptsPerSession,
      now,
      now - VOICE_SETTINGS.bookingStaleMs,
      conversation,
    )
    .first();
  if (row === null) return null;
  const parsed = sessionRow.parse(row);
  return {
    locale: parsed.locale,
    timeZone: parsed.time_zone,
    isTest: parsed.is_test === 1,
    conversationId: parsed.bound_conversation_id ?? parsed.conversation_id,
    booked: parsed.booked_at !== null,
  };
}

export type ToolClaim =
  | { status: 'ok' | 'limit'; session: VoiceSession }
  | { status: 'session' };

// One atomic UPDATE per call: the session must exist, be recent and have tool
// calls left, and carry the conversation it was bound to by its first call. A
// booking also needs an attempt left, no booking already made and none running
// (a call may try a few times, since a slot can be taken, but never book
// twice, not even from two calls at once). A leaked bearer secret is useless
// without a session, and a session needs a Turnstile pass. Only a miss costs a
// second statement, to tell a dead session from a spent or busy booking.
export async function claimToolCall(
  db: D1Database,
  id: string,
  now: number,
  { booking, conversation }: Claim,
): Promise<ToolClaim> {
  const session = await claim(db, id, now, { booking, conversation });
  if (session !== null) return { status: 'ok', session };
  if (!booking) return { status: 'session' };
  const spent = await claim(db, id, now, { booking: false, conversation });
  return spent === null
    ? { status: 'session' }
    : { status: 'limit', session: spent };
}

export async function markVoiceBooked(
  db: D1Database,
  id: string,
  now: number,
): Promise<void> {
  await db
    .prepare(
      'UPDATE voice_sessions SET booked_at = ?2, booking_started_at = NULL WHERE id = ?1',
    )
    .bind(id, now)
    .run();
}

// A booking that did not happen frees the session for another try.
export async function releaseVoiceBooking(
  db: D1Database,
  id: string,
): Promise<void> {
  await db
    .prepare(
      'UPDATE voice_sessions SET booking_started_at = NULL WHERE id = ?1 AND booked_at IS NULL',
    )
    .bind(id)
    .run();
}

export async function purgeVoiceSessions(
  db: D1Database,
  now: number,
): Promise<number> {
  const result = await db
    .prepare('DELETE FROM voice_sessions WHERE created_at < ?1')
    .bind(now - RETENTION_MS)
    .run();
  return result.meta.changes;
}
