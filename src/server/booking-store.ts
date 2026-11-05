import { z } from 'zod';
import type { BookingRules } from '@/content/booking-rules';
import type { Slot } from '@/lib/slots';
import { DAY_MS } from '@/lib/time';
import {
  CHANNELS,
  type Channel,
  type PendingRequest,
  pendingRequestSchema,
} from '@/server/booking-schema';
import { parseToken, secretMatches } from '@/server/booking-token';
import type { BookingLimits } from '../../site.config';

// A pending booking is a 'held' row with a request and no confirmed_at. Its
// hold lasts until the confirm link expires; a click turns it into the short
// insert window (holdSeconds) while the calendar event is created.

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
  exclude: string | null = null,
): Promise<Slot[]> {
  const { results } = await db
    .prepare(
      `SELECT slot_start, slot_end, day FROM bookings
       WHERE is_test = ?1 AND slot_start >= ?2 AND slot_start < ?3
         AND (status IN ('confirmed', 'unknown') OR (status = 'held' AND hold_expires_at > ?4))
         AND (?5 IS NULL OR id <> ?5)
       ORDER BY slot_start`,
    )
    .bind(isTest ? 1 : 0, range.from, range.to, now, exclude)
    .all();
  return results.map((row) => {
    const { slot_start, slot_end, day } = slotRowSchema.parse(row);
    return { start: slot_start, end: slot_end, day };
  });
}

export function isUniqueViolation(error: unknown): boolean {
  return (
    error instanceof Error && /UNIQUE constraint failed/i.test(error.message)
  );
}

// A pending booking, as SQL: `now` is the bound position of the current time.
export function pendingSql(now: string, alias = ''): string {
  const a = alias === '' ? '' : `${alias}.`;
  return `${a}status = 'held' AND ${a}confirmed_at IS NULL AND ${a}request IS NOT NULL AND ${a}hold_expires_at > ${now}`;
}

// The caps every verify email counts against, as SQL over named positions:
// the address (rolling 24 h), the whole site (UTC day) and the IP fingerprint
// (UTC day; skipped when there is none, as for voice). The address and site
// caps count only rows of the same kind (test or live), so previews on the
// shared database never use up production's day.
export type Caps = {
  emailKey: string;
  dayStart: number;
  ipKey: string | null;
  ipDay: string;
  isTest: boolean;
};

type CapParams = Caps & { now: number; limits: BookingLimits };

function capClause(first: number): string {
  const p = (offset: number) => `?${first + offset}`;
  return `(SELECT count(*) FROM booking_emails e JOIN bookings b ON b.id = e.booking_id
            WHERE b.email_key = ${p(0)} AND b.is_test = ${p(8)} AND e.kind = 'verify'
              AND e.created_at > ${p(1)} - ${DAY_MS}) < ${p(2)}
     AND (SELECT count(*) FROM booking_emails e JOIN bookings b ON b.id = e.booking_id
            WHERE b.is_test = ${p(8)} AND e.kind = 'verify' AND e.created_at >= ${p(3)}) < ${p(4)}
     AND (${p(5)} IS NULL OR coalesce(
           (SELECT sends FROM booking_ip_usage WHERE day = ${p(6)} AND key = ${p(5)}), 0) < ${p(7)})`;
}

function capValues(caps: CapParams): unknown[] {
  return [
    caps.emailKey,
    caps.now,
    caps.limits.perAddressDaily,
    caps.dayStart,
    caps.limits.siteDaily,
    caps.ipKey,
    caps.ipDay,
    caps.limits.perIpDaily,
    caps.isTest ? 1 : 0,
  ];
}

function bumpIp(
  db: D1Database,
  caps: CapParams,
  existsSql: string,
  existsId: string,
): D1PreparedStatement[] {
  if (caps.ipKey === null) return [];
  return [
    db
      .prepare(
        `INSERT INTO booking_ip_usage (day, key, sends)
         SELECT ?1, ?2, 1 WHERE EXISTS (${existsSql})
         ON CONFLICT (day, key) DO UPDATE SET sends = sends + 1`,
      )
      .bind(caps.ipDay, caps.ipKey, existsId),
  ];
}

export function sweepStatement(
  db: D1Database,
  now: number,
): D1PreparedStatement {
  return db
    .prepare(
      `UPDATE bookings SET status = 'expired', request = NULL
       WHERE status = 'held' AND hold_expires_at <= ?1`,
    )
    .bind(now);
}

export type PendingHold = {
  id: string;
  verifyId: string;
  slot: Slot;
  email: string;
  channel: Channel;
  timeZone: string | null;
  isTest: boolean;
  request: string;
  origin: string;
  caps: Caps;
};

// One atomic batch: sweep expired holds, insert the pending row only if every
// cap allows it, then count the IP and queue the verify email only if it did.
export async function holdPending(
  db: D1Database,
  hold: PendingHold,
  rules: Pick<BookingRules, 'bufferMinutes' | 'maxPerDay' | 'confirmMinutes'>,
  limits: BookingLimits,
  now: number,
): Promise<'won' | 'lost'> {
  const test = hold.isTest ? 1 : 0;
  const caps: CapParams = { ...hold.caps, now, limits };
  const expires = now + rules.confirmMinutes * 60_000;
  try {
    const [, insert] = await db.batch([
      sweepStatement(db, now),
      db
        .prepare(
          `INSERT INTO bookings (id, created_at, slot_start, slot_end, day, status,
             hold_expires_at, email, channel, time_zone, is_test, email_key, request,
             link_origin, confirm_expires_at)
           SELECT ?1, ?2, ?3, ?4, ?5, 'held', ?6, ?7, ?8, ?9, ?10, ?13, ?14, ?15, ?6
           WHERE NOT EXISTS (
               SELECT 1 FROM bookings
               WHERE is_test = ?10 AND status IN ('held', 'confirmed', 'unknown')
                 AND slot_start < ?4 + ?11 AND slot_end > ?3 - ?11)
             AND (SELECT count(*) FROM bookings
                  WHERE is_test = ?10 AND day = ?5 AND status IN ('held', 'confirmed', 'unknown')) < ?12
             AND NOT EXISTS (
               SELECT 1 FROM bookings
               WHERE (email_key = ?13 OR email = ?7) AND is_test = ?10 AND created_at > ?2 - ${DAY_MS}
                 AND status IN ('held', 'confirmed', 'unknown'))
             AND ${capClause(16)}`,
        )
        .bind(
          hold.id,
          now,
          hold.slot.start,
          hold.slot.end,
          hold.slot.day,
          expires,
          hold.email,
          hold.channel,
          hold.timeZone,
          test,
          rules.bufferMinutes * 60_000,
          rules.maxPerDay,
          hold.caps.emailKey,
          hold.request,
          hold.origin,
          ...capValues(caps),
        ),
      ...bumpIp(db, caps, 'SELECT 1 FROM bookings WHERE id = ?3', hold.id),
      db
        .prepare(
          `INSERT INTO booking_emails (id, booking_id, kind, created_at, next_attempt_at)
           SELECT ?1, ?2, 'verify', ?3, ?3 WHERE EXISTS (SELECT 1 FROM bookings WHERE id = ?2)`,
        )
        .bind(hold.verifyId, hold.id, now),
    ]);
    return insert?.meta.changes === 1 ? 'won' : 'lost';
  } catch (error) {
    if (isUniqueViolation(error)) return 'lost';
    throw error;
  }
}

const pendingMatchSchema = z.object({
  id: z.string(),
  slot_end: z.number(),
  hold_expires_at: z.number(),
  last_verify: z.number().nullable(),
});

export type PendingMatch = {
  id: string;
  end: number;
  expiresAt: number;
  lastVerifyAt: number | null;
};

// The visitor's own pending request for this slot, if they submit it again
// (the same mailbox: a `+tag` or Gmail-dot variant is the same visitor).
export async function findPending(
  db: D1Database,
  key: { emailKey: string; slotStart: number; isTest: boolean },
  now: number,
): Promise<PendingMatch | null> {
  const row = await db
    .prepare(
      `SELECT b.id, b.slot_end, b.hold_expires_at,
         (SELECT max(created_at) FROM booking_emails
          WHERE booking_id = b.id AND kind = 'verify') AS last_verify
       FROM bookings b
       WHERE b.email_key = ?1 AND b.slot_start = ?2 AND b.is_test = ?3
         AND ${pendingSql('?4', 'b')}
       LIMIT 1`,
    )
    .bind(key.emailKey, key.slotStart, key.isTest ? 1 : 0, now)
    .first();
  const parsed = pendingMatchSchema.safeParse(row);
  if (!parsed.success) return null;
  const { id, slot_end, hold_expires_at, last_verify } = parsed.data;
  return {
    id,
    end: slot_end,
    expiresAt: hold_expires_at,
    lastVerifyAt: last_verify,
  };
}

// A new verify email for a pending booking, under the same caps and outside
// the cooldown, in one conditional INSERT so two resends at once cannot both
// pass. It never extends the hold; older unsent verify rows are dropped.
export async function queueResend(
  db: D1Database,
  resend: { bookingId: string; verifyId: string; caps: Caps },
  limits: BookingLimits,
  now: number,
): Promise<'queued' | 'cooldown' | 'limit'> {
  const caps: CapParams = { ...resend.caps, now, limits };
  const cooldownMs = limits.resendCooldownSeconds * 1000;
  const exists = 'SELECT 1 FROM booking_emails WHERE id = ?3';
  const [insert] = await db.batch([
    db
      .prepare(
        `INSERT INTO booking_emails (id, booking_id, kind, created_at, next_attempt_at)
         SELECT ?1, ?2, 'verify', ?3, ?3
         WHERE EXISTS (SELECT 1 FROM bookings WHERE id = ?2 AND ${pendingSql('?3')})
           AND NOT EXISTS (
             SELECT 1 FROM booking_emails
             WHERE booking_id = ?2 AND kind = 'verify' AND created_at > ?3 - ?13)
           AND ${capClause(4)}`,
      )
      .bind(
        resend.verifyId,
        resend.bookingId,
        now,
        ...capValues(caps),
        cooldownMs,
      ),
    db
      .prepare(
        `UPDATE booking_emails SET status = 'dead', last_error = 'replaced'
         WHERE booking_id = ?1 AND kind = 'verify' AND id <> ?2
           AND status IN ('pending', 'failed')
           AND EXISTS (SELECT 1 FROM booking_emails WHERE id = ?2)`,
      )
      .bind(resend.bookingId, resend.verifyId),
    ...bumpIp(db, caps, exists, resend.verifyId),
  ]);
  if (insert?.meta.changes === 1) return 'queued';
  const recent = await db
    .prepare(
      `SELECT 1 AS hit FROM booking_emails
       WHERE booking_id = ?1 AND kind = 'verify' AND created_at > ?2 - ?3 LIMIT 1`,
    )
    .bind(resend.bookingId, now, cooldownMs)
    .first();
  return recent === null ? 'limit' : 'cooldown';
}

export type HoldFailure = 'limit' | 'day_full' | 'slot_taken';

// Which cap refused a request: logged for the owner, never told the visitor.
export type LimitCap = 'active' | 'address' | 'site' | 'ip';

const countsSchema = z.object({
  by_email: z.number(),
  by_day: z.number(),
  emails: z.number(),
  site: z.number(),
  ip: z.number(),
});

// Why a hold lost, for the visitor: one of the caps, a full day, or the slot
// itself. The visitor never learns which cap it was.
export async function holdFailure(
  db: D1Database,
  hold: { email: string; day: string } & Caps,
  rules: Pick<BookingRules, 'maxPerDay'>,
  limits: BookingLimits,
  now: number,
  // A resend's own pending booking is not a second active one.
  resend = false,
): Promise<{ reason: HoldFailure; cap: LimitCap | null }> {
  const active = `(status IN ('confirmed', 'unknown') OR (status = 'held' AND hold_expires_at > ?4))`;
  const row = await db
    .prepare(
      `SELECT
         (SELECT count(*) FROM bookings WHERE (email_key = ?5 OR email = ?1) AND is_test = ?2
            AND created_at > ?4 - ${DAY_MS} AND ${active}) AS by_email,
         (SELECT count(*) FROM bookings WHERE day = ?3 AND is_test = ?2 AND ${active}) AS by_day,
         (SELECT count(*) FROM booking_emails e JOIN bookings b ON b.id = e.booking_id
            WHERE b.email_key = ?5 AND b.is_test = ?2 AND e.kind = 'verify'
              AND e.created_at > ?4 - ${DAY_MS}) AS emails,
         (SELECT count(*) FROM booking_emails e JOIN bookings b ON b.id = e.booking_id
            WHERE b.is_test = ?2 AND e.kind = 'verify' AND e.created_at >= ?6) AS site,
         coalesce((SELECT sends FROM booking_ip_usage WHERE day = ?7 AND key = ?8), 0) AS ip`,
    )
    .bind(
      hold.email,
      hold.isTest ? 1 : 0,
      hold.day,
      now,
      hold.emailKey,
      hold.dayStart,
      hold.ipDay,
      hold.ipKey,
    )
    .first();
  const counts = countsSchema.safeParse(row);
  if (!counts.success) return { reason: 'slot_taken', cap: null };
  const { by_email, by_day, emails, site, ip } = counts.data;
  const cap: LimitCap | null =
    by_email > 0 && !resend
      ? 'active'
      : emails >= limits.perAddressDaily
        ? 'address'
        : site >= limits.siteDaily
          ? 'site'
          : hold.ipKey !== null && ip >= limits.perIpDaily
            ? 'ip'
            : null;
  if (cap !== null) return { reason: 'limit', cap };
  return {
    reason: by_day >= rules.maxPerDay ? 'day_full' : 'slot_taken',
    cap: null,
  };
}

const STATUSES = [
  'held',
  'confirmed',
  'unknown',
  'failed',
  'expired',
  'cancelled',
] as const;

const bookingRowSchema = z.object({
  id: z.string(),
  created_at: z.number(),
  slot_start: z.number(),
  slot_end: z.number(),
  day: z.string(),
  status: z.enum(STATUSES),
  hold_expires_at: z.number().nullable(),
  email: z.string(),
  channel: z.enum(CHANNELS),
  time_zone: z.string().nullable(),
  event_id: z.string().nullable(),
  meet_url: z.string().nullable(),
  lead_id: z.string().nullable(),
  is_test: z.union([z.literal(0), z.literal(1)]),
  request: z.string().nullable(),
  link_origin: z.string().nullable(),
  confirm_hash: z.string().nullable(),
  confirm_expires_at: z.number().nullable(),
  confirmed_at: z.number().nullable(),
  cancel_hash: z.string().nullable(),
  cancelled_at: z.number().nullable(),
  event_deleted_at: z.number().nullable(),
  lead_locale: z.enum(['en', 'es']).nullable(),
  lead_name: z.string().nullable(),
  lead_company: z.string().nullable(),
});

export type BookingRow = z.infer<typeof bookingRowSchema>;

export async function bookingRow(
  db: D1Database,
  id: string,
): Promise<BookingRow | null> {
  const row = await db
    .prepare(
      `SELECT b.id, b.created_at, b.slot_start, b.slot_end, b.day, b.status,
         b.hold_expires_at, b.email, b.channel, b.time_zone, b.event_id, b.meet_url,
         b.lead_id, b.is_test, b.request, b.link_origin, b.confirm_hash,
         b.confirm_expires_at, b.confirmed_at, b.cancel_hash, b.cancelled_at,
         b.event_deleted_at, l.locale AS lead_locale, l.name AS lead_name,
         l.company AS lead_company
       FROM bookings b LEFT JOIN leads l ON l.id = b.lead_id
       WHERE b.id = ?1`,
    )
    .bind(id)
    .first();
  if (row === null) return null;
  const parsed = bookingRowSchema.safeParse(row);
  if (!parsed.success) {
    console.error('booking: unreadable row', { bookingId: id });
    return null;
  }
  return parsed.data;
}

export function isPendingRow(row: BookingRow, now: number): boolean {
  return (
    row.status === 'held' &&
    row.confirmed_at === null &&
    row.request !== null &&
    (row.hold_expires_at ?? 0) > now
  );
}

// The details a pending request keeps, or null for a row that has none.
export function readRequest(row: BookingRow): PendingRequest | null {
  try {
    const parsed = pendingRequestSchema.safeParse(
      JSON.parse(row.request ?? ''),
    );
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

const HASH_COLUMN = { confirm: 'confirm_hash', cancel: 'cancel_hash' } as const;

// The booking behind a visitor's confirm link or the owner's cancel link,
// after the constant-time check, or null. Never says whether the id exists.
export async function bookingForToken(
  db: D1Database,
  token: unknown,
  kind: keyof typeof HASH_COLUMN,
): Promise<BookingRow | null> {
  const parsed = parseToken(token);
  if (parsed === null) return null;
  const row = await bookingRow(db, parsed.id);
  if (row === null) return null;
  const stored = row[HASH_COLUMN[kind]];
  return (await secretMatches(parsed.secret, stored)) ? row : null;
}

// The hash of the link a verify email carried, written once Resend took the
// email, and only while the request is pending: a failed or throttled send
// never replaces the link the visitor already has.
export function confirmHashStatement(
  db: D1Database,
  bookingId: string,
  hash: string,
  now: number,
): D1PreparedStatement {
  return db
    .prepare(
      `UPDATE bookings SET confirm_hash = ?1 WHERE id = ?2 AND ${pendingSql('?3')}`,
    )
    .bind(hash, bookingId, now);
}

// The one-time use of a confirm link: the winner of a double click turns the
// pending hold into the insert window, the loser changes nothing.
export async function consumeConfirm(
  db: D1Database,
  booking: { id: string; hash: string },
  rules: Pick<BookingRules, 'holdSeconds'>,
  now: number,
): Promise<boolean> {
  const result = await db
    .prepare(
      `UPDATE bookings SET confirmed_at = ?1, hold_expires_at = ?2
       WHERE id = ?3 AND status = 'held' AND confirmed_at IS NULL
         AND confirm_hash = ?4 AND confirm_expires_at > ?1 AND hold_expires_at > ?1`,
    )
    .bind(now, now + rules.holdSeconds * 1000, booking.id, booking.hash)
    .run();
  return result.meta.changes === 1;
}

// The slot went while the visitor read the email: the request lapses now.
export async function expireBooking(
  db: D1Database,
  bookingId: string,
): Promise<void> {
  await db
    .prepare(
      `UPDATE bookings SET status = 'expired', request = NULL
       WHERE id = ?1 AND status = 'held' AND confirmed_at IS NULL`,
    )
    .bind(bookingId)
    .run();
}

export async function expirePendingBookings(
  db: D1Database,
  now: number,
): Promise<number> {
  const result = await sweepStatement(db, now).run();
  return result.meta.changes;
}

export function confirmStatement(
  db: D1Database,
  booking: { id: string; eventId: string; meetUrl: string | null },
  leadId: string,
): D1PreparedStatement {
  return db
    .prepare(
      `UPDATE bookings SET status = 'confirmed', event_id = ?1, meet_url = ?2, lead_id = ?3,
         hold_expires_at = NULL, request = NULL
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
      `UPDATE bookings SET status = 'failed', lead_id = ?1, hold_expires_at = NULL,
         request = NULL
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
      `UPDATE bookings SET status = 'unknown', lead_id = ?1, hold_expires_at = NULL,
         request = NULL
       WHERE id = ?2 AND status = 'held'`,
    )
    .bind(leadId, bookingId);
}

// The owner's cancel link: stored as a hash while the booking is confirmed.
// The secret is derived from the owner email's id, so a retried email writes
// the same hash and an earlier copy of the link keeps working.
export async function setCancelHash(
  db: D1Database,
  bookingId: string,
  hash: string,
): Promise<boolean> {
  const result = await db
    .prepare(
      `UPDATE bookings SET cancel_hash = ?1
       WHERE id = ?2 AND status = 'confirmed' AND cancelled_at IS NULL`,
    )
    .bind(hash, bookingId)
    .run();
  return result.meta.changes === 1;
}

// A claim older than this belongs to a cancel that died midway.
const CANCEL_CLAIM_MS = 60_000;

export async function claimCancel(
  db: D1Database,
  bookingId: string,
  now: number,
): Promise<boolean> {
  const result = await db
    .prepare(
      `UPDATE bookings SET cancelled_at = ?1
       WHERE id = ?2 AND status = 'confirmed'
         AND (cancelled_at IS NULL OR cancelled_at < ?1 - ${CANCEL_CLAIM_MS})`,
    )
    .bind(now, bookingId)
    .run();
  return result.meta.changes === 1;
}

export async function releaseCancel(
  db: D1Database,
  bookingId: string,
): Promise<void> {
  await db
    .prepare(
      `UPDATE bookings SET cancelled_at = NULL
       WHERE id = ?1 AND status = 'confirmed'`,
    )
    .bind(bookingId)
    .run();
}

// The event is gone: the row is cancelled and the visitor's email is queued.
export async function finishCancel(
  db: D1Database,
  booking: { id: string; emailId: string },
  now: number,
): Promise<void> {
  await db.batch([
    db
      .prepare(
        `UPDATE bookings SET status = 'cancelled', event_deleted_at = ?1, hold_expires_at = NULL
         WHERE id = ?2 AND status = 'confirmed'`,
      )
      .bind(now, booking.id),
    db
      .prepare(
        `INSERT INTO booking_emails (id, booking_id, kind, created_at, next_attempt_at)
         SELECT ?1, ?2, 'cancelled', ?3, ?3
         WHERE EXISTS (SELECT 1 FROM bookings WHERE id = ?2 AND status = 'cancelled')`,
      )
      .bind(booking.emailId, booking.id, now),
  ]);
}

const purgeRowSchema = z.object({
  id: z.string(),
  event_id: z.string().nullable(),
  is_test: z.union([z.literal(0), z.literal(1)]),
});

export type PurgeTarget = {
  id: string;
  eventId: string | null;
  isTest: boolean;
};

// Bookings whose lead is past the 24 months and whose event still exists,
// the least recently tried first, so rows that keep failing cannot starve the rest.
export async function calendarPurgeDue(
  db: D1Database,
  before: number,
  limit: number,
): Promise<PurgeTarget[]> {
  const { results } = await db
    .prepare(
      `SELECT b.id, b.event_id, b.is_test FROM bookings b JOIN leads l ON l.id = b.lead_id
       WHERE b.status IN ('confirmed', 'unknown') AND b.event_deleted_at IS NULL
         AND l.created_at < ?1
       ORDER BY coalesce(b.purge_tried_at, 0), l.created_at
       LIMIT ?2`,
    )
    .bind(before, limit)
    .all();
  return results.flatMap((row) => {
    const parsed = purgeRowSchema.safeParse(row);
    if (!parsed.success) return [];
    return [
      {
        id: parsed.data.id,
        eventId: parsed.data.event_id,
        isTest: parsed.data.is_test === 1,
      },
    ];
  });
}

export async function markEventDeleted(
  db: D1Database,
  bookingId: string,
  now: number,
): Promise<void> {
  await db
    .prepare('UPDATE bookings SET event_deleted_at = ?1 WHERE id = ?2')
    .bind(now, bookingId)
    .run();
}

export async function markPurgeTried(
  db: D1Database,
  bookingId: string,
  now: number,
): Promise<void> {
  await db
    .prepare('UPDATE bookings SET purge_tried_at = ?1 WHERE id = ?2')
    .bind(now, bookingId)
    .run();
}
