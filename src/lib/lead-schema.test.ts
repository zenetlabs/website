import { describe, expect, it } from 'vitest';
import { type LeadRequest, leadRequestSchema } from '@/lib/lead-schema';

const VALID: LeadRequest = {
  source: 'form',
  locale: 'es',
  name: 'Ada Lovelace',
  email: 'ada@example.com',
  company: 'Analytical Engines',
  message: 'We would like to automate our inbox triage.',
  consent: true,
  turnstileToken: 'token',
  website: '',
  attribution: { landing: '/?utm_source=x', referrer: '', page: '/' },
};

describe('leadRequestSchema', () => {
  it('accepts a valid submission without a company', () => {
    const { company: _company, ...rest } = VALID;
    expect(leadRequestSchema.safeParse(rest).success).toBe(true);
  });

  it('lowercases and trims the email', () => {
    const parsed = leadRequestSchema.parse({
      ...VALID,
      email: '  Ada.Lovelace@Example.COM ',
    });
    expect(parsed.email).toBe('ada.lovelace@example.com');
  });

  it.each([
    ['missing consent', { consent: false }],
    ['a bad email', { email: 'not-an-email' }],
    ['an overlong message', { message: 'x'.repeat(5001) }],
    ['a short message', { message: 'too short' }],
    ['a newline in the name', { name: 'Ada\nBcc: evil@example.com' }],
    ['a control character in the company', { company: 'Acme\u0007' }],
    ['a C1 control in the name', { name: 'Ada\u0085Lovelace' }],
    ['a line separator in the name', { name: 'Ada\u2028Lovelace' }],
    ['a bidi override in the company', { company: 'Acme\u202E' }],
    ['an Arabic letter mark in the name', { name: 'Ada\u061CLovelace' }],
    ['a left-to-right mark in the company', { company: 'Acme\u200E' }],
    ['a right-to-left mark in the name', { name: 'Ada\u200FLovelace' }],
    ['an empty name', { name: '   ' }],
    ['an unknown locale', { locale: 'fr' }],
    ['an empty token', { turnstileToken: '' }],
    ['an overlong honeypot', { website: 'x'.repeat(201) }],
    ['a source other than form', { source: 'calculator' }],
    ['a missing source', { source: undefined }],
  ])('rejects %s', (_label, patch) => {
    expect(leadRequestSchema.safeParse({ ...VALID, ...patch }).success).toBe(
      false,
    );
  });

  it.each([
    ['an empty landing', { landing: '' }, true],
    ['a landing with a query', { landing: '/es?utm_source=a&gclid=b' }, true],
    [
      'a newline in the landing',
      { landing: '/a\nBcc: evil@example.com' },
      false,
    ],
    ['a carriage return in the page', { page: '/a\rX: y' }, false],
    [
      'a newline in the referrer',
      { referrer: 'https://a.example/\nBcc: x' },
      false,
    ],
    ['a backslash after the slash', { landing: '/\\evil.example' }, false],
    ['a protocol-relative landing', { landing: '//evil.example/x' }, false],
    ['an absolute landing', { landing: 'https://evil.example/' }, false],
    ['an overlong landing', { landing: `/${'a'.repeat(2048)}` }, false],
    ['an empty referrer', { referrer: '' }, true],
    ['an overlong referrer', { referrer: 'h'.repeat(2049) }, false],
    ['an absolute page', { page: 'https://evil.example/' }, false],
    ['a root page', { page: '/' }, true],
  ])('attribution: %s', (_label, patch, ok) => {
    const result = leadRequestSchema.safeParse({
      ...VALID,
      attribution: { ...VALID.attribution, ...patch },
    });
    expect(result.success).toBe(ok);
  });

  it('rejects a missing attribution', () => {
    const { attribution: _attribution, ...rest } = VALID;
    expect(leadRequestSchema.safeParse(rest).success).toBe(false);
  });
});
