import { z } from 'zod';
import { locales } from '@/lib/i18n';
import { DAY_MS } from '@/lib/time';

const RETENTION_MS = 730 * DAY_MS;
const ATTEMPT_RETENTION_MS = 30 * DAY_MS;
const BACKOFF_MS = [600_000, 1_800_000, 3_600_000, 10_800_000, 21_600_000];
const MAX_ATTEMPTS = BACKOFF_MS.length + 1;

const LEAD_SOURCES = [
  'form',
  'chat',
  'voice',
  'calculator',
  'booking',
] as const;

const nullableText = z.string().nullable();

const leadRowSchema = z.object({
  id: z.string(),
  created_at: z.number(),
  locale: z.enum(locales),
  source: z.enum(LEAD_SOURCES),
  name: z.string(),
  email: z.string(),
  company: nullableText,
  message: z.string(),
  consent_version: z.string(),
  consent_at: z.number(),
  utm_source: nullableText,
  utm_medium: nullableText,
  utm_campaign: nullableText,
  utm_term: nullableText,
  utm_content: nullableText,
  gclid: nullableText,
  referrer: nullableText,
  landing_page: nullableText,
  submit_page: nullableText,
  context: nullableText,
  chat_session_id: nullableText,
  is_test: z.union([z.literal(0), z.literal(1)]),
});

export type LeadRow = z.infer<typeof leadRowSchema>;

const EMAIL_KINDS = ['owner', 'confirmation'] as const;
type EmailKind = (typeof EMAIL_KINDS)[number];

const EMAIL_STATUSES = ['pending', 'failed', 'sent', 'dead'] as const;

const outboxRowSchema = z.object({
  id: z.string(),
  lead_id: z.string(),
  kind: z.enum(EMAIL_KINDS),
  status: z.enum(EMAIL_STATUSES),
  attempts: z.number(),
  created_at: z.number(),
  next_attempt_at: z.number(),
  sent_at: z.number().nullable(),
  last_error: nullableText,
  provider_id: nullableText,
});

export type OutboxRow = z.infer<typeof outboxRowSchema>;

export type NewLead = Pick<
  LeadRow,
  | 'locale'
  | 'source'
  | 'name'
  | 'email'
  | 'company'
  | 'message'
  | 'consent_version'
  | 'utm_source'
  | 'utm_medium'
  | 'utm_campaign'
  | 'utm_term'
  | 'utm_content'
  | 'gclid'
  | 'referrer'
  | 'landing_page'
  | 'submit_page'
  | 'context'
  | 'chat_session_id'
  | 'is_test'
>;

export type DueEmail = {
  outboxId: string;
  kind: EmailKind;
  attempts: number;
  lead: LeadRow;
};

export type ConfirmationMode = 'capped' | 'always' | 'none';

export type LeadStatements = {
  leadId: string;
  statements: D1PreparedStatement[];
  emails: (results: readonly D1Result[]) => DueEmail[];
};

export function leadStatements(
  db: D1Database,
  lead: NewLead,
  now: number,
  mode: ConfirmationMode = 'capped',
): LeadStatements {
  const row: LeadRow = {
    ...lead,
    id: crypto.randomUUID(),
    created_at: now,
    consent_at: now,
  };
  const ownerId = crypto.randomUUID();
  const confirmationId = crypto.randomUUID();
  const confirmation = mode !== 'none';
  const statements = [
    db
      .prepare(
        `INSERT INTO leads (id, created_at, locale, source, name, email, company, message,
           consent_version, consent_at, utm_source, utm_medium, utm_campaign, utm_term,
           utm_content, gclid, referrer, landing_page, submit_page, context,
           chat_session_id, is_test)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?2, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19, ?20, ?21)`,
      )
      .bind(
        row.id,
        now,
        row.locale,
        row.source,
        row.name,
        row.email,
        row.company,
        row.message,
        row.consent_version,
        row.utm_source,
        row.utm_medium,
        row.utm_campaign,
        row.utm_term,
        row.utm_content,
        row.gclid,
        row.referrer,
        row.landing_page,
        row.submit_page,
        row.context,
        row.chat_session_id,
        row.is_test,
      ),
    db
      .prepare(
        `INSERT INTO email_outbox (id, lead_id, kind, created_at, next_attempt_at)
         VALUES (?1, ?2, 'owner', ?3, ?3)`,
      )
      .bind(ownerId, row.id, now),
  ];
  if (mode === 'capped') {
    statements.push(
      db
        .prepare(
          `INSERT INTO email_outbox (id, lead_id, kind, created_at, next_attempt_at)
         SELECT ?1, ?2, 'confirmation', ?3, ?3
         WHERE NOT EXISTS (
           SELECT 1 FROM email_outbox o JOIN leads l ON l.id = o.lead_id
           WHERE o.kind = 'confirmation' AND o.status IN ('pending', 'sent')
             AND l.email = ?4 AND l.is_test = ?5 AND o.created_at > ?3 - ${DAY_MS}
         )`,
        )
        .bind(confirmationId, row.id, now, row.email, row.is_test),
    );
  } else if (mode === 'always') {
    statements.push(
      db
        .prepare(
          `INSERT INTO email_outbox (id, lead_id, kind, created_at, next_attempt_at)
         VALUES (?1, ?2, 'confirmation', ?3, ?3)`,
        )
        .bind(confirmationId, row.id, now),
    );
  }
  return {
    leadId: row.id,
    statements,
    emails: (results) => {
      const queued: DueEmail[] = [
        { outboxId: ownerId, kind: 'owner', attempts: 0, lead: row },
      ];
      if (confirmation && results[2]?.meta.changes === 1) {
        queued.push({
          outboxId: confirmationId,
          kind: 'confirmation',
          attempts: 0,
          lead: row,
        });
      }
      return queued;
    },
  };
}

export async function storeLead(
  db: D1Database,
  lead: NewLead,
  now: number,
): Promise<DueEmail[]> {
  const { statements, emails } = leadStatements(db, lead, now);
  return emails(await db.batch(statements));
}

const dueRowSchema = leadRowSchema.extend({
  outbox_id: z.string(),
  outbox_kind: z.enum(EMAIL_KINDS),
  outbox_attempts: z.number(),
});

export async function dueEmails(
  db: D1Database,
  now: number,
  limit: number,
): Promise<{ due: DueEmail[]; invalid: string[] }> {
  const { results } = await db
    .prepare(
      `SELECT l.*, o.id AS outbox_id, o.kind AS outbox_kind, o.attempts AS outbox_attempts
       FROM email_outbox o JOIN leads l ON l.id = o.lead_id
       WHERE o.status IN ('pending', 'failed') AND o.next_attempt_at <= ?1
       ORDER BY o.next_attempt_at
       LIMIT ?2`,
    )
    .bind(now, limit)
    .all();
  const due: DueEmail[] = [];
  const invalid: string[] = [];
  for (const raw of results) {
    const parsed = dueRowSchema.safeParse(raw);
    if (parsed.success) {
      const { outbox_id, outbox_kind, outbox_attempts, ...lead } = parsed.data;
      due.push({
        outboxId: outbox_id,
        kind: outbox_kind,
        attempts: outbox_attempts,
        lead,
      });
    } else if (typeof raw.outbox_id === 'string') {
      invalid.push(raw.outbox_id);
    }
  }
  return { due, invalid };
}

export async function markDead(
  db: D1Database,
  outboxIds: readonly string[],
  error: string,
): Promise<void> {
  if (outboxIds.length === 0) return;
  await db.batch(
    outboxIds.map((id) =>
      db
        .prepare(
          "UPDATE email_outbox SET status = 'dead', last_error = ?1 WHERE id = ?2",
        )
        .bind(error, id),
    ),
  );
}

export function backoffMs(attempt: number): number {
  return BACKOFF_MS[attempt - 1] ?? 0;
}

export async function claimEmail(
  db: D1Database,
  email: Pick<DueEmail, 'outboxId' | 'attempts'>,
  now: number,
): Promise<boolean> {
  const result = await db
    .prepare(
      `UPDATE email_outbox SET attempts = attempts + 1, next_attempt_at = ?1
       WHERE id = ?2 AND attempts = ?3 AND status IN ('pending', 'failed')`,
    )
    .bind(now + backoffMs(email.attempts + 1), email.outboxId, email.attempts)
    .run();
  return result.meta.changes === 1;
}

export async function deferEmail(
  db: D1Database,
  outboxId: string,
  nextAttemptAt: number,
  error: string,
): Promise<void> {
  await db
    .prepare(
      `UPDATE email_outbox SET attempts = max(attempts - 1, 0), next_attempt_at = ?1, last_error = ?2
       WHERE id = ?3`,
    )
    .bind(nextAttemptAt, error, outboxId)
    .run();
}

export async function markSent(
  db: D1Database,
  outboxId: string,
  now: number,
  providerId: string | null,
): Promise<void> {
  await db
    .prepare(
      `UPDATE email_outbox SET status = 'sent', sent_at = ?1, provider_id = ?2, last_error = NULL
       WHERE id = ?3`,
    )
    .bind(now, providerId, outboxId)
    .run();
}

export async function markFailed(
  db: D1Database,
  outboxId: string,
  error: string,
): Promise<'failed' | 'dead'> {
  const row = await db
    .prepare(
      `UPDATE email_outbox
       SET status = CASE WHEN attempts >= ?1 THEN 'dead' ELSE 'failed' END, last_error = ?2
       WHERE id = ?3
       RETURNING status`,
    )
    .bind(MAX_ATTEMPTS, error, outboxId)
    .first();
  return row?.status === 'dead' ? 'dead' : 'failed';
}

export async function deadOwnerEmails(
  db: D1Database,
  limit: number,
): Promise<{ count: number; outboxIds: string[] }> {
  const { results } = await db
    .prepare(
      `SELECT id FROM email_outbox WHERE status = 'dead' AND kind = 'owner'
       ORDER BY created_at DESC LIMIT ?1`,
    )
    .bind(limit)
    .all();
  const outboxIds = results.flatMap((row) =>
    typeof row.id === 'string' ? [row.id] : [],
  );
  const total = await db
    .prepare(
      "SELECT count(*) AS n FROM email_outbox WHERE status = 'dead' AND kind = 'owner'",
    )
    .first();
  return {
    count: typeof total?.n === 'number' ? total.n : outboxIds.length,
    outboxIds,
  };
}

export async function purgeExpired(
  db: D1Database,
  now: number,
): Promise<number> {
  const [leads] = await db.batch([
    db
      .prepare('DELETE FROM leads WHERE created_at < ?1 RETURNING id')
      .bind(now - RETENTION_MS),
    db
      .prepare(
        "DELETE FROM bookings WHERE status <> 'confirmed' AND created_at < ?1",
      )
      .bind(now - ATTEMPT_RETENTION_MS),
  ]);
  return leads?.results.length ?? 0;
}

type Kind = 'text' | 'nullable' | 'number' | 'time';
type Shape = Record<string, Kind>;
type Value<K extends Kind> = K extends 'text'
  ? string
  : K extends 'nullable'
    ? string | null
    : number;
type Row<S extends Shape> = { [K in keyof S]: Value<S[K]> };

function isKind(value: unknown, kind: Kind): boolean {
  if (kind === 'text') return typeof value === 'string';
  if (kind === 'nullable') return value === null || typeof value === 'string';
  return typeof value === 'number';
}

function matches<S extends Shape>(
  row: Record<string, unknown>,
  shape: S,
): row is Record<string, unknown> & Row<S> {
  return Object.entries(shape).every(([key, kind]) => isKind(row[key], kind));
}

function rowsMatching<S extends Shape>(
  rows: readonly Record<string, unknown>[],
  shape: S,
): Array<Record<string, unknown> & Row<S>> {
  return rows.map((row) => {
    if (!matches(row, shape)) throw new TypeError('unexpected lead row');
    return row;
  });
}

const LIST_SHAPE = {
  id: 'text',
  created_at: 'time',
  locale: 'text',
  source: 'text',
  name: 'text',
  email: 'text',
  company: 'nullable',
  utm_source: 'nullable',
  utm_medium: 'nullable',
  utm_campaign: 'nullable',
  is_test: 'number',
  owner_email_status: 'nullable',
  confirmation_status: 'nullable',
} as const satisfies Shape;

export const EXPORT_SHAPE = {
  id: 'text',
  created_at: 'time',
  locale: 'text',
  source: 'text',
  name: 'text',
  email: 'text',
  company: 'nullable',
  message: 'text',
  consent_version: 'text',
  consent_at: 'time',
  utm_source: 'nullable',
  utm_medium: 'nullable',
  utm_campaign: 'nullable',
  utm_term: 'nullable',
  utm_content: 'nullable',
  gclid: 'nullable',
  referrer: 'nullable',
  landing_page: 'nullable',
  submit_page: 'nullable',
  context: 'nullable',
  chat_session_id: 'nullable',
  is_test: 'number',
  owner_email_status: 'nullable',
  confirmation_status: 'nullable',
} as const satisfies Shape;

const COUNTS_SHAPE = {
  total: 'number',
  test: 'number',
  failed: 'number',
  dead: 'number',
  dead_owner: 'number',
} as const satisfies Shape;

export type ListRow = Row<typeof LIST_SHAPE>;
export type ExportRow = Record<string, unknown> & Row<typeof EXPORT_SHAPE>;
export type LeadCounts = Row<typeof COUNTS_SHAPE>;

const STATUS_JOINS = `LEFT JOIN email_outbox oo ON oo.lead_id = l.id AND oo.kind = 'owner'
       LEFT JOIN email_outbox oc ON oc.lead_id = l.id AND oc.kind = 'confirmation'`;
const STATUS_COLUMNS =
  'oo.status AS owner_email_status, oc.status AS confirmation_status';

export async function leadsOverview(
  db: D1Database,
  limit: number,
): Promise<{ leads: ListRow[]; counts: LeadCounts }> {
  const [list, counts] = await db.batch<Record<string, unknown>>([
    db
      .prepare(
        `SELECT l.id, l.created_at, l.locale, l.source, l.name, l.email, l.company,
           l.utm_source, l.utm_medium, l.utm_campaign, l.is_test, ${STATUS_COLUMNS}
         FROM leads l ${STATUS_JOINS}
         ORDER BY l.created_at DESC, l.id
         LIMIT ?1`,
      )
      .bind(limit),
    db.prepare(
      `SELECT
         (SELECT count(*) FROM leads) AS total,
         (SELECT count(*) FROM leads WHERE is_test = 1) AS test,
         (SELECT count(*) FROM email_outbox WHERE status = 'failed') AS failed,
         (SELECT count(*) FROM email_outbox WHERE status = 'dead') AS dead,
         (SELECT count(*) FROM email_outbox WHERE status = 'dead' AND kind = 'owner') AS dead_owner`,
    ),
  ]);
  const [total] = rowsMatching(counts?.results ?? [], COUNTS_SHAPE);
  if (!total) throw new TypeError('unexpected lead counts');
  return {
    leads: rowsMatching(list?.results ?? [], LIST_SHAPE),
    counts: total,
  };
}

export async function exportLeads(
  db: D1Database,
  max: number,
): Promise<{ leads: ExportRow[]; truncated: boolean }> {
  const { results } = await db
    .prepare(
      `SELECT l.*, ${STATUS_COLUMNS}
       FROM leads l ${STATUS_JOINS}
       ORDER BY l.created_at DESC, l.id
       LIMIT ?1`,
    )
    .bind(max + 1)
    .all();
  const leads = rowsMatching(results, EXPORT_SHAPE);
  return { leads: leads.slice(0, max), truncated: leads.length > max };
}
export async function getLead(
  db: D1Database,
  id: string,
): Promise<{ lead: LeadRow; emails: OutboxRow[] } | null> {
  const [leadResult, outboxResult] = await db.batch<Record<string, unknown>>([
    db.prepare('SELECT * FROM leads WHERE id = ?1').bind(id),
    db
      .prepare('SELECT * FROM email_outbox WHERE lead_id = ?1 ORDER BY kind')
      .bind(id),
  ]);
  const raw = leadResult?.results[0];
  if (raw === undefined) return null;
  return {
    lead: leadRowSchema.parse(raw),
    emails: (outboxResult?.results ?? []).map((row) =>
      outboxRowSchema.parse(row),
    ),
  };
}
