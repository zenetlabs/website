import { BOOKING_RULES } from '@/content/booking-rules';
import type { BookAvailability } from '@/lib/booking-calendar';
import type { Surface } from '@/lib/booking-surfaces';
import type { Attribution } from '@/lib/lead-schema';
import { isPublished } from '@/lib/page-registry';
import { zonedDay } from '@/lib/slot-format';
import { canonicalZone, type Interval, type Slot } from '@/lib/slots';
import { DAY_MS, noop, startOfUtcDay, utcDay } from '@/lib/time';
import { addressKey } from '@/server/address-usage';
import {
  type BookingEmail,
  deliverBookingEmails,
} from '@/server/booking-outbox';
import type {
  BookingContext,
  BookingInput,
  Channel,
  PendingRequest,
  VoiceRef,
} from '@/server/booking-schema';
import {
  availableSlots,
  bookingCalendar,
  checkSlot,
} from '@/server/booking-slots';
import {
  activeBookings,
  type BookingRow,
  bookingForToken,
  type Caps,
  confirmStatement,
  consumeConfirm,
  expireBooking,
  failStatement,
  findPending,
  holdFailure,
  holdPending,
  isPendingRow,
  isUniqueViolation,
  type LimitCap,
  type PendingMatch,
  queueResend,
  readRequest,
  unknownStatement,
} from '@/server/booking-store';
import {
  type CalendarCredentials,
  calendarIdFor,
  parseCalendarSecret,
} from '@/server/calendar-config';
import { isDisposable } from '@/server/disposable';
import { emailKey } from '@/server/email-key';
import { accessToken } from '@/server/google-auth';
import {
  type CalendarAccess,
  type CalendarResult,
  createEvent,
  freeBusy,
} from '@/server/google-calendar';
import { attributionFields, CONSENT_VERSION } from '@/server/lead-fields';
import { leadStatements, type NewLead } from '@/server/lead-store';
import { deliver, type OutboxDeps } from '@/server/outbox';
import { ipBucket } from '@/server/rate-limit';
import { errorName } from '@/server/responses';

export type BookingDeps = OutboxDeps & {
  calendarSecret: () => Promise<string | null>;
  waitUntil: (promise: Promise<unknown>) => void;
};

export type BookingScope = {
  deps: BookingDeps;
  now: number;
  isTest: boolean;
  retryDelaysMs?: readonly number[];
};

export type UnavailableReason = 'not_configured' | 'calendar_error';

export type Target = { credentials: CalendarCredentials; calendarId: string };

type Ready = Target & { access: CalendarAccess };

type Unavailable = { ok: false; reason: UnavailableReason };

export type TargetResult = ({ ok: true } & Target) | Unavailable;

const busyCache = new Map<string, BusyEntry>();
const IN_FLIGHT_MS = 10_000;

type BusyEntry = {
  at: number;
  result: Promise<CalendarResult<Interval[]>>;
  ok?: boolean;
};

export function clearBusyCache(): void {
  busyCache.clear();
}

function logError(op: string, code: string): void {
  console.error('booking: calendar error', { op, code });
}

// No network: the flag, the secret and the calendar id. Anything missing means
// "not configured", which is a normal state and never an error. Resolved once
// per request and handed on.
export async function targetOf(
  { deps, isTest }: Pick<BookingScope, 'deps' | 'isTest'>,
  requirePublished = true,
): Promise<TargetResult> {
  if (requirePublished && !isPublished('book', deps.site)) {
    return { ok: false, reason: 'not_configured' };
  }
  const credentials = await parseCalendarSecret(await deps.calendarSecret());
  if (credentials === null) return { ok: false, reason: 'not_configured' };
  const calendarId = calendarIdFor(credentials, isTest);
  if (calendarId === null) return { ok: false, reason: 'not_configured' };
  return { ok: true, credentials, calendarId };
}

async function connect(
  { deps, now }: Pick<BookingScope, 'deps' | 'now'>,
  target: Target,
): Promise<{ ok: true; ready: Ready } | Unavailable> {
  const { booking } = deps.server;
  const token = await accessToken({
    credentials: target.credentials,
    tokenUrl: booking.tokenUrl,
    fetch: deps.fetch,
    now,
    failureTtlMs: booking.failureCacheMs,
  });
  if (!token.ok) {
    logError('token', token.code);
    return { ok: false, reason: 'calendar_error' };
  }
  return {
    ok: true,
    ready: {
      ...target,
      access: {
        calendarUrl: booking.calendarUrl,
        token: token.token,
        fetch: deps.fetch,
      },
    },
  };
}

export type CalendarReady =
  | { ok: true; access: CalendarAccess; calendarId: string }
  | Unavailable;

// The calendar of a booking that already exists (the owner's cancel, the
// 24-month purge): those must work even while new bookings are switched off.
export async function calendarFor(
  scope: Pick<BookingScope, 'deps' | 'now'>,
  target: Target,
): Promise<CalendarReady> {
  const connection = await connect(scope, target);
  if (!connection.ok) return connection;
  return {
    ok: true,
    access: connection.ready.access,
    calendarId: connection.ready.calendarId,
  };
}

// Free/busy is shared while in flight, kept for busyCacheMs once it worked and
// for failureCacheMs once it failed. A booking (fresh) skips only the success cache.
function busyFor(
  { deps, now }: BookingScope,
  ready: Ready,
  fresh: boolean,
): Promise<CalendarResult<Interval[]>> {
  const { busyCacheMs, failureCacheMs } = deps.server.booking;
  const entry = busyCache.get(ready.calendarId);
  if (entry) {
    const age = now - entry.at;
    const reusable =
      entry.ok === undefined
        ? age < IN_FLIGHT_MS
        : entry.ok
          ? !fresh && age < busyCacheMs
          : age < failureCacheMs;
    if (reusable) return entry.result;
  }
  const horizon = now + (BOOKING_RULES.horizonDays + 1) * DAY_MS;
  const next: BusyEntry = {
    at: now,
    result: freeBusy(ready.access, ready.calendarId, now, horizon),
  };
  next.result.then((result) => {
    next.ok = result.ok;
  });
  busyCache.set(ready.calendarId, next);
  return next.result;
}

type Snapshot =
  | { ok: true; ready: Ready; busy: Interval[]; booked: Slot[] }
  | Unavailable;

// `exclude`: the booking being confirmed, which must not block its own slot.
// `resolved`: the request's target when the caller already has it.
async function snapshot(
  scope: BookingScope,
  fresh: boolean,
  {
    exclude = null,
    resolved,
  }: { exclude?: string | null; resolved?: Target } = {},
): Promise<Snapshot> {
  const { deps, now, isTest } = scope;
  let target: Target;
  if (resolved) {
    target = resolved;
  } else {
    const found = await targetOf(scope);
    if (!found.ok) return found;
    target = found;
  }
  const horizon = now + (BOOKING_RULES.horizonDays + 1) * DAY_MS;
  const booked = activeBookings(
    deps.db,
    { from: now - DAY_MS, to: horizon },
    isTest,
    now,
    exclude,
  );
  booked.catch(() => undefined);
  const connection = await connect(scope, target);
  if (!connection.ok) return connection;
  const busy = await busyFor(scope, connection.ready, fresh);
  if (!busy.ok) {
    logError('freebusy', busy.code);
    return { ok: false, reason: 'calendar_error' };
  }
  return {
    ok: true,
    ready: connection.ready,
    busy: busy.value,
    booked: await booked,
  };
}

export type AvailabilityResult =
  | { status: 'ok'; slots: Slot[] }
  | { status: 'unavailable'; reason: UnavailableReason };

export async function availability(
  scope: BookingScope,
  range: { from?: number; to?: number } = {},
): Promise<AvailabilityResult> {
  const shot = await snapshot(scope, false);
  if (!shot.ok) return { status: 'unavailable', reason: shot.reason };
  return {
    status: 'ok',
    slots: availableSlots({
      rules: BOOKING_RULES,
      now: scope.now,
      busy: shot.busy,
      booked: shot.booked,
      ...range,
    }),
  };
}

// What the /book render and the refresh endpoint show: the slots, or the
// contact form. A slow or broken calendar must never become an error page.
export async function pageSlots(
  scope: BookingScope,
  deadlineMs: number,
): Promise<BookAvailability> {
  const pending = availability(scope);
  scope.deps.waitUntil(pending.then(noop, noop));
  let timer: ReturnType<typeof setTimeout> | undefined;
  const late = new Promise<'late'>((resolve) => {
    timer = setTimeout(() => resolve('late'), deadlineMs);
  });
  try {
    const result = await Promise.race([pending, late]);
    if (result === 'late' || result.status === 'unavailable') {
      return { status: 'unavailable' };
    }
    return {
      status: 'ok',
      slots: result.slots.map(({ start, end }) => ({ start, end })),
      calendar: bookingCalendar(BOOKING_RULES, scope.now),
    };
  } catch (error) {
    console.error('booking: availability failed', { error: errorName(error) });
    return { status: 'unavailable' };
  } finally {
    clearTimeout(timer);
  }
}

export type Rejection =
  | 'invalid_slot'
  | 'slot_taken'
  | 'day_full'
  | 'limit'
  | 'email_not_accepted';

export type BookResult =
  | {
      status: 'pending';
      start: number;
      end: number;
      expiresAt: number;
      resent: boolean;
    }
  | { status: 'rejected'; reason: Rejection }
  | { status: 'unavailable'; reason: UnavailableReason };

export type BookRequest = {
  input: BookingInput;
  channel: Channel;
  surface: Surface | 'voice';
  consentAt: number | null;
  attribution: Attribution | null;
  chatSessionId: string | null;
  voice?: VoiceRef;
  // The origin the request came to: every link we email points back to it.
  origin: string;
  // The caller's IP and the key for its fingerprint; null skips the IP cap.
  ip: { address: string; secret: string } | null;
};

type Confirmed = {
  input: BookingInput;
  request: PendingRequest;
  row: BookingRow;
};

function leadSource({ request }: Confirmed): 'voice' | 'chat' | 'booking' {
  if (request.voice) return 'voice';
  return request.chatSessionId === null ? 'booking' : 'chat';
}

function bookingLead(
  confirmed: Confirmed,
  scope: BookingScope,
  context: BookingContext,
): NewLead {
  const { input, request } = confirmed;
  return {
    locale: input.locale,
    source: leadSource(confirmed),
    name: input.name,
    email: input.email,
    company: input.company || null,
    message: input.topic,
    consent_version: CONSENT_VERSION,
    ...attributionFields(request.attribution, scope.deps.site.url),
    context: JSON.stringify({
      booking: context,
      ...(request.voice ? { voice: request.voice } : {}),
    }),
    chat_session_id: request.chatSessionId,
    is_test: scope.isTest ? 1 : 0,
  };
}

type Outcome = BookingContext['status'];

type Store = {
  confirmed: Confirmed;
  scope: BookingScope;
  context: BookingContext;
  finish: (leadId: string) => D1PreparedStatement;
};

const RETRY_DELAYS_MS = [250, 1_000];
const INLINE_EMAIL_MS = 4_000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function writeOutcome({ confirmed, scope, context, finish }: Store) {
  const { deps, now } = scope;
  const lead = leadStatements(
    deps.db,
    bookingLead(confirmed, scope, context),
    now,
    context.status === 'confirmed' ? 'always' : 'none',
    confirmed.request.consentAt,
  );
  const results = await deps.db.batch([
    ...lead.statements,
    finish(lead.leadId),
  ]);
  deliverInBackground(deps, lead.emails(results), now);
  if (results.at(-1)?.meta.changes !== 1) {
    console.error('booking: hold lost before the outcome', {
      bookingId: context.id,
    });
  }
}

async function retryStore(args: Store): Promise<void> {
  for (const delay of args.scope.retryDelaysMs ?? RETRY_DELAYS_MS) {
    await sleep(delay);
    try {
      await writeOutcome(args);
      return;
    } catch (error) {
      console.error('booking: store retry failed', {
        bookingId: args.context.id,
        error: errorName(error),
      });
      if (isUniqueViolation(error)) return;
    }
  }
}

// The lead is the owner's only record of the visitor, so a failed write is
// retried in the background; the visitor's answer never waits for it.
async function store(args: Store): Promise<void> {
  try {
    await writeOutcome(args);
    return;
  } catch (error) {
    console.error('booking: store failed', {
      bookingId: args.context.id,
      error: errorName(error),
    });
    if (isUniqueViolation(error)) return;
  }
  args.scope.deps.waitUntil(retryStore(args));
}

// The verify email is tried at once, for a few seconds at most: past that the
// visitor gets the same answer and the send finishes in the background or,
// failing that, on the next cron tick.
async function sendInline(scope: BookingScope, email: BookingEmail) {
  const { deps, now } = scope;
  const work = deliverBookingEmails(deps, [email], now).catch((error) => {
    console.error('booking-email: delivery failed', {
      error: errorName(error),
    });
  });
  deps.waitUntil(work);
  let timer: ReturnType<typeof setTimeout> | undefined;
  const late = new Promise<void>((resolve) => {
    timer = setTimeout(resolve, INLINE_EMAIL_MS);
  });
  try {
    await Promise.race([work, late]);
  } finally {
    clearTimeout(timer);
  }
}

function pendingRecord(
  request: BookRequest,
  consentAt: number,
): PendingRequest {
  const { input } = request;
  return {
    locale: input.locale,
    name: input.name,
    company: input.company || null,
    topic: input.topic,
    timeZone: (input.timeZone && canonicalZone(input.timeZone)) || null,
    attribution: request.attribution,
    chatSessionId: request.chatSessionId,
    voice: request.voice ?? null,
    consentAt,
    surface: request.surface,
  };
}

// Which cap refused a request: for the owner's logs only; the visitor's answer
// stays the generic `limit`.
function logLimit(cap: LimitCap | null): void {
  if (cap !== null) console.warn('booking: limit', { cap });
}

async function resend(
  scope: BookingScope,
  existing: PendingMatch,
  request: { caps: Caps; email: string; day: string },
  start: number,
): Promise<BookResult> {
  const { deps, now } = scope;
  const { limits } = deps.server.booking;
  const pending = {
    status: 'pending',
    start,
    end: existing.end,
    expiresAt: existing.expiresAt,
  } as const;
  const verifyId = crypto.randomUUID();
  const queued = await queueResend(
    deps.db,
    { bookingId: existing.id, verifyId, caps: request.caps },
    limits,
    now,
  );
  if (queued === 'cooldown') return { ...pending, resent: false };
  if (queued === 'limit') {
    const { cap } = await holdFailure(
      deps.db,
      { email: request.email, day: request.day, ...request.caps },
      BOOKING_RULES,
      limits,
      now,
      true,
    );
    logLimit(cap);
    return { status: 'rejected', reason: 'limit' };
  }
  await sendInline(scope, {
    id: verifyId,
    kind: 'verify',
    attempts: 0,
    bookingId: existing.id,
  });
  return { ...pending, resent: true };
}

// A request holds the slot and emails a link. Nothing reaches the calendar, and
// the owner hears nothing, until the visitor confirms from that email.
async function run(
  request: BookRequest,
  consentAt: number,
  scope: BookingScope,
): Promise<BookResult> {
  const { input, channel } = request;
  const { deps, now, isTest } = scope;
  const target = await targetOf(scope);
  if (!target.ok) return { status: 'unavailable', reason: target.reason };
  if (await isDisposable(input.email)) {
    return { status: 'rejected', reason: 'email_not_accepted' };
  }
  const record = pendingRecord(request, consentAt);
  const start = Date.parse(input.slot);
  const ipDay = utcDay(now);
  const caps: Caps = {
    emailKey: emailKey(input.email),
    dayStart: startOfUtcDay(now),
    ipKey: request.ip
      ? await addressKey(request.ip.secret, ipDay, ipBucket(request.ip.address))
      : null,
    ipDay,
    isTest,
  };
  const existing = await findPending(
    deps.db,
    { emailKey: caps.emailKey, slotStart: start, isTest },
    now,
  );
  if (existing) {
    return resend(
      scope,
      existing,
      { caps, email: input.email, day: zonedDay(start, BOOKING_RULES.zone) },
      start,
    );
  }

  const shot = await snapshot(scope, true, { resolved: target });
  if (!shot.ok) return { status: 'unavailable', reason: shot.reason };
  const checked = checkSlot(start, {
    rules: BOOKING_RULES,
    now,
    busy: shot.busy,
    booked: shot.booked,
  });
  if (checked.status === 'invalid') {
    return { status: 'rejected', reason: 'invalid_slot' };
  }
  if (checked.status === 'taken') {
    return { status: 'rejected', reason: 'slot_taken' };
  }
  if (checked.status === 'full') {
    return { status: 'rejected', reason: 'day_full' };
  }
  const { slot } = checked;
  const id = crypto.randomUUID();
  const verifyId = crypto.randomUUID();
  const { limits } = deps.server.booking;
  const hold = await holdPending(
    deps.db,
    {
      id,
      verifyId,
      slot,
      email: input.email,
      channel,
      timeZone: record.timeZone,
      isTest,
      request: JSON.stringify(record),
      origin: request.origin,
      caps,
    },
    BOOKING_RULES,
    limits,
    now,
  );
  if (hold === 'lost') {
    const failure = await holdFailure(
      deps.db,
      { email: input.email, day: slot.day, ...caps },
      BOOKING_RULES,
      limits,
      now,
    );
    logLimit(failure.cap);
    return { status: 'rejected', reason: failure.reason };
  }
  await sendInline(scope, {
    id: verifyId,
    kind: 'verify',
    attempts: 0,
    bookingId: id,
  });
  return {
    status: 'pending',
    start: slot.start,
    end: slot.end,
    expiresAt: now + BOOKING_RULES.confirmMinutes * 60_000,
    resent: false,
  };
}

export type ConfirmResult =
  | 'confirmed'
  | 'failed'
  | 'unknown'
  | 'taken'
  | 'unavailable'
  | 'invalid'
  | 'stale';

function inputOf(row: BookingRow, request: PendingRequest): BookingInput {
  return {
    slot: new Date(row.slot_start).toISOString(),
    name: request.name,
    email: row.email,
    company: request.company ?? undefined,
    topic: request.topic,
    timeZone: request.timeZone ?? undefined,
    locale: request.locale,
  };
}

// The click on Confirm: a fresh look at the calendar (the request's notice and
// horizon were checked when it was made; only conflicts matter now), then the
// one-time consume, the event and the lead. 'stale' means the row is no longer
// pending, so the page just shows its state.
async function confirmBooking(
  token: unknown,
  base: Omit<BookingScope, 'isTest'>,
): Promise<ConfirmResult> {
  const { deps, now } = base;
  const row = await bookingForToken(deps.db, token, 'confirm');
  if (row === null) return 'invalid';
  if (!isPendingRow(row, now) || row.confirm_hash === null) return 'stale';
  const request = readRequest(row);
  if (request === null) return 'stale';
  const scope: BookingScope = { ...base, isTest: row.is_test === 1 };
  const shot = await snapshot(scope, true, { exclude: row.id });
  if (!shot.ok) return 'unavailable';
  const checked = checkSlot(row.slot_start, {
    rules: BOOKING_RULES,
    now: row.created_at,
    busy: shot.busy,
    booked: shot.booked,
  });
  if (checked.status !== 'ok') {
    await expireBooking(deps.db, row.id);
    return 'taken';
  }
  const consumed = await consumeConfirm(
    deps.db,
    { id: row.id, hash: row.confirm_hash },
    BOOKING_RULES,
    now,
  );
  if (!consumed) return 'stale';
  const confirmed: Confirmed = {
    input: inputOf(row, request),
    request,
    row,
  };
  const created = await createEvent(shot.ready.access, shot.ready.calendarId, {
    bookingId: row.id,
    start: row.slot_start,
    end: row.slot_end,
    zone: BOOKING_RULES.zone,
    email: row.email,
    locale: request.locale,
  });
  const context = (
    status: Outcome,
    event: { meetUrl: string | null; htmlLink: string | null },
  ): BookingContext => ({
    id: row.id,
    start: row.slot_start,
    end: row.slot_end,
    timeZone: request.timeZone,
    channel: row.channel,
    calendar: scope.isTest ? 'test' : 'main',
    status,
    meetUrl: event.meetUrl,
    eventLink: event.htmlLink,
    origin: row.link_origin ?? deps.site.url,
    requestedAt: row.created_at,
  });

  if (!created.ok) {
    logError('insert', created.code);
    const none = { meetUrl: null, htmlLink: null };
    const status = created.unknown ? 'unknown' : 'failed';
    await store({
      confirmed,
      scope,
      context: context(status, none),
      finish: (leadId) =>
        created.unknown
          ? unknownStatement(deps.db, row.id, leadId)
          : failStatement(deps.db, row.id, leadId),
    });
    return status;
  }

  const { value: event } = created;
  await store({
    confirmed,
    scope,
    context: context('confirmed', event),
    finish: (leadId) =>
      confirmStatement(
        deps.db,
        { id: row.id, eventId: event.eventId, meetUrl: event.meetUrl },
        leadId,
      ),
  });
  return 'confirmed';
}

function deliverInBackground(
  deps: BookingDeps,
  emails: Parameters<typeof deliver>[1],
  now: number,
): void {
  deps.waitUntil(
    deliver(deps, emails, now).catch((error) => {
      console.error('lead-email: delivery failed', { error: errorName(error) });
    }),
  );
}

export function bookMeeting(
  request: BookRequest,
  scope: BookingScope,
): Promise<BookResult> {
  if (request.consentAt === null) {
    throw new Error('book_meeting requires recorded consent');
  }
  const work = run(request, request.consentAt, scope);
  scope.deps.waitUntil(work.then(noop, noop));
  return work;
}

// Under waitUntil too: a visitor who closes the tab mid-click must not leave a
// consumed booking without its event.
export function confirmFromLink(
  token: unknown,
  scope: Omit<BookingScope, 'isTest'>,
): Promise<ConfirmResult> {
  const work = confirmBooking(token, scope);
  scope.deps.waitUntil(work.then(noop, noop));
  return work;
}
