import { describe, expect, it } from 'vitest';
import { emailKey } from '@/server/email-key';

describe('emailKey', () => {
  it.each([
    ['Ada@Example.com', 'ada@example.com'],
    ['ada+news@example.com', 'ada@example.com'],
    ['a.da@example.com', 'a.da@example.com'],
    ['a.d.a+x@gmail.com', 'ada@gmail.com'],
    ['ADA.Lovelace@googlemail.com', 'adalovelace@gmail.com'],
    ['+ada@example.com', '+ada@example.com'],
    ['not-an-address', 'not-an-address'],
  ])('%s counts as %s', (email, key) => {
    expect(emailKey(email)).toBe(key);
  });
});
