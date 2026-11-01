import { env, waitUntil } from 'cloudflare:workers';
import type { BookingDeps } from '@/server/booking';
import { readCalendarSecret } from '@/server/calendar-config';
import { outboxDeps } from '@/server/outbox';

// A leaf on purpose: the /book render needs the booking deps without the tool layer.
export function bookingDeps(): BookingDeps {
  return {
    ...outboxDeps(env),
    calendarSecret: () => readCalendarSecret(env),
    waitUntil,
  };
}
