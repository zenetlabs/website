import { BOOKING_RULES } from '@/content/booking-rules';
import { isPublished, type SiteFlags } from '@/lib/page-registry';
import type { BookingDeps } from '@/server/booking';
import { browserBookingSchema } from '@/server/booking-schema';
import { linkedChatSession } from '@/server/chat/store';
import { isLimited, type Limiter } from '@/server/rate-limit';
import {
  guardBrowserPost,
  isJsonRequest,
  parseJson,
  readCapped,
} from '@/server/request';
import { bookedResult } from '@/server/tools/book-meeting';
import { contactFor } from '@/server/tools/contact';
import {
  execute,
  MAX_BODY_BYTES,
  reject,
  succeed,
} from '@/server/tools/execute';
import { manifest, toolByName } from '@/server/tools/registry';
import type { ServerTool } from '@/server/tools/types';
import { voiceCall } from '@/server/voice/call';

const SLOT_MS = BOOKING_RULES.slotMinutes * 60_000;
const BEARER = /^Bearer (\S+)$/;

export type ToolHttpDeps = BookingDeps & {
  bearerSecret: () => Promise<string | null>;
  turnstileSecret: () => Promise<string>;
  toolsLimiter: Limiter;
  bookLimiter: Limiter;
  now: () => number;
};

export function manifestResponse(site: SiteFlags): Response {
  return Response.json(manifest(site), {
    headers: { 'Cache-Control': 'public, max-age=300' },
  });
}

async function digest(value: string): Promise<ArrayBuffer> {
  return crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
}

function sameBytes(a: Uint8Array, b: Uint8Array): boolean {
  let difference = a.length ^ b.length;
  for (let index = 0; index < a.length; index += 1) {
    difference |= (a[index] ?? 0) ^ (b[index] ?? 0);
  }
  return difference === 0;
}

async function bearerMatches(
  header: string,
  secret: string | null,
): Promise<boolean> {
  const presented = BEARER.exec(header)?.[1];
  if (presented === undefined || secret === null) return false;
  const [a, b] = await Promise.all([digest(presented), digest(secret)]);
  return sameBytes(new Uint8Array(a), new Uint8Array(b));
}

export async function handleToolRequest(
  request: Request,
  name: string,
  deps: ToolHttpDeps,
): Promise<Response> {
  const tool = toolByName(name);
  if (tool === undefined || tool.clientOnly) return reject('unknown');

  const authorization = request.headers.get('authorization');
  const now = deps.now();
  if (authorization !== null) {
    if (!(await bearerMatches(authorization, await deps.bearerSecret()))) {
      return reject('auth');
    }
    return voiceCall(tool, request, deps, now);
  }
  if (tool.name === 'book_meeting') {
    return browserBooking(tool, request, deps, now);
  }

  if (!isJsonRequest(request)) return reject('unsupported');
  const ip = request.headers.get('cf-connecting-ip') ?? 'unknown';
  if (await isLimited(deps.toolsLimiter, ip, 'tools')) return reject('rate');
  const text = await readCapped(request, MAX_BODY_BYTES);
  if (text === null) return reject('too-large');
  return execute(tool, parseJson(text), deps, {
    channel: 'web',
    consentAt: null,
    attribution: null,
    chatSessionId: null,
    hostname: new URL(request.url).hostname,
    now,
  });
}

async function browserBooking(
  tool: ServerTool,
  request: Request,
  deps: ToolHttpDeps,
  now: number,
): Promise<Response> {
  const guarded = await guardBrowserPost({
    request,
    schema: browserBookingSchema,
    action: 'book',
    label: 'tools',
    limiter: deps.bookLimiter,
    maxBytes: MAX_BODY_BYTES,
    turnstileSecret: deps.turnstileSecret,
    fetch: deps.fetch,
  });
  if (guarded.status === 'honeypot') {
    const { slot, locale, timeZone } = guarded.input;
    if (!isPublished('book', deps.site)) {
      return succeed({
        status: 'unavailable',
        reason: 'not_configured',
        contact: contactFor(locale, deps.site),
      });
    }
    const start = Date.parse(slot);
    return succeed(
      bookedResult({
        start,
        end: start + SLOT_MS,
        meetUrl: null,
        locale,
        timeZone,
      }),
    );
  }
  if (guarded.status === 'rejected') {
    return reject(guarded.error, guarded.issues);
  }
  const { input } = guarded;
  const chatSessionId = await linkedChatSession(
    deps.db,
    deps.site,
    input.chatSessionId,
    now,
  );
  return execute(tool, input, deps, {
    channel: chatSessionId === null ? 'web' : 'chat',
    consentAt: now,
    attribution: input.attribution,
    chatSessionId,
    hostname: new URL(request.url).hostname,
    now,
  });
}
