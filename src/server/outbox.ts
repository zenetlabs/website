import { SITE } from '@/lib/site';
import { confirmationEmail, ownerEmail } from '@/server/lead-emails';
import {
  claimEmail,
  type DueEmail,
  deferEmail,
  dueEmails,
  markDead,
  markFailed,
  markSent,
} from '@/server/lead-store';
import { type OutgoingEmail, sendEmail } from '@/server/resend';
import { errorName } from '@/server/responses';
import type { ServerConfig, SiteConfig } from '../../site.config';

const DUE_LIMIT = 10;
const TICK_MS = 600_000;

export type OutboxDeps = {
  db: D1Database;
  resendKey: () => Promise<string>;
  fetch: typeof fetch;
  server: ServerConfig;
  site: SiteConfig;
};

export function outboxDeps(env: Cloudflare.Env): OutboxDeps {
  return {
    db: env.DB,
    resendKey: () => env.RESEND_API_KEY.get(),
    fetch: globalThis.fetch.bind(globalThis),
    server: __SERVER__,
    site: SITE,
  };
}

type Ids = { outboxId: string; leadId: string; kind: string; attempt: number };

async function fail(db: D1Database, ids: Ids, error: string): Promise<void> {
  const status = await markFailed(db, ids.outboxId, error);
  console.error('lead-email: failed', { ...ids, error });
  if (status === 'dead') console.error('lead-email: dead', { ...ids, error });
}

async function idempotencyKey(
  outboxId: string,
  message: OutgoingEmail,
): Promise<string> {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(JSON.stringify(message)),
  );
  const hash = [...new Uint8Array(digest).slice(0, 6)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
  return `lead-email/${outboxId}/${hash}`;
}

type Outcome = 'done' | 'throttled';

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
    if (!(await claimEmail(db, email, now))) return 'done';
    let key: string;
    try {
      key = await apiKey();
    } catch {
      await fail(db, ids, 'secret');
      return 'done';
    }
    const message =
      email.kind === 'owner'
        ? ownerEmail(email.lead, {
            notifyTo: server.leads.notifyTo,
            siteUrl: site.url,
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
      await markSent(db, email.outboxId, now, result.id);
    } else if (result.throttled) {
      await deferEmail(db, email.outboxId, now + TICK_MS, result.error);
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

function memoizedKey(deps: OutboxDeps): () => Promise<string> {
  let pending: Promise<string> | undefined;
  return () => {
    pending ??= deps.resendKey();
    return pending;
  };
}

export async function deliver(
  deps: OutboxDeps,
  emails: readonly DueEmail[],
  now: number,
): Promise<void> {
  if (emails.length === 0) return;
  const apiKey = memoizedKey(deps);
  await Promise.all(emails.map((email) => attempt(deps, apiKey, email, now)));
}

export async function deliverDue(deps: OutboxDeps, now: number): Promise<void> {
  const { due, invalid } = await dueEmails(deps.db, now, DUE_LIMIT);
  if (invalid.length > 0) {
    await markDead(deps.db, invalid, 'invalid_row');
    for (const outboxId of invalid) {
      console.error('lead-email: invalid row', { outboxId });
    }
  }
  const apiKey = memoizedKey(deps);
  for (const email of due) {
    if ((await attempt(deps, apiKey, email, now)) === 'throttled') return;
  }
}
