import { DAY_MS, noop, utcDay } from '@/lib/time';
import { purgeAddressUsage } from '@/server/address-usage';
import {
  deadBookingEmails,
  deliverDueBookingEmails,
  killExpiredVerifyEmails,
} from '@/server/booking-outbox';
import { expirePendingBookings } from '@/server/booking-store';
import { readCalendarSecret } from '@/server/calendar-config';
import { overdueEvents, purgeCalendarEvents } from '@/server/calendar-purge';
import { purgeChats } from '@/server/chat/store';
import { deadOwnerEmails, purgeExpired } from '@/server/lead-store';
import { deliverDue, outboxDeps } from '@/server/outbox';
import { errorName } from '@/server/responses';
import { purgeVoiceSessions } from '@/server/voice/store';

const PURGE_HOUR_UTC = 3;
const TICK_MINUTES = 10;
const SUMMARY_IDS = 20;

function isPurgeTick(now: number): boolean {
  const time = new Date(now);
  return (
    time.getUTCHours() === PURGE_HOUR_UTC && time.getUTCMinutes() < TICK_MINUTES
  );
}

// Pending bookings past their 30 minutes lapse; their unsent verify emails are
// dropped before the due ones go out.
async function bookingTick(env: Cloudflare.Env, now: number): Promise<void> {
  try {
    const expired = await expirePendingBookings(env.DB, now);
    const dropped = await killExpiredVerifyEmails(env.DB, now);
    console.log('scheduled: booking expiry', { expired, dropped });
  } catch (error) {
    console.error('scheduled: booking expiry failed', {
      error: errorName(error),
    });
  }
  try {
    await deliverDueBookingEmails(outboxDeps(env), now);
  } catch (error) {
    console.error('scheduled: booking emails failed', {
      error: errorName(error),
    });
  }
}

// Before the lead purge: a lead past 24 months is kept until its event is gone.
async function calendarPurge(env: Cloudflare.Env, now: number): Promise<void> {
  try {
    const result = await purgeCalendarEvents(
      {
        ...outboxDeps(env),
        calendarSecret: () => readCalendarSecret(env),
        waitUntil: noop,
      },
      now,
    );
    if (result === 'unconfigured') {
      console.error('scheduled: calendar purge skipped', {
        reason: 'unconfigured',
      });
    } else {
      const log = result.failed > 0 ? console.error : console.log;
      log('scheduled: calendar purge', result);
    }
    // These leads go in this run even though their events could not be deleted.
    const overdue = await overdueEvents(env.DB, now);
    if (overdue.length > 0) {
      console.error('scheduled: calendar events past the backstop', {
        bookingIds: overdue,
      });
    }
  } catch (error) {
    console.error('scheduled: calendar purge failed', {
      error: errorName(error),
    });
  }
}

export async function runScheduled(
  env: Cloudflare.Env,
  now: number,
): Promise<void> {
  await bookingTick(env, now);
  try {
    await deliverDue(outboxDeps(env), now);
  } catch (error) {
    console.error('scheduled: delivery failed', { error: errorName(error) });
  }
  if (!isPurgeTick(now)) return;
  await calendarPurge(env, now);
  try {
    const purged = await purgeExpired(env.DB, now);
    const [deadOwner, deadBooking] = await Promise.all([
      deadOwnerEmails(env.DB, SUMMARY_IDS),
      deadBookingEmails(env.DB),
    ]);
    const log =
      deadOwner.count > 0 || deadBooking > 0 ? console.error : console.log;
    log('scheduled: daily summary', { purged, deadOwner, deadBooking });
  } catch (error) {
    console.error('scheduled: daily summary failed', {
      error: errorName(error),
    });
  }
  try {
    await purgeAddressUsage(
      env.DB,
      'booking_ip_usage',
      utcDay(now - DAY_MS),
    ).run();
  } catch (error) {
    console.error('scheduled: booking usage purge failed', {
      error: errorName(error),
    });
  }
  // After the leads, so a transcript whose lead just expired goes in the same run.
  try {
    console.log('scheduled: chat purge', {
      purged: await purgeChats(env.DB, now),
    });
  } catch (error) {
    console.error('scheduled: chat purge failed', { error: errorName(error) });
  }
  try {
    console.log('scheduled: voice purge', {
      purged: await purgeVoiceSessions(env.DB, now),
    });
  } catch (error) {
    console.error('scheduled: voice purge failed', {
      error: errorName(error),
    });
  }
}
