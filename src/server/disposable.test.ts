// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { isDisposable } from '@/server/disposable';
import { DISPOSABLE_DOMAINS } from '@/server/disposable-domains.generated';

const LIST = DISPOSABLE_DOMAINS.split('\n');

describe('the vendored disposable-domain list', () => {
  it('is a real list, sorted, deduplicated and lowercase', () => {
    expect(LIST.length).toBeGreaterThanOrEqual(5_000);
    expect(LIST).toContain('mailinator.com');
    expect(new Set(LIST).size).toBe(LIST.length);
    expect([...LIST].sort()).toEqual(LIST);
    expect(LIST.every((domain) => domain === domain.toLowerCase())).toBe(true);
  });

  it.each([
    'gmail.com',
    'googlemail.com',
    'outlook.com',
    'hotmail.com',
    'hotmail.es',
    'live.com',
    'yahoo.com',
    'yahoo.es',
    'icloud.com',
    'proton.me',
    'protonmail.com',
    'gmx.com',
    'gmx.es',
    'telefonica.net',
    'zenetlabs.com',
  ])('never lists %s', (domain) => {
    expect(LIST).not.toContain(domain);
  });
});

describe('isDisposable', () => {
  it('matches the domain and any parent of it, in any case', async () => {
    expect(await isDisposable('a@mailinator.com')).toBe(true);
    expect(await isDisposable('a@x.mailinator.com')).toBe(true);
    expect(await isDisposable('a@MAILINATOR.COM')).toBe(true);
  });

  it('lets real mailboxes through', async () => {
    expect(await isDisposable('ada@gmail.com')).toBe(false);
    expect(await isDisposable('ada@example.com')).toBe(false);
    expect(await isDisposable('ada@mailinator.com.example')).toBe(false);
  });
});
