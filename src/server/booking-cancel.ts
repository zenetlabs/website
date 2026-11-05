import { BOOKING_RULES, DEFAULT_ZONE } from '@/content/booking-rules';
import { formatSlotLabel } from '@/lib/slot-format';
import { type BookingDeps, calendarFor, targetOf } from '@/server/booking';
import { PRIVATE_PAGE_HEADERS, sameOriginForm } from '@/server/booking-confirm';
import { deliverBookingEmails } from '@/server/booking-outbox';
import {
  type BookingRow,
  bookingForToken,
  bookingRow,
  claimCancel,
  finishCancel,
  releaseCancel,
} from '@/server/booking-store';
import { formatToken, parseToken } from '@/server/booking-token';
import { deleteEvent, eventIdFor } from '@/server/google-calendar';
import { escapeHtml, page } from '@/server/internal-leads';
import type { Limiter } from '@/server/rate-limit';
import { errorName } from '@/server/responses';

export type CancelDeps = BookingDeps & { limiter: Limiter; now: () => number };

// The owner's page is its own document: no script, and a form that may only
// post back to this origin.
const CSP =
  "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'";

const COPY = {
  title: 'Cancel this call?',
  button: 'Cancel the call and email the visitor',
  done: (email: string) =>
    `Cancelled. The event is deleted, Google has sent its cancellation and we've emailed ${email}.`,
  already: 'Already cancelled.',
  past: 'This call has already happened.',
  notConfirmed: 'This booking is not confirmed, so there is nothing to cancel.',
  googleFailed:
    "Google didn't delete the event, so nothing changed. Try again in a minute, or delete it in Calendar and follow RUNBOOK section 5.",
  busy: 'Another cancel of this call is running right now. Reload this page in a minute to see how it ended.',
} as const;

function html(body: string, status = 200): Response {
  return new Response(page('Cancel a booking', body), {
    status,
    headers: {
      ...PRIVATE_PAGE_HEADERS,
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Security-Policy': CSP,
    },
  });
}

function notFound(): Response {
  return new Response('Not found', {
    status: 404,
    headers: {
      ...PRIVATE_PAGE_HEADERS,
      'Content-Type': 'text/plain; charset=utf-8',
    },
  });
}

// The booking behind an owner link, after the constant-time check, or null.
async function lookup(
  token: unknown,
  db: D1Database,
): Promise<{ token: string; row: BookingRow } | null> {
  const row = await bookingForToken(db, token, 'cancel');
  const parsed = parseToken(token);
  return row === null || parsed === null
    ? null
    : { token: formatToken(parsed), row };
}

function details(row: BookingRow): string {
  const zone = row.time_zone ?? DEFAULT_ZONE[row.lead_locale ?? 'en'];
  const items: Array<[string, string]> = [
    ['Name', row.lead_name ?? '-'],
    ['Email', row.email],
    ['Company', row.lead_company ?? '-'],
    [
      `When (${BOOKING_RULES.zone})`,
      formatSlotLabel('en', row.slot_start, BOOKING_RULES.zone),
    ],
    [
      'When (visitor)',
      `${formatSlotLabel('en', row.slot_start, zone)} (${zone})`,
    ],
    ['Channel', row.channel],
  ];
  return `<dl>
${items.map(([label, value]) => `<dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd>`).join('\n')}
</dl>`;
}

function message(text: string): string {
  return `<p class="alert">${escapeHtml(text)}</p>`;
}

function view(row: BookingRow, token: string, now: number, note = ''): string {
  const heading = `<h1>${escapeHtml(COPY.title)}</h1>`;
  if (row.status === 'cancelled') {
    return `${heading}${note}${message(COPY.already)}${details(row)}`;
  }
  if (row.slot_end <= now) {
    return `${heading}${note}${message(COPY.past)}${details(row)}`;
  }
  if (row.status !== 'confirmed') {
    return `${heading}${note}${message(COPY.notConfirmed)}${details(row)}`;
  }
  return `${heading}${note}${details(row)}
<form method="post" action="/api/book/cancel">
<input type="hidden" name="t" value="${escapeHtml(token)}">
<button type="submit">${escapeHtml(COPY.button)}</button>
</form>`;
}

export async function cancelPage(
  request: Request,
  deps: CancelDeps,
): Promise<Response> {
  const found = await lookup(
    new URL(request.url).searchParams.get('t'),
    deps.db,
  );
  if (found === null) return notFound();
  return html(view(found.row, found.token, deps.now()));
}

type Cancelled = { ok: true } | { ok: false; reason: 'google' | 'state' };

async function cancel(
  row: BookingRow,
  deps: CancelDeps,
  now: number,
): Promise<Cancelled> {
  if (!(await claimCancel(deps.db, row.id, now))) {
    return { ok: false, reason: 'state' };
  }
  const emailId = crypto.randomUUID();
  let finished = false;
  try {
    const target = await targetOf({ deps, isTest: row.is_test === 1 }, false);
    const calendar = target.ok
      ? await calendarFor({ deps, now }, target)
      : target;
    const deleted = calendar.ok
      ? await deleteEvent(
          calendar.access,
          calendar.calendarId,
          row.event_id ?? eventIdFor(row.id),
          'all',
        )
      : { ok: false, code: calendar.reason };
    if (!deleted.ok) {
      console.error('booking: cancel failed', {
        bookingId: row.id,
        code: deleted.code,
      });
      return { ok: false, reason: 'google' };
    }
    await finishCancel(deps.db, { id: row.id, emailId }, now);
    finished = true;
  } finally {
    // Anything that stopped short of the finish leaves the booking as it was.
    if (!finished) await releaseCancel(deps.db, row.id);
  }
  const delivery = deliverBookingEmails(
    deps,
    [{ id: emailId, kind: 'cancelled', attempts: 0, bookingId: row.id }],
    now,
  ).catch((error) => {
    console.error('booking-email: delivery failed', {
      error: errorName(error),
    });
  });
  deps.waitUntil(delivery);
  await delivery;
  console.log('booking: cancelled by the owner', { bookingId: row.id });
  return { ok: true };
}

export async function postCancel(
  request: Request,
  deps: CancelDeps,
): Promise<Response> {
  const form = await sameOriginForm(request, deps.limiter, 'book-cancel');
  if (form instanceof Response) return form;
  const found = await lookup(form.get('t'), deps.db);
  if (found === null) return notFound();
  const now = deps.now();
  const { row, token } = found;
  if (row.status !== 'confirmed' || row.slot_end <= now) {
    return html(view(row, token, now));
  }
  const result = await cancel(row, deps, now);
  const fresh = (await bookingRow(deps.db, row.id)) ?? row;
  if (result.ok) {
    return html(
      `<h1>${escapeHtml(COPY.title)}</h1>${message(COPY.done(row.email))}${details(fresh)}`,
    );
  }
  const note =
    result.reason === 'google'
      ? message(COPY.googleFailed)
      : fresh.status === 'confirmed'
        ? message(COPY.busy)
        : '';
  return html(view(fresh, token, now, note));
}
