import { BOOKING_RULES } from '@/content/booking-rules';
import type { PageAvailability } from '@/lib/booking-client';
import type { Attribution } from '@/lib/lead-schema';
import { isPublished } from '@/lib/page-registry';
import {
  availableSlots,
  canonicalZone,
  checkSlot,
  type Interval,
  type Slot,
} from '@/lib/slots';
import { DAY_MS, noop } from '@/lib/time';
import type {
  BookingContext,
  BookingInput,
  Channel,
  VoiceRef,
} from '@/server/booking-schema';
import {
  activeBookings,
  confirmStatement,
  failStatement,
  holdFailure,
  holdSlot,
  unknownStatement,
} from '@/server/booking-store';
import {
  type CalendarCredentials,
  calendarIdFor,
  parseCalendarSecret,
} from '@/server/calendar-config';
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

type Target = { credentials: CalendarCredentials; calendarId: string };

type Ready = Target & { access: CalendarAccess };

type Unavailable = { ok: false; reason: UnavailableReason };

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
// "not configured", which is a normal state and never an error.
async function targetOf({
  deps,
  isTest,
}: BookingScope): Promise<({ ok: true } & Target) | Unavailable> {
  if (!isPublished('book', deps.site)) {
    return { ok: false, reason: 'not_configured' };
  }
  const credentials = await parseCalendarSecret(await deps.calendarSecret());
  if (credentials === null) return { ok: false, reason: 'not_configured' };
  const calendarId = calendarIdFor(credentials, isTest);
  if (calendarId === null) return { ok: false, reason: 'not_configured' };
  return { ok: true, credentials, calendarId };
}

async function connect(
  { deps, now }: BookingScope,
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

async function snapshot(
  scope: BookingScope,
  fresh: boolean,
): Promise<Snapshot> {
  const { deps, now, isTest } = scope;
  const target = await targetOf(scope);
  if (!target.ok) return target;
  const horizon = now + (BOOKING_RULES.horizonDays + 1) * DAY_MS;
  const booked = activeBookings(
    deps.db,
    { from: now - DAY_MS, to: horizon },
    isTest,
    now,
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
): Promise<PageAvailability> {
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
    };
  } catch (error) {
    console.error('booking: availability failed', { error: errorName(error) });
    return { status: 'unavailable' };
  } finally {
    clearTimeout(timer);
  }
}

export type BookResult =
  | { status: 'booked'; start: number; end: number; meetUrl: string | null }
  | {
      status: 'rejected';
      reason: 'invalid_slot' | 'slot_taken' | 'day_full' | 'limit';
    }
  | { status: 'unavailable'; reason: UnavailableReason };

export type BookRequest = {
  input: BookingInput;
  channel: Channel;
  consentAt: number | null;
  attribution: Attribution | null;
  chatSessionId: string | null;
  voice?: VoiceRef;
};

function leadSource({
  voice,
  chatSessionId,
}: BookRequest): 'voice' | 'chat' | 'booking' {
  if (voice) return 'voice';
  return chatSessionId === null ? 'booking' : 'chat';
}

function bookingLead(
  request: BookRequest,
  scope: BookingScope,
  context: BookingContext,
): NewLead {
  const { input, attribution, chatSessionId, voice } = request;
  return {
    locale: input.locale,
    source: leadSource(request),
    name: input.name,
    email: input.email,
    company: input.company || null,
    message: input.topic,
    consent_version: CONSENT_VERSION,
    ...attributionFields(attribution, scope.deps.site.url),
    context: JSON.stringify({ booking: context, ...(voice ? { voice } : {}) }),
    chat_session_id: chatSessionId,
    is_test: scope.isTest ? 1 : 0,
  };
}

type Outcome = BookingContext['status'];

type Store = {
  request: BookRequest;
  scope: BookingScope;
  context: BookingContext;
  finish: (leadId: string) => D1PreparedStatement;
};

const RETRY_DELAYS_MS = [250, 1_000];

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function writeOutcome({ request, scope, context, finish }: Store) {
  const { deps, now } = scope;
  const lead = leadStatements(
    deps.db,
    bookingLead(request, scope, context),
    now,
    context.status === 'confirmed' ? 'always' : 'none',
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

function isUniqueConflict(error: unknown): boolean {
  return (
    error instanceof Error && /UNIQUE constraint failed/i.test(error.message)
  );
}

// The lead is the owner's only record of the visitor, so a failed write is
// retried in the background; the visitor's answer never waits for it.
async function store(args: Store): Promise<void> {
  const bookingId = args.context.id;
  try {
    await writeOutcome(args);
    return;
  } catch (error) {
    console.error('booking: store failed', {
      bookingId,
      error: errorName(error),
    });
    if (isUniqueConflict(error)) return;
  }
  args.scope.deps.waitUntil(
    (async () => {
      for (const delay of args.scope.retryDelaysMs ?? RETRY_DELAYS_MS) {
        await sleep(delay);
        try {
          await writeOutcome(args);
          return;
        } catch (error) {
          console.error('booking: store retry failed', {
            bookingId,
            error: errorName(error),
          });
          if (isUniqueConflict(error)) return;
        }
      }
    })(),
  );
}

async function run(
  request: BookRequest,
  scope: BookingScope,
): Promise<BookResult> {
  const { input, channel } = request;
  const { deps, now, isTest } = scope;
  const start = Date.parse(input.slot);
  const shot = await snapshot(scope, true);
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
  const timeZone = (input.timeZone && canonicalZone(input.timeZone)) || null;
  const hold = await holdSlot(
    deps.db,
    { id, slot, email: input.email, channel, timeZone, isTest },
    BOOKING_RULES,
    now,
  );
  if (hold === 'lost') {
    return {
      status: 'rejected',
      reason: await holdFailure(
        deps.db,
        { email: input.email, isTest, day: slot.day },
        BOOKING_RULES,
        now,
      ),
    };
  }

  const created = await createEvent(shot.ready.access, shot.ready.calendarId, {
    bookingId: id,
    start: slot.start,
    end: slot.end,
    zone: BOOKING_RULES.zone,
    email: input.email,
    locale: input.locale,
  });
  const context = (
    status: Outcome,
    event: { meetUrl: string | null; htmlLink: string | null },
  ): BookingContext => ({
    id,
    start: slot.start,
    end: slot.end,
    timeZone,
    channel,
    calendar: isTest ? 'test' : 'main',
    status,
    meetUrl: event.meetUrl,
    eventLink: event.htmlLink,
  });

  if (!created.ok) {
    logError('insert', created.code);
    const none = { meetUrl: null, htmlLink: null };
    await store({
      request,
      scope,
      context: context(created.unknown ? 'unknown' : 'failed', none),
      finish: (leadId) =>
        created.unknown
          ? unknownStatement(deps.db, id, leadId)
          : failStatement(deps.db, id, leadId),
    });
    return { status: 'unavailable', reason: 'calendar_error' };
  }

  const { value: event } = created;
  await store({
    request,
    scope,
    context: context('confirmed', event),
    finish: (leadId) =>
      confirmStatement(
        deps.db,
        { id, eventId: event.eventId, meetUrl: event.meetUrl },
        leadId,
      ),
  });
  return {
    status: 'booked',
    start: slot.start,
    end: slot.end,
    meetUrl: event.meetUrl,
  };
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
  const work = run(request, scope);
  scope.deps.waitUntil(work.then(noop, noop));
  return work;
}
