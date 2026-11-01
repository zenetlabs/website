import { z } from 'zod';
import type { Locale } from '@/lib/i18n';
import type { Interval } from '@/lib/slots';
import { failureCodeOf } from '@/server/fetch-error';

const FREEBUSY_TIMEOUT_MS = 5_000;
const EVENT_TIMEOUT_MS = 10_000;
const CONFERENCE_WAIT_MS = 1_000;

const EVENT_TEXT: Record<Locale, { summary: string; description: string }> = {
  en: {
    summary: 'Zenet Labs · 30-minute call',
    description:
      'A 30-minute video call with Zenet Labs about automating manual work in your company. To change the time or cancel, reply to the confirmation email.',
  },
  es: {
    summary: 'Zenet Labs · llamada de 30 minutos',
    description:
      'Una videollamada de 30 minutos con Zenet Labs sobre cómo automatizar el trabajo manual de tu empresa. Para cambiar la hora o cancelarla, responde al correo de confirmación.',
  },
};

export type CalendarResult<T> =
  | { ok: true; value: T }
  | { ok: false; code: string };

// unknown: the insert response was lost and the follow-up read failed too, so the
// event may exist. Never treat that as "nothing was created".
export type EventResult =
  | { ok: true; value: CalendarEvent }
  | { ok: false; code: string; unknown: boolean };

export type CalendarAccess = {
  calendarUrl: string;
  token: string;
  fetch: typeof fetch;
};

type Reply = { status: number; body: unknown };
type Failure = { code: 'network' | 'timeout' };

async function call(
  access: CalendarAccess,
  path: string,
  init: { method: 'GET' | 'POST'; json?: unknown },
  timeoutMs: number,
): Promise<Reply | Failure> {
  try {
    const response = await access.fetch(`${access.calendarUrl}${path}`, {
      method: init.method,
      headers: {
        Authorization: `Bearer ${access.token}`,
        ...(init.json === undefined
          ? {}
          : { 'Content-Type': 'application/json' }),
      },
      ...(init.json === undefined ? {} : { body: JSON.stringify(init.json) }),
      signal: AbortSignal.timeout(timeoutMs),
    });
    const body: unknown = await response.json().catch(() => undefined);
    return { status: response.status, body };
  } catch (error) {
    return { code: failureCodeOf(error) };
  }
}

function isFailure(reply: Reply | Failure): reply is Failure {
  return 'code' in reply;
}

const instant = z.iso.datetime({ offset: true });

const busySchema = z.object({
  calendars: z.record(
    z.string(),
    z.object({
      busy: z.array(z.object({ start: instant, end: instant })).default([]),
      errors: z.array(z.object({ reason: z.string().optional() })).optional(),
    }),
  ),
});

export async function freeBusy(
  access: CalendarAccess,
  calendarId: string,
  from: number,
  to: number,
): Promise<CalendarResult<Interval[]>> {
  const reply = await call(
    access,
    '/freeBusy',
    {
      method: 'POST',
      json: {
        timeMin: new Date(from).toISOString(),
        timeMax: new Date(to).toISOString(),
        items: [{ id: calendarId }],
      },
    },
    FREEBUSY_TIMEOUT_MS,
  );
  if (isFailure(reply)) return { ok: false, code: reply.code };
  if (reply.status !== 200) {
    return { ok: false, code: `freebusy_http_${reply.status}` };
  }
  const parsed = busySchema.safeParse(reply.body);
  const entry = parsed.success ? parsed.data.calendars[calendarId] : undefined;
  if (entry === undefined) return { ok: false, code: 'freebusy_response' };
  const [failed] = entry.errors ?? [];
  if (failed)
    return { ok: false, code: `freebusy_${failed.reason ?? 'error'}` };
  return {
    ok: true,
    value: entry.busy.map(({ start, end }) => ({
      start: Date.parse(start),
      end: Date.parse(end),
    })),
  };
}

const eventSchema = z.object({
  id: z.string(),
  htmlLink: z.string().optional(),
  hangoutLink: z.string().optional(),
  conferenceData: z
    .object({
      createRequest: z
        .object({ status: z.object({ statusCode: z.string() }).optional() })
        .optional(),
      entryPoints: z
        .array(
          z.object({ entryPointType: z.string(), uri: z.string().optional() }),
        )
        .optional(),
    })
    .optional(),
});

const errorSchema = z.object({
  error: z.object({
    message: z.string().optional(),
    errors: z.array(z.object({ reason: z.string().optional() })).optional(),
  }),
});

export type CalendarEvent = {
  eventId: string;
  htmlLink: string | null;
  meetUrl: string | null;
  conference: 'ready' | 'pending' | 'failed';
};

function httpsUrl(value: string | undefined): string | null {
  if (value === undefined) return null;
  try {
    return new URL(value).protocol === 'https:' ? value : null;
  } catch {
    return null;
  }
}

function summarise(event: z.infer<typeof eventSchema>): CalendarEvent {
  const video = event.conferenceData?.entryPoints?.find(
    (entry) => entry.entryPointType === 'video',
  );
  const meetUrl = httpsUrl(event.hangoutLink) ?? httpsUrl(video?.uri);
  const status = event.conferenceData?.createRequest?.status?.statusCode;
  let conference: CalendarEvent['conference'] = 'pending';
  if (meetUrl !== null) conference = 'ready';
  else if (status === 'failure') conference = 'failed';
  return {
    eventId: event.id,
    htmlLink: httpsUrl(event.htmlLink),
    meetUrl,
    conference,
  };
}

function eventPath(calendarId: string): string {
  return `/calendars/${encodeURIComponent(calendarId)}/events`;
}

async function getEvent(
  access: CalendarAccess,
  calendarId: string,
  eventId: string,
): Promise<CalendarResult<CalendarEvent | null>> {
  const reply = await call(
    access,
    `${eventPath(calendarId)}/${encodeURIComponent(eventId)}`,
    { method: 'GET' },
    EVENT_TIMEOUT_MS,
  );
  if (isFailure(reply)) return { ok: false, code: reply.code };
  if (reply.status === 404) return { ok: true, value: null };
  const parsed = eventSchema.safeParse(reply.body);
  if (reply.status !== 200 || !parsed.success) {
    return { ok: false, code: `get_http_${reply.status}` };
  }
  return { ok: true, value: summarise(parsed.data) };
}

function insertFailure(reply: Reply): string {
  const parsed = errorSchema.safeParse(reply.body);
  const detail = parsed.success ? parsed.data.error : undefined;
  if (
    reply.status === 403 &&
    detail?.errors?.[0]?.reason === 'forbiddenForServiceAccounts'
  ) {
    return 'dwd';
  }
  if (reply.status === 400 && /conference/i.test(detail?.message ?? '')) {
    return 'conference';
  }
  return [400, 403, 409].includes(reply.status)
    ? `insert_${reply.status}`
    : `insert_http_${reply.status}`;
}

export type NewEvent = {
  bookingId: string;
  start: number;
  end: number;
  zone: string;
  email: string;
  locale: Locale;
};

export function eventIdFor(bookingId: string): string {
  return `bk${bookingId.replaceAll('-', '')}`;
}

type Wait = (ms: number) => Promise<void>;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function insert(
  access: CalendarAccess,
  calendarId: string,
  event: NewEvent,
): Promise<EventResult> {
  const id = eventIdFor(event.bookingId);
  const text = EVENT_TEXT[event.locale];
  const reply = await call(
    access,
    `${eventPath(calendarId)}?conferenceDataVersion=1&sendUpdates=all`,
    {
      method: 'POST',
      json: {
        id,
        summary: text.summary,
        description: text.description,
        start: {
          dateTime: new Date(event.start).toISOString(),
          timeZone: event.zone,
        },
        end: {
          dateTime: new Date(event.end).toISOString(),
          timeZone: event.zone,
        },
        attendees: [{ email: event.email }],
        conferenceData: {
          createRequest: {
            requestId: event.bookingId,
            conferenceSolutionKey: { type: 'hangoutsMeet' },
          },
        },
        guestsCanInviteOthers: false,
        guestsCanModify: false,
        guestsCanSeeOtherGuests: false,
        reminders: { useDefault: true },
        extendedProperties: { private: { zenetBookingId: event.bookingId } },
      },
    },
    EVENT_TIMEOUT_MS,
  );
  if (!isFailure(reply) && reply.status === 200) {
    const parsed = eventSchema.safeParse(reply.body);
    if (parsed.success) return { ok: true, value: summarise(parsed.data) };
  }
  const lost = isFailure(reply) || reply.status >= 500 || reply.status === 409;
  const code = isFailure(reply) ? reply.code : insertFailure(reply);
  if (!lost) return { ok: false, code, unknown: false };
  const found = await getEvent(access, calendarId, id);
  if (!found.ok) return { ok: false, code, unknown: true };
  return found.value === null
    ? { ok: false, code, unknown: false }
    : { ok: true, value: found.value };
}

// A Meet request that failed on an event that exists is still a booking: the
// visitor has the invitation, and the owner is told to add the link by hand.
export async function createEvent(
  access: CalendarAccess,
  calendarId: string,
  event: NewEvent,
  wait: Wait = sleep,
): Promise<EventResult> {
  const created = await insert(access, calendarId, event);
  if (!created.ok) return created;
  let latest = created.value;
  if (latest.conference === 'pending') {
    await wait(CONFERENCE_WAIT_MS);
    const again = await getEvent(access, calendarId, latest.eventId);
    if (again.ok && again.value) latest = again.value;
  }
  return { ok: true, value: latest };
}
