import { z } from 'zod';
import type { Locale } from '@/lib/i18n';
import {
  cancelledEmail,
  type VisitorBooking,
  verifyEmail,
} from '@/server/booking-emails';
import {
  type BookingRow,
  bookingRow,
  confirmHashStatement,
  isPendingRow,
  pendingSql,
  readRequest,
} from '@/server/booking-store';
import { deriveSecret, formatToken, hashSecret } from '@/server/booking-token';
import {
  claimEmail,
  deferEmail,
  markDead,
  markFailed,
  memoizedKey,
  sentStatement,
} from '@/server/email-queue';
import { idempotencyKey, type OutboxDeps } from '@/server/outbox';
import { type OutgoingEmail, sendEmail } from '@/server/resend';
import { errorName } from '@/server/responses';

const DUE_LIMIT = 10;
const TICK_MS = 600_000;
const TABLE = 'booking_emails';

export type BookingEmailKind = 'verify' | 'cancelled';

export type BookingEmail = {
  id: string;
  kind: BookingEmailKind;
  attempts: number;
  bookingId: string;
};

const dueSchema = z.object({
  id: z.string(),
  kind: z.enum(['verify', 'cancelled']),
  attempts: z.number(),
  booking_id: z.string(),
});

function visitor(
  row: BookingRow,
  locale: Locale,
  siteUrl: string,
): VisitorBooking {
  return {
    locale,
    email: row.email,
    start: row.slot_start,
    timeZone: row.time_zone,
    origin: row.link_origin ?? siteUrl,
    expiresAt: row.hold_expires_at ?? row.slot_start,
  };
}

type Built =
  | { message: OutgoingEmail; confirmHash: string | null }
  | { dead: string };

// The message for this row, or the reason it can no longer be sent. A verify
// email's link is derived from its own id, so a retry sends the same link.
async function build(
  deps: OutboxDeps,
  email: BookingEmail,
  now: number,
): Promise<Built> {
  const row = await bookingRow(deps.db, email.bookingId);
  if (row === null) return { dead: 'missing' };
  if (email.kind === 'cancelled') {
    if (row.status !== 'cancelled') return { dead: 'not_cancelled' };
    return {
      message: cancelledEmail(
        visitor(row, row.lead_locale ?? 'en', deps.site.url),
      ),
      confirmHash: null,
    };
  }
  const request = readRequest(row);
  if (!isPendingRow(row, now) || request === null) return { dead: 'expired' };
  const secret = await deriveSecret(await deps.linkKey(), `verify|${email.id}`);
  return {
    message: verifyEmail(
      visitor(row, request.locale, deps.site.url),
      formatToken({ id: row.id, secret }),
    ),
    confirmHash: await hashSecret(secret),
  };
}

type Outcome = 'done' | 'throttled';

async function attempt(
  deps: OutboxDeps,
  apiKey: () => Promise<string>,
  email: BookingEmail,
  now: number,
): Promise<Outcome> {
  const { db, server } = deps;
  const ids = {
    emailId: email.id,
    bookingId: email.bookingId,
    kind: email.kind,
    attempt: email.attempts + 1,
  };
  try {
    if (!(await claimEmail(db, TABLE, email, now))) return 'done';
    let built: Built;
    let key: string;
    try {
      built = await build(deps, email, now);
      key = await apiKey();
    } catch {
      await markFailed(db, TABLE, email.id, 'secret');
      console.error('booking-email: failed', { ...ids, error: 'secret' });
      return 'done';
    }
    if ('dead' in built) {
      await markDead(db, TABLE, [email.id], built.dead);
      return 'done';
    }
    const result = await sendEmail({
      apiKey: key,
      baseUrl: server.resendBaseUrl,
      idempotencyKey: await idempotencyKey(
        email.id,
        built.message,
        'booking-email',
      ),
      message: built.message,
      fetch: deps.fetch,
    });
    if (result.ok) {
      // Only now does the new link replace the one the visitor already has.
      await db.batch([
        sentStatement(db, TABLE, email.id, now, result.id),
        ...(built.confirmHash === null
          ? []
          : [
              confirmHashStatement(db, email.bookingId, built.confirmHash, now),
            ]),
      ]);
    } else if (result.throttled) {
      await deferEmail(db, TABLE, email.id, now + TICK_MS, result.error);
      console.error('booking-email: throttled', {
        ...ids,
        error: result.error,
      });
      return 'throttled';
    } else {
      await markFailed(db, TABLE, email.id, result.error);
      console.error('booking-email: failed', { ...ids, error: result.error });
    }
  } catch (error) {
    console.error('booking-email: bookkeeping failed', {
      ...ids,
      error: errorName(error),
    });
  }
  return 'done';
}

// Sent at once, right after the row was queued; the cron retries a failure.
export async function deliverBookingEmails(
  deps: OutboxDeps,
  emails: readonly BookingEmail[],
  now: number,
): Promise<void> {
  if (emails.length === 0) return;
  const apiKey = memoizedKey(deps.resendKey);
  await Promise.all(emails.map((email) => attempt(deps, apiKey, email, now)));
}

// Verify emails whose booking is no longer pending will never be sent.
export async function killExpiredVerifyEmails(
  db: D1Database,
  now: number,
): Promise<number> {
  const result = await db
    .prepare(
      `UPDATE booking_emails SET status = 'dead', last_error = 'expired'
       WHERE kind = 'verify' AND status IN ('pending', 'failed')
         AND booking_id NOT IN (SELECT id FROM bookings WHERE ${pendingSql('?1')})`,
    )
    .bind(now)
    .run();
  return result.meta.changes;
}

export async function deliverDueBookingEmails(
  deps: OutboxDeps,
  now: number,
): Promise<void> {
  const { results } = await deps.db
    .prepare(
      `SELECT id, kind, attempts, booking_id FROM booking_emails
       WHERE status IN ('pending', 'failed') AND next_attempt_at <= ?1
       ORDER BY next_attempt_at
       LIMIT ?2`,
    )
    .bind(now, DUE_LIMIT)
    .all();
  const apiKey = memoizedKey(deps.resendKey);
  for (const raw of results) {
    const parsed = dueSchema.safeParse(raw);
    if (!parsed.success) continue;
    const { id, kind, attempts, booking_id } = parsed.data;
    const email = { id, kind, attempts, bookingId: booking_id };
    if ((await attempt(deps, apiKey, email, now)) === 'throttled') return;
  }
}

export async function deadBookingEmails(db: D1Database): Promise<number> {
  const row = await db
    .prepare(
      "SELECT count(*) AS n FROM booking_emails WHERE status = 'dead' AND last_error NOT IN ('expired', 'replaced')",
    )
    .first();
  return typeof row?.n === 'number' ? row.n : 0;
}
