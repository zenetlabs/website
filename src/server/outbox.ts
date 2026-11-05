import { toHex } from '@/lib/hex';
import { SITE } from '@/lib/site';
import { setCancelHash } from '@/server/booking-store';
import { deriveSecret, formatToken, hashSecret } from '@/server/booking-token';
import {
  claimEmail,
  deferEmail,
  markDead,
  markFailed,
  markSent,
  memoizedKey,
} from '@/server/email-queue';
import { bookingOf, confirmationEmail, ownerEmail } from '@/server/lead-emails';
import { type DueEmail, dueEmails } from '@/server/lead-store';
import { type OutgoingEmail, sendEmail } from '@/server/resend';
import { errorName } from '@/server/responses';
import type { ServerConfig, SiteConfig } from '../../site.config';

const DUE_LIMIT = 10;
const TICK_MS = 600_000;

export type OutboxDeps = {
  db: D1Database;
  resendKey: () => Promise<string>;
  // Keys the booking link secrets (the Turnstile secret, already a server secret).
  linkKey: () => Promise<string>;
  fetch: typeof fetch;
  server: ServerConfig;
  site: SiteConfig;
};

export function outboxDeps(env: Cloudflare.Env): OutboxDeps {
  return {
    db: env.DB,
    resendKey: () => env.RESEND_API_KEY.get(),
    linkKey: () => env.TURNSTILE_SECRET_KEY.get(),
    fetch: globalThis.fetch.bind(globalThis),
    server: __SERVER__,
    site: SITE,
  };
}

type Ids = { outboxId: string; leadId: string; kind: string; attempt: number };

async function fail(db: D1Database, ids: Ids, error: string): Promise<void> {
  const status = await markFailed(db, 'email_outbox', ids.outboxId, error);
  console.error('lead-email: failed', { ...ids, error });
  if (status === 'dead') console.error('lead-email: dead', { ...ids, error });
}

export async function idempotencyKey(
  outboxId: string,
  message: OutgoingEmail,
  prefix = 'lead-email',
): Promise<string> {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(JSON.stringify(message)),
  );
  const hash = toHex(new Uint8Array(digest).slice(0, 6));
  return `${prefix}/${outboxId}/${hash}`;
}

type Outcome = 'done' | 'throttled';

// The owner's one-click cancel link for a confirmed booking. Its secret is
// derived from this email's id, so a retry carries the same link.
async function cancelUrl(
  deps: OutboxDeps,
  email: DueEmail,
): Promise<string | null> {
  const booking = bookingOf(email.lead);
  if (email.kind !== 'owner' || booking?.status !== 'confirmed') return null;
  const secret = await deriveSecret(
    await deps.linkKey(),
    `cancel|${email.outboxId}`,
  );
  if (!(await setCancelHash(deps.db, booking.id, await hashSecret(secret)))) {
    return null;
  }
  const token = formatToken({ id: booking.id, secret });
  return `${booking.origin ?? deps.site.url}/api/book/cancel?t=${token}`;
}

async function attempt(
  deps: OutboxDeps,
  apiKey: () => Promise<string>,
  email: DueEmail,
  now: number,
): Promise<Outcome> {
  const { db, server, site } = deps;
  const ids = {
    outboxId: email.outboxId,
    leadId: email.lead.id,
    kind: email.kind,
    attempt: email.attempts + 1,
  };
  try {
    if (
      !(await claimEmail(
        db,
        'email_outbox',
        { id: email.outboxId, attempts: email.attempts },
        now,
      ))
    ) {
      return 'done';
    }
    let key: string;
    let cancel: string | null;
    try {
      key = await apiKey();
      cancel = await cancelUrl(deps, email);
    } catch {
      await fail(db, ids, 'secret');
      return 'done';
    }
    const message =
      email.kind === 'owner'
        ? ownerEmail(email.lead, {
            notifyTo: server.leads.notifyTo,
            siteUrl: site.url,
            cancelUrl: cancel,
          })
        : confirmationEmail(email.lead, { siteUrl: site.url });
    const result = await sendEmail({
      apiKey: key,
      baseUrl: server.resendBaseUrl,
      idempotencyKey: await idempotencyKey(email.outboxId, message),
      message,
      fetch: deps.fetch,
    });
    if (result.ok) {
      await markSent(db, 'email_outbox', email.outboxId, now, result.id);
    } else if (result.throttled) {
      await deferEmail(
        db,
        'email_outbox',
        email.outboxId,
        now + TICK_MS,
        result.error,
      );
      console.error('lead-email: throttled', { ...ids, error: result.error });
      return 'throttled';
    } else {
      await fail(db, ids, result.error);
    }
  } catch (error) {
    console.error('lead-email: bookkeeping failed', {
      ...ids,
      error: errorName(error),
    });
  }
  return 'done';
}

export async function deliver(
  deps: OutboxDeps,
  emails: readonly DueEmail[],
  now: number,
): Promise<void> {
  if (emails.length === 0) return;
  const apiKey = memoizedKey(deps.resendKey);
  await Promise.all(emails.map((email) => attempt(deps, apiKey, email, now)));
}

export async function deliverDue(deps: OutboxDeps, now: number): Promise<void> {
  const { due, invalid } = await dueEmails(deps.db, now, DUE_LIMIT);
  if (invalid.length > 0) {
    await markDead(deps.db, 'email_outbox', invalid, 'invalid_row');
    for (const outboxId of invalid) {
      console.error('lead-email: invalid row', { outboxId });
    }
  }
  const apiKey = memoizedKey(deps.resendKey);
  for (const email of due) {
    if ((await attempt(deps, apiKey, email, now)) === 'throttled') return;
  }
}
