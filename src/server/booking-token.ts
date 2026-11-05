import { z } from 'zod';
import { toHex } from '@/lib/hex';
import { sameBytes, sha256 } from '@/server/secret-compare';

// `<booking-id>.<secret>`: the id selects the row, the secret proves the link.
// Only SHA-256(secret) is stored, so a database read cannot rebuild a link.
// The secret is an HMAC of the email that carries it, keyed with a server
// secret: a retry of that email rebuilds the same link and the same message,
// so Resend's idempotency holds and an earlier copy never stops working.
export type BookingToken = { id: string; secret: string };

const SECRET = /^[A-Za-z0-9_-]{43}$/;
const HASH = /^[0-9a-f]{64}$/;
const ID = z.uuid();

function base64url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replace(/=+$/, '');
}

const encoder = new TextEncoder();

// `label` names one email: `verify|<booking-email-id>` or `cancel|<outbox-id>`.
export async function deriveSecret(
  key: string,
  label: string,
): Promise<string> {
  const hmac = await crypto.subtle.importKey(
    'raw',
    encoder.encode(key),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  return base64url(
    new Uint8Array(
      await crypto.subtle.sign('HMAC', hmac, encoder.encode(label)),
    ),
  );
}

export function formatToken({ id, secret }: BookingToken): string {
  return `${id}.${secret}`;
}

export function parseToken(raw: unknown): BookingToken | null {
  if (typeof raw !== 'string' || raw.length > 100) return null;
  const dot = raw.indexOf('.');
  if (dot < 0) return null;
  const id = ID.safeParse(raw.slice(0, dot));
  const secret = raw.slice(dot + 1);
  if (!id.success || !SECRET.test(secret)) return null;
  return { id: id.data, secret };
}

export async function hashSecret(secret: string): Promise<string> {
  return toHex(await sha256(secret));
}

function fromHex(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Number.parseInt(hex.slice(index * 2, index * 2 + 2), 16);
  }
  return bytes;
}

// The presented secret against the stored hash, in constant time. A row with no
// hash (never sent, or from before 0006) matches nothing.
export async function secretMatches(
  secret: string,
  stored: string | null,
): Promise<boolean> {
  const presented = await sha256(secret);
  if (stored === null || !HASH.test(stored)) return false;
  return sameBytes(presented, fromHex(stored));
}
