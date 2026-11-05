import type { BookPageContent } from '@/content/types';
import type { BookingOutcome } from '@/lib/booking-client';

export type BookingFailureKind =
  | 'taken'
  | 'limit'
  | 'disposable'
  | 'error'
  | 'rate'
  | 'captcha';

// What the chat card and the WebMCP dialog tell the visitor; the booking page keeps its finer table.
export function failureOf(
  outcome: Exclude<BookingOutcome, { kind: 'pending' }>,
): BookingFailureKind {
  if (outcome.kind === 'rejected') {
    if (outcome.reason === 'limit') return 'limit';
    if (outcome.reason === 'email_not_accepted') return 'disposable';
    return 'taken';
  }
  if (outcome.error === 'captcha') return 'captcha';
  return outcome.error === 'rate' ? 'rate' : 'error';
}

export type PageFailure = keyof BookPageContent['errors'];

// The booking page's finer table: its own copy for a full day and a disposable address.
export function pageFailureOf(
  outcome: Exclude<BookingOutcome, { kind: 'pending' }>,
): PageFailure {
  if (outcome.kind === 'rejected') {
    if (outcome.reason === 'limit') return 'limit';
    if (outcome.reason === 'email_not_accepted') return 'disposable';
    return outcome.reason === 'day_full' ? 'dayFull' : 'taken';
  }
  if (outcome.error === 'captcha') return 'captcha';
  return outcome.error === 'rate' ? 'rate' : 'send';
}
