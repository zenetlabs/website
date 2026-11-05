import { DAY_MS } from '@/lib/time';
import {
  type BookingDeps,
  type CalendarReady,
  calendarFor,
} from '@/server/booking';
import {
  calendarPurgeDue,
  markEventDeleted,
  markPurgeTried,
} from '@/server/booking-store';
import { calendarIdFor, parseCalendarSecret } from '@/server/calendar-config';
import { deleteEvent, eventIdFor } from '@/server/google-calendar';
import { RETENTION_MS } from '@/server/lead-store';

const DAILY_LIMIT = 50;
// Past this a lead goes even if its event could not be deleted (an error is
// logged with the booking ids, for a hand deletion; RUNBOOK 12).
export const EVENT_BACKSTOP_MS = 760 * DAY_MS;

export type PurgeSummary = {
  due: number;
  deleted: number;
  failed: number;
  skipped: number;
};

// The privacy promise: calendar events go 24 months after the booking, like
// the lead. Silently (sendUpdates=none): nobody needs a cancellation for a
// call two years old. A failed or skipped row is tried again the next day,
// after the rows that were not tried yet.
export async function purgeCalendarEvents(
  deps: BookingDeps,
  now: number,
): Promise<PurgeSummary | 'unconfigured'> {
  const due = await calendarPurgeDue(deps.db, now - RETENTION_MS, DAILY_LIMIT);
  const summary: PurgeSummary = {
    due: due.length,
    deleted: 0,
    failed: 0,
    skipped: 0,
  };
  if (due.length === 0) return summary;
  const credentials = await parseCalendarSecret(await deps.calendarSecret());
  if (credentials === null) return 'unconfigured';
  const calendars = new Map<string, Promise<CalendarReady>>();
  for (const booking of due) {
    const calendarId = calendarIdFor(credentials, booking.isTest);
    if (calendarId === null) {
      // No calendar of this kind (a test row without test_calendar_id).
      summary.skipped += 1;
      await markPurgeTried(deps.db, booking.id, now);
      continue;
    }
    let calendar = calendars.get(calendarId);
    if (calendar === undefined) {
      calendar = calendarFor({ deps, now }, { credentials, calendarId });
      calendars.set(calendarId, calendar);
    }
    const ready = await calendar;
    const deleted = ready.ok
      ? await deleteEvent(
          ready.access,
          ready.calendarId,
          booking.eventId ?? eventIdFor(booking.id),
          'none',
        )
      : { ok: false, code: ready.reason };
    if (deleted.ok) {
      await markEventDeleted(deps.db, booking.id, now);
      summary.deleted += 1;
    } else {
      console.error('scheduled: calendar delete failed', {
        bookingId: booking.id,
        code: deleted.code,
      });
      await markPurgeTried(deps.db, booking.id, now);
      summary.failed += 1;
    }
  }
  return summary;
}

// Bookings whose event is still listed past the backstop: their leads go now.
export async function overdueEvents(
  db: D1Database,
  now: number,
): Promise<string[]> {
  const { results } = await db
    .prepare(
      `SELECT b.id FROM bookings b JOIN leads l ON l.id = b.lead_id
       WHERE b.status IN ('confirmed', 'unknown') AND b.event_deleted_at IS NULL
         AND l.created_at < ?1`,
    )
    .bind(now - EVENT_BACKSTOP_MS)
    .all();
  return results.flatMap((row) => (typeof row.id === 'string' ? [row.id] : []));
}
