import { z } from 'zod';
import { isRecord } from '@/lib/is-record';
import { voiceBookingSchema } from '@/server/booking-schema';
import {
  isJsonRequest,
  issuesOf,
  parseJson,
  readCapped,
} from '@/server/request';
import { errorName } from '@/server/responses';
import {
  execute,
  MAX_BODY_BYTES,
  reject,
  succeed,
  type Transport,
} from '@/server/tools/execute';
import type { ToolHttpDeps } from '@/server/tools/http';
import type { ServerTool } from '@/server/tools/types';
import {
  claimToolCall,
  markVoiceBooked,
  releaseVoiceBooking,
  type VoiceSession,
} from '@/server/voice/store';

const SESSION_ID = z.uuid();

// The session id the agent sends in X-Voice-Session (a secret__ dynamic
// variable, so the model never sees it). Only a UUID is ever looked up.
function sessionIdOf(request: Request): string | null {
  const parsed = SESSION_ID.safeParse(request.headers.get('x-voice-session'));
  return parsed.success ? parsed.data : null;
}

// The session, not the model, decides the market and the time zone, and whether
// the booking is a test. A body that is not an object is left for the tool to refuse.
function withSession(body: unknown, session: VoiceSession): unknown {
  if (!isRecord(body)) return body;
  return { ...body, locale: session.locale, timeZone: session.timeZone };
}

// What ElevenLabs sends as `system__conversation_id`. A value that is not a
// plain id (an unresolved `{{...}}` placeholder, say) counts as absent.
const CONVERSATION_ID = /^[\w-]{8,128}$/;

function conversationOf(request: Request): string | null {
  const value = request.headers.get('x-voice-conversation') ?? '';
  return CONVERSATION_ID.test(value) ? value : null;
}

function isBooked(result: unknown): boolean {
  return isRecord(result) && result.status === 'booked';
}

// A tool call from an ElevenLabs agent, after the bearer secret matched: it also
// needs a live voice session, which only a Turnstile-checked visitor can mint.
export async function voiceCall(
  tool: ServerTool,
  request: Request,
  deps: ToolHttpDeps,
  now: number,
): Promise<Response> {
  if (!deps.site.voice.published) return reject('unavailable');
  const id = sessionIdOf(request);
  if (id === null) {
    console.warn('tools: voice session rejected', { session: null });
    return reject('session');
  }
  const text = await readCapped(request, MAX_BODY_BYTES);
  if (text === null) return reject('too-large');
  // A tool called with no parameters may send no body at all.
  if (text !== '' && !isJsonRequest(request)) return reject('unsupported');
  const raw = text === '' ? {} : parseJson(text);

  // A booking needs the read-back confirmed. A malformed one is refused before
  // it can use up one of the session's booking attempts.
  const books = tool.name === 'book_meeting';
  const confirmed = books ? voiceBookingSchema.safeParse(raw) : null;
  const booking = confirmed?.success === true;

  let claim: Awaited<ReturnType<typeof claimToolCall>>;
  try {
    claim = await claimToolCall(deps.db, id, now, {
      booking,
      conversation: conversationOf(request),
    });
  } catch (error) {
    console.error('tools: voice session lookup failed', {
      code: errorName(error),
    });
    return reject('unavailable');
  }
  if (claim.status === 'session') {
    console.warn('tools: voice session rejected', { session: id });
    return reject('session');
  }
  if (confirmed?.success === false) {
    return reject('invalid', issuesOf(confirmed.error));
  }
  if (claim.status === 'limit') {
    return succeed({ status: 'rejected', reason: 'limit' });
  }

  const { session } = claim;
  const transport: Transport = {
    channel: 'voice',
    consentAt: books ? now : null,
    attribution: null,
    chatSessionId: null,
    hostname: new URL(request.url).hostname,
    now,
    voice: { sessionId: id, conversationId: session.conversationId },
    testSession: session.isTest,
  };
  return execute(
    tool,
    withSession(raw, session),
    deps,
    transport,
    // The one booking of a session: marked done when it happened, freed when not.
    books
      ? async (result) => {
          if (isBooked(result)) await markVoiceBooked(deps.db, id, now);
          else await releaseVoiceBooking(deps.db, id);
        }
      : undefined,
  );
}
