// The bookkeeping both email queues share: the lead outbox (`email_outbox`)
// and the booking emails (`booking_emails`) have the same columns for it.
export type QueueTable = 'email_outbox' | 'booking_emails';

const BACKOFF_MS = [600_000, 1_800_000, 3_600_000, 10_800_000, 21_600_000];
const MAX_ATTEMPTS = BACKOFF_MS.length + 1;

export function backoffMs(attempt: number): number {
  return BACKOFF_MS[attempt - 1] ?? 0;
}

// One attempt at a time: the claim counts it and schedules the next one.
export async function claimEmail(
  db: D1Database,
  table: QueueTable,
  email: { id: string; attempts: number },
  now: number,
): Promise<boolean> {
  const result = await db
    .prepare(
      `UPDATE ${table} SET attempts = attempts + 1, next_attempt_at = ?1
       WHERE id = ?2 AND attempts = ?3 AND status IN ('pending', 'failed')`,
    )
    .bind(now + backoffMs(email.attempts + 1), email.id, email.attempts)
    .run();
  return result.meta.changes === 1;
}

// A throttled send gives its attempt back.
export async function deferEmail(
  db: D1Database,
  table: QueueTable,
  id: string,
  nextAttemptAt: number,
  error: string,
): Promise<void> {
  await db
    .prepare(
      `UPDATE ${table} SET attempts = max(attempts - 1, 0), next_attempt_at = ?1, last_error = ?2
       WHERE id = ?3`,
    )
    .bind(nextAttemptAt, error, id)
    .run();
}

export function sentStatement(
  db: D1Database,
  table: QueueTable,
  id: string,
  now: number,
  providerId: string | null,
): D1PreparedStatement {
  return db
    .prepare(
      `UPDATE ${table} SET status = 'sent', sent_at = ?1, provider_id = ?2, last_error = NULL
       WHERE id = ?3`,
    )
    .bind(now, providerId, id);
}

export async function markSent(
  db: D1Database,
  table: QueueTable,
  id: string,
  now: number,
  providerId: string | null,
): Promise<void> {
  await sentStatement(db, table, id, now, providerId).run();
}

export async function markFailed(
  db: D1Database,
  table: QueueTable,
  id: string,
  error: string,
): Promise<'failed' | 'dead'> {
  const row = await db
    .prepare(
      `UPDATE ${table}
       SET status = CASE WHEN attempts >= ?1 THEN 'dead' ELSE 'failed' END, last_error = ?2
       WHERE id = ?3
       RETURNING status`,
    )
    .bind(MAX_ATTEMPTS, error, id)
    .first();
  return row?.status === 'dead' ? 'dead' : 'failed';
}

export async function markDead(
  db: D1Database,
  table: QueueTable,
  ids: readonly string[],
  error: string,
): Promise<void> {
  if (ids.length === 0) return;
  await db.batch(
    ids.map((id) =>
      db
        .prepare(
          `UPDATE ${table} SET status = 'dead', last_error = ?1 WHERE id = ?2`,
        )
        .bind(error, id),
    ),
  );
}

// The Resend key is read once per run, and only if something is sent.
export function memoizedKey(
  read: () => Promise<string>,
): () => Promise<string> {
  let pending: Promise<string> | undefined;
  return () => {
    pending ??= read();
    return pending;
  };
}
