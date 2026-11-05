// @vitest-environment node
import { describe, expect, it } from 'vitest';
import {
  deriveSecret,
  formatToken,
  hashSecret,
  parseToken,
  secretMatches,
} from '@/server/booking-token';

const ID = '0b3c5f4e-1111-4222-8333-444455556666';

describe('booking tokens', () => {
  it('derives 32 bytes as base64url, the same for the same email and key', async () => {
    const secret = await deriveSecret('key', 'verify|email-1');
    expect(secret).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(await deriveSecret('key', 'verify|email-1')).toBe(secret);
    expect(await deriveSecret('key', 'verify|email-2')).not.toBe(secret);
    expect(await deriveSecret('other', 'verify|email-1')).not.toBe(secret);
    expect(await deriveSecret('key', 'cancel|email-1')).not.toBe(secret);
    const token = formatToken({ id: ID, secret });
    expect(parseToken(token)).toEqual({ id: ID, secret });
  });

  it.each([
    undefined,
    '',
    ID,
    `${ID}.`,
    `${ID}.short`,
    `not-a-uuid.${'A'.repeat(43)}`,
    `${ID}.${'A'.repeat(42)}=`,
    `${ID}.${'A'.repeat(43)}.extra`,
    `${ID}.${'A'.repeat(200)}`,
  ])('refuses %j', (raw) => {
    expect(parseToken(raw)).toBeNull();
  });

  it('stores only the hex SHA-256 and matches it in constant time', async () => {
    const secret = await deriveSecret('key', 'verify|a');
    const hash = await hashSecret(secret);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(await secretMatches(secret, hash)).toBe(true);
    expect(
      await secretMatches(await deriveSecret('key', 'verify|b'), hash),
    ).toBe(false);
    expect(await secretMatches(secret, null)).toBe(false);
    expect(await secretMatches(secret, 'not-a-hash')).toBe(false);
  });
});
