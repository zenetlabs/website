import type { BookingOutcome } from '@/lib/booking-client';

export type BookingFailureKind = 'taken' | 'error' | 'rate' | 'captcha';

// What the chat card and the WebMCP dialog tell the visitor; the booking page keeps its finer table.
export function failureOf(
  outcome: Exclude<BookingOutcome, { kind: 'booked' }>,
): BookingFailureKind {
  if (outcome.kind === 'rejected') {
    return outcome.reason === 'limit' ? 'error' : 'taken';
  }
  if (outcome.error === 'captcha') return 'captcha';
  return outcome.error === 'rate' ? 'rate' : 'error';
}
