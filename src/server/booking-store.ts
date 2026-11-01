import { z } from 'zod';
import type { BookingRules } from '@/content/booking-rules';
import type { Slot } from '@/lib/slots';
import { DAY_MS } from '@/lib/time';
import type { Channel } from '@/server/booking-schema';

const slotRowSchema = z.object({
  slot_start: z.number(),
  slot_end: z.number(),
  day: z.string(),
});

export async function activeBookings(
  db: D1Database,
  range: { from: number; to: number },
  isTest: boolean,
  now: number,
): Promise<Slot[]> {
  const { results } = await db
    .prepare(
      `SELECT slot_start, slot_end, day FROM bookings
       WHERE is_test = ?1 AND slot_start >= ?2 AND slot_start < ?3
         AND (status IN ('confirmed', 'unknown') OR (status = 'held' AND hold_expires_at > ?4))
       ORDER BY slot_start`,
    )
    .bind(isTest ? 1 : 0, range.from, range.to, now)
    .all();
  return results.map((row) => {
    const { slot_start, slot_end, day } = slotRowSchema.parse(row);
    return { start: slot_start, end: slot_end, day };
  });
}

export type NewHold = {
  id: string;
  slot: Slot;
  email: string;
  channel: Channel;
  timeZone: string | null;
  isTest: boolean;
};

function isUniqueViolation(error: unknown): boolean {
  return (
    error instanceof Error && /UNIQUE constraint failed/i.test(error.message)
  );
}

export async function holdSlot(
  db: D1Database,
  hold: NewHold,
  rules: Pick<BookingRules, 'bufferMinutes' | 'maxPerDay' | 'holdSeconds'>,
  now: number,
): Promise<'won' | 'lost'> {
  const test = hold.isTest ? 1 : 0;
  try {
    const [, insert] = await db.batch([
      db
        .prepare(
          `UPDATE bookings SET status = 'expired'
           WHERE status = 'held' AND hold_expires_at <= ?1`,
        )
        .bind(now),
      db
        .prepare(
          `INSERT INTO bookings (id, created_at, slot_start, slot_end, day, status,
             hold_expires_at, email, channel, time_zone, is_test)
           SELECT ?1, ?2, ?3, ?4, ?5, 'held', ?6, ?7, ?8, ?9, ?10
           WHERE NOT EXISTS (
               SELECT 1 FROM bookings
               WHERE is_test = ?10 AND status IN ('held', 'confirmed', 'unknown')
                 AND slot_start < ?4 + ?11 AND slot_end > ?3 - ?11)
             AND (SELECT count(*) FROM bookings
                  WHERE is_test = ?10 AND day = ?5 AND status IN ('held', 'confirmed', 'unknown')) < ?12
             AND NOT EXISTS (
               SELECT 1 FROM bookings
               WHERE email = ?7 AND is_test = ?10 AND created_at > ?2 - ${DAY_MS}
                 AND status IN ('held', 'confirmed', 'unknown'))`,
        )
        .bind(
          hold.id,
          now,
          hold.slot.start,
          hold.slot.end,
          hold.slot.day,
          now + rules.holdSeconds * 1000,
          hold.email,
          hold.channel,
          hold.timeZone,
          test,
          rules.bufferMinutes * 60_000,
          rules.maxPerDay,
        ),
    ]);
    return insert?.meta.changes === 1 ? 'won' : 'lost';
  } catch (error) {
    if (isUniqueViolation(error)) return 'lost';
    throw error;
  }
}

export function confirmStatement(
  db: D1Database,
  booking: { id: string; eventId: string; meetUrl: string | null },
  leadId: string,
): D1PreparedStatement {
  return db
    .prepare(
      `UPDATE bookings SET status = 'confirmed', event_id = ?1, meet_url = ?2, lead_id = ?3,
         hold_expires_at = NULL
       WHERE id = ?4 AND status = 'held'`,
    )
    .bind(booking.eventId, booking.meetUrl, leadId, booking.id);
}

export function failStatement(
  db: D1Database,
  bookingId: string,
  leadId: string,
): D1PreparedStatement {
  return db
    .prepare(
      `UPDATE bookings SET status = 'failed', lead_id = ?1, hold_expires_at = NULL
       WHERE id = ?2`,
    )
    .bind(leadId, bookingId);
}

// The event may exist but we could not confirm it: the slot stays blocked until
// the owner checks the calendar and sets the row to confirmed or cancelled.
export function unknownStatement(
  db: D1Database,
  bookingId: string,
  leadId: string,
): D1PreparedStatement {
  return db
    .prepare(
      `UPDATE bookings SET status = 'unknown', lead_id = ?1, hold_expires_at = NULL
       WHERE id = ?2 AND status = 'held'`,
    )
    .bind(leadId, bookingId);
}

export type HoldFailure = 'limit' | 'day_full' | 'slot_taken';

// Why a hold lost, for the visitor: the address cap, a full day, or the slot itself.
export async function holdFailure(
  db: D1Database,
  hold: Pick<NewHold, 'email' | 'isTest'> & { day: string },
  rules: Pick<BookingRules, 'maxPerDay'>,
  now: number,
): Promise<HoldFailure> {
  const active = `(status IN ('confirmed', 'unknown') OR (status = 'held' AND hold_expires_at > ?4))`;
  const row = await db
    .prepare(
      `SELECT
         (SELECT count(*) FROM bookings WHERE email = ?1 AND is_test = ?2
            AND created_at > ?4 - ${DAY_MS} AND ${active}) AS by_email,
         (SELECT count(*) FROM bookings WHERE day = ?3 AND is_test = ?2 AND ${active}) AS by_day`,
    )
    .bind(hold.email, hold.isTest ? 1 : 0, hold.day, now)
    .first();
  const counts = countsSchema.safeParse(row);
  if (!counts.success) return 'slot_taken';
  if (counts.data.by_email > 0) return 'limit';
  return counts.data.by_day >= rules.maxPerDay ? 'day_full' : 'slot_taken';
}

const countsSchema = z.object({ by_email: z.number(), by_day: z.number() });
