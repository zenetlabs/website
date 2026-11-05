import {
  type ConfirmOutcome,
  type ConfirmState,
  type ConfirmView,
  outcomeOf,
} from '@/lib/confirm-view';
import { locales } from '@/lib/i18n';
import type { LeadMethod } from '@/lib/track';
import { type BookingDeps, confirmFromLink } from '@/server/booking';
import { confirmUrl } from '@/server/booking-emails';
import type { Channel } from '@/server/booking-schema';
import {
  type BookingRow,
  bookingForToken,
  isPendingRow,
} from '@/server/booking-store';
import { ipBucket, isLimited, type Limiter } from '@/server/rate-limit';
import { readCapped } from '@/server/request';
import { errorName } from '@/server/responses';

const MAX_FORM_BYTES = 1024;
const FORM_TYPE = /^application\/x-www-form-urlencoded(?:\s*;|$)/i;

// same-origin, not no-referrer: the token never leaves in a referrer to another
// site, and a form post from these pages still carries its Origin (under
// no-referrer browsers send `Origin: null`, which the guard below refuses).
export const PRIVATE_PAGE_HEADERS = {
  'Cache-Control': 'private, no-store',
  'X-Robots-Tag': 'noindex',
  'Referrer-Policy': 'same-origin',
} as const;

const METHOD: Record<Channel, LeadMethod> = {
  web: 'booking',
  chat: 'chat',
  webmcp: 'webmcp',
  voice: 'voice',
};

// a•••@domain: enough for the visitor to recognise, too little to harvest.
export function maskEmail(email: string): string {
  const at = email.lastIndexOf('@');
  if (at < 1) return '•••';
  return `${email.slice(0, 1)}•••${email.slice(at)}`;
}

function stateOf(
  row: BookingRow,
  now: number,
): Exclude<ConfirmState, 'invalid'> {
  switch (row.status) {
    case 'held':
      if (isPendingRow(row, now)) return 'pending';
      return row.confirmed_at !== null && (row.hold_expires_at ?? 0) > now
        ? 'confirming'
        : 'expired';
    case 'confirmed':
      return 'confirmed';
    case 'cancelled':
      return 'cancelled';
    case 'failed':
      return 'failed';
    case 'unknown':
      return 'unknown';
    case 'expired':
      return 'expired';
  }
}

// The outcome hint from the redirect only refines a state the row agrees with.
function refine(
  state: Exclude<ConfirmState, 'invalid'>,
  outcome: ConfirmOutcome | null,
): Exclude<ConfirmState, 'invalid'> {
  if (outcome === 'taken' && state === 'expired') return 'taken';
  if (outcome === 'unavailable' && state === 'pending') return 'unavailable';
  return state;
}

// Reads only: a GET or HEAD of the link never changes anything, so a mail
// scanner that prefetches it cannot confirm a booking.
export async function confirmView(
  db: D1Database,
  token: unknown,
  outcome: unknown,
  now: number,
): Promise<ConfirmView> {
  const row = await bookingForToken(db, token, 'confirm');
  if (row === null) return { state: 'invalid' };
  return {
    state: refine(stateOf(row, now), outcomeOf(outcome)),
    start: row.slot_start,
    end: row.slot_end,
    timeZone: row.time_zone,
    masked: maskEmail(row.email),
    expiresAt: row.confirm_expires_at ?? row.created_at,
    method: METHOD[row.channel],
  };
}

export async function confirmViewResponse(
  request: Request,
  db: D1Database,
  now: number,
): Promise<Response> {
  const url = new URL(request.url);
  try {
    const view = await confirmView(
      db,
      url.searchParams.get('confirm'),
      url.searchParams.get('outcome'),
      now,
    );
    return Response.json(view, { headers: PRIVATE_PAGE_HEADERS });
  } catch (error) {
    console.error('booking: confirm view failed', { error: errorName(error) });
    return Response.json(
      { state: 'invalid' },
      { status: 503, headers: PRIVATE_PAGE_HEADERS },
    );
  }
}

export type ConfirmDeps = BookingDeps & { limiter: Limiter; now: () => number };

function refuse(status: number, text: string): Response {
  return new Response(text, {
    status,
    headers: {
      ...PRIVATE_PAGE_HEADERS,
      'Content-Type': 'text/plain; charset=utf-8',
      ...(status === 429 ? { 'Retry-After': '60' } : {}),
    },
  });
}

// A form post from our own page, nothing else: the browser sends Origin on a
// form POST, and Sec-Fetch-Site where it supports it.
export async function sameOriginForm(
  request: Request,
  limiter: Limiter,
  label: string,
): Promise<URLSearchParams | Response> {
  const origin = new URL(request.url).origin;
  if (request.headers.get('origin') !== origin) return refuse(403, 'Forbidden');
  const site = request.headers.get('sec-fetch-site');
  if (site !== null && site !== 'same-origin') return refuse(403, 'Forbidden');
  if (!FORM_TYPE.test(request.headers.get('content-type') ?? '')) {
    return refuse(415, 'Unsupported Media Type');
  }
  const ip = request.headers.get('cf-connecting-ip');
  if (await isLimited(limiter, ip === null ? 'unknown' : ipBucket(ip), label)) {
    return refuse(429, 'Too many requests. Wait a minute and try again.');
  }
  const text = await readCapped(request, MAX_FORM_BYTES);
  if (text === null) return refuse(413, 'Payload Too Large');
  return new URLSearchParams(text);
}

// The Confirm button. Always a 303 back to the link, where the page shows the
// state; a calendar failure before the consume or a lost slot ride along as a
// hint, since the row alone cannot tell them apart from pending and expired.
export async function postConfirm(
  request: Request,
  deps: ConfirmDeps,
): Promise<Response> {
  const form = await sameOriginForm(request, deps.limiter, 'book-confirm');
  if (form instanceof Response) return form;
  const token = form.get('token') ?? '';
  const locale = locales.find((value) => value === form.get('locale')) ?? 'en';
  let result: Awaited<ReturnType<typeof confirmFromLink>>;
  try {
    result = await confirmFromLink(token, { deps, now: deps.now() });
  } catch (error) {
    console.error('booking: confirm failed', { error: errorName(error) });
    result = 'unavailable';
  }
  const origin = new URL(request.url).origin;
  const target = new URL(confirmUrl(origin, locale, encodeURIComponent(token)));
  // `booked` lets the page send the conversion once, on the visit that booked.
  if (result === 'taken' || result === 'unavailable') {
    target.searchParams.set('outcome', result);
  } else if (result === 'confirmed') {
    target.searchParams.set('outcome', 'booked');
  }
  return new Response(null, {
    status: 303,
    headers: { ...PRIVATE_PAGE_HEADERS, Location: target.toString() },
  });
}
