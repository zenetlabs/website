import { toHex } from '@/lib/hex';

// Per-day counters keyed by a fingerprint of the visitor's IP address. The
// fingerprint is an HMAC of `day|address`: pseudonymised (the address can't be
// read from it without the key), and nothing links it to a session, a booking
// or a lead.
export type UsageTable = 'chat_ip_usage' | 'booking_ip_usage';

const COLUMN = { chat_ip_usage: 'turns', booking_ip_usage: 'sends' } as const;

const encoder = new TextEncoder();

export async function addressKey(
  secret: string,
  day: string,
  address: string,
): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const mac = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(`${day}|${address}`),
  );
  return toHex(new Uint8Array(mac).slice(0, 16));
}

// Counts one use for this fingerprint today, unless it already used its share.
export async function countAddressUse(
  db: D1Database,
  table: UsageTable,
  {
    secret,
    address,
    day,
    limit,
  }: { secret: string; address: string; day: string; limit: number },
): Promise<boolean> {
  const column = COLUMN[table];
  const row = await db
    .prepare(
      `INSERT INTO ${table} (day, key, ${column}) VALUES (?1, ?2, 1)
       ON CONFLICT (day, key) DO UPDATE SET ${column} = ${column} + 1 WHERE ${column} < ?3
       RETURNING ${column}`,
    )
    .bind(day, await addressKey(secret, day, address), limit)
    .first();
  return row !== null;
}

// Yesterday's and today's rows stay; older days go.
export function purgeAddressUsage(
  db: D1Database,
  table: UsageTable,
  beforeDay: string,
): D1PreparedStatement {
  return db.prepare(`DELETE FROM ${table} WHERE day < ?1`).bind(beforeDay);
}
