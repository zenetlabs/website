import { BOOKING_RULES } from '@/content/booking-rules';
import { SURFACE_ACTION, type Surface } from '@/lib/booking-surfaces';
import type { SiteFlags } from '@/lib/page-registry';
import { type BookingDeps, targetOf } from '@/server/booking';
import { browserBookingSchema, type Channel } from '@/server/booking-schema';
import { linkedChatSession } from '@/server/chat/store';
import { isLimited, type Limiter } from '@/server/rate-limit';
import {
  gate,
  isJsonRequest,
  parseJson,
  readCapped,
  verifyHuman,
} from '@/server/request';
import { sameBytes, sha256 } from '@/server/secret-compare';
import { CONFIRM_WINDOW_MS, pendingResult } from '@/server/tools/book-meeting';
import { contactFor } from '@/server/tools/contact';
import {
  execute,
  MAX_BODY_BYTES,
  reject,
  succeed,
} from '@/server/tools/execute';
import { manifest, toolByName } from '@/server/tools/registry';
import { isTestContext, type ServerTool } from '@/server/tools/types';
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

async function bearerMatches(
  header: string,
  secret: string | null,
): Promise<boolean> {
  const presented = BEARER.exec(header)?.[1];
  if (presented === undefined || secret === null) return false;
  const [a, b] = await Promise.all([sha256(presented), sha256(secret)]);
  return sameBytes(a, b);
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

// A chat booking keeps the chat channel only with a session it can be linked to.
function channelFor(surface: Surface, chatLinked: boolean): Channel {
  if (surface === 'webmcp') return 'webmcp';
  return surface === 'chat' && chatLinked ? 'chat' : 'web';
}

// The checks run cheapest first: the gate (origin, JSON, limiter, size, schema),
// then the flag and the calendar secret, then the honeypot, then Turnstile.
// With booking off, a honeypot hit gets exactly the answer a real request
// gets, so the trap cannot be used to probe whether booking is on.
async function browserBooking(
  tool: ServerTool,
  request: Request,
  deps: ToolHttpDeps,
  now: number,
): Promise<Response> {
  const gated = await gate({
    request,
    schema: browserBookingSchema,
    label: 'tools',
    limiter: deps.bookLimiter,
    maxBytes: MAX_BODY_BYTES,
    secret: deps.turnstileSecret,
  });
  if (gated.status === 'rejected') return reject(gated.error, gated.issues);
  const { input, ip, secret } = gated;
  const url = new URL(request.url);
  const target = await targetOf({
    deps,
    isTest: isTestContext({ hostname: url.hostname }),
  });
  if (!target.ok) {
    return succeed({
      status: 'unavailable',
      reason: target.reason,
      contact: contactFor(input.locale, deps.site),
    });
  }
  if (input.website !== '') {
    // The same shape a real request gets, so a bot learns nothing; no row, no email.
    console.warn('booking: honeypot');
    const start = Date.parse(input.slot);
    return succeed(
      pendingResult({
        start,
        end: start + SLOT_MS,
        expiresAt: now + CONFIRM_WINDOW_MS,
        resent: false,
        locale: input.locale,
        timeZone: input.timeZone,
      }),
    );
  }
  const failure = await verifyHuman({
    token: input.turnstileToken,
    action: SURFACE_ACTION[input.surface],
    label: 'tools',
    ip,
    secret,
    fetch: deps.fetch,
    hostname: url.hostname,
    testingKeys: deps.server.turnstile.testingKeys,
    now,
  });
  if (failure !== null) return reject(failure);
  const resolved = await secret;
  if (resolved === null) return reject('unavailable');
  const chatSessionId =
    input.surface === 'chat'
      ? await linkedChatSession(deps.db, deps.site, input.chatSessionId, now)
      : null;
  return execute(tool, input, deps, {
    channel: channelFor(input.surface, chatSessionId !== null),
    surface: input.surface,
    consentAt: now,
    attribution: input.attribution,
    chatSessionId,
    hostname: url.hostname,
    origin: url.origin,
    ip: { address: ip ?? 'unknown', secret: resolved.value },
    now,
  });
}
