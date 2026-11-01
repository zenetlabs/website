import type { Locale } from '@/lib/i18n';
import { isRecord } from '@/lib/is-record';
import type { Attribution } from '@/lib/lead-schema';

export type BookingRequest = {
  slot: string;
  name: string;
  email: string;
  company?: string;
  topic: string;
  timeZone: string;
  locale: Locale;
  consent: true;
  turnstileToken: string;
  website: string;
  attribution: Attribution;
  chatSessionId?: string;
};

export type BookingFailure = 'unavailable' | 'captcha' | 'rate' | 'invalid';

export type BookingOutcome =
  | { kind: 'booked'; start: number; end: number; meetUrl: string | null }
  | {
      kind: 'rejected';
      reason: 'invalid_slot' | 'slot_taken' | 'day_full' | 'limit';
    }
  | { kind: 'failed'; error: BookingFailure };

export type PageSlot = { start: number; end: number };

export type PageAvailability =
  | { status: 'ok'; slots: PageSlot[] }
  | { status: 'unavailable' };

const UNAVAILABLE: BookingOutcome = { kind: 'failed', error: 'unavailable' };
const REJECTIONS = ['invalid_slot', 'slot_taken', 'day_full', 'limit'] as const;

function timestamp(value: unknown): number | null {
  if (typeof value !== 'string') return null;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? null : parsed;
}

function reasonOf(value: unknown): (typeof REJECTIONS)[number] | null {
  return REJECTIONS.find((reason) => reason === value) ?? null;
}

export function bookingOutcome(body: unknown): BookingOutcome {
  if (!isRecord(body)) return UNAVAILABLE;
  if (body.ok === false) {
    const { error } = body;
    if (error === 'captcha' || error === 'rate' || error === 'invalid') {
      return { kind: 'failed', error };
    }
    return UNAVAILABLE;
  }
  const result = isRecord(body.result) ? body.result : null;
  if (body.ok !== true || result === null) return UNAVAILABLE;
  if (result.status === 'booked') {
    const start = timestamp(result.start);
    const end = timestamp(result.end);
    const meetUrl = typeof result.meetUrl === 'string' ? result.meetUrl : null;
    return start === null || end === null
      ? UNAVAILABLE
      : { kind: 'booked', start, end, meetUrl };
  }
  const reason = result.status === 'rejected' ? reasonOf(result.reason) : null;
  return reason === null ? UNAVAILABLE : { kind: 'rejected', reason };
}

async function post(path: string, body: unknown): Promise<unknown> {
  const response = await fetch(path, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (response.status === 429) return { ok: false, error: 'rate' };
  return response.json().catch(() => undefined);
}

export async function submitBooking(
  request: BookingRequest,
): Promise<BookingOutcome> {
  try {
    return bookingOutcome(await post('/api/tools/book_meeting', request));
  } catch {
    return UNAVAILABLE;
  }
}

function slotsFrom(value: unknown): PageSlot[] {
  const list = Array.isArray(value) ? value : [];
  return list.flatMap((slot): PageSlot[] => {
    if (!isRecord(slot)) return [];
    const { start, end } = slot;
    return typeof start === 'number' && typeof end === 'number'
      ? [{ start, end }]
      : [];
  });
}

export function availabilityOutcome(body: unknown): PageAvailability {
  if (!isRecord(body) || body.status !== 'ok') return { status: 'unavailable' };
  return { status: 'ok', slots: slotsFrom(body.slots) };
}

// One request for the whole horizon (the endpoint is the page's own data).
export async function fetchAvailability(): Promise<PageAvailability> {
  try {
    const response = await fetch('/api/book/slots', {
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) return { status: 'unavailable' };
    return availabilityOutcome(await response.json().catch(() => undefined));
  } catch {
    return { status: 'unavailable' };
  }
}
