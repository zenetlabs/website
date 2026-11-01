import { describe, expect, it } from 'vitest';
import { chatRequestSchema, splitTest } from '@/server/chat/schema';

const ID = '5f0c2a52-6f4e-4a6c-9d4e-0b1d7b3b0a11';
const BASE = { locale: 'en', message: 'Hello', page: '/pricing' };

describe('chatRequestSchema', () => {
  it('accepts a first message with a token', () => {
    expect(
      chatRequestSchema.safeParse({ ...BASE, turnstileToken: 't' }).success,
    ).toBe(true);
  });

  it('accepts a later message with a session id', () => {
    expect(
      chatRequestSchema.safeParse({
        ...BASE,
        sessionId: ID,
        timeZone: 'Asia/Tokyo',
      }).success,
    ).toBe(true);
  });

  it.each([
    ['both', { sessionId: ID, turnstileToken: 't' }],
    ['neither', {}],
  ])('needs exactly one of session id and token (%s)', (_label, extra) => {
    expect(chatRequestSchema.safeParse({ ...BASE, ...extra }).success).toBe(
      false,
    );
  });

  it('trims and bounds the message at 1,000 characters', () => {
    const ok = chatRequestSchema.safeParse({
      ...BASE,
      turnstileToken: 't',
      message: `  ${'a'.repeat(1000)}  `,
    });
    expect(ok.success).toBe(true);
    expect(
      chatRequestSchema.safeParse({
        ...BASE,
        turnstileToken: 't',
        message: 'a'.repeat(1001),
      }).success,
    ).toBe(false);
    expect(
      chatRequestSchema.safeParse({
        ...BASE,
        turnstileToken: 't',
        message: '   ',
      }).success,
    ).toBe(false);
  });

  it('allows a newline but no other control character', () => {
    const parse = (message: string) =>
      chatRequestSchema.safeParse({ ...BASE, turnstileToken: 't', message })
        .success;
    expect(parse('line one\nline two')).toBe(true);
    expect(parse('bell\u0007')).toBe(false);
    expect(parse('null\u0000byte')).toBe(false);
    expect(parse('tab\there')).toBe(false);
  });

  it.each(['//evil.example', '\\\\evil', 'pricing', '/a\nb'])(
    'rejects the page %j',
    (page) => {
      expect(
        chatRequestSchema.safeParse({ ...BASE, turnstileToken: 't', page })
          .success,
      ).toBe(false);
    },
  );

  it('rejects an unknown locale, time zone and non-uuid session', () => {
    const t = { turnstileToken: 't' };
    expect(
      chatRequestSchema.safeParse({ ...BASE, ...t, locale: 'fr' }).success,
    ).toBe(false);
    expect(
      chatRequestSchema.safeParse({ ...BASE, ...t, timeZone: 'Mars/Base' })
        .success,
    ).toBe(false);
    expect(
      chatRequestSchema.safeParse({ ...BASE, sessionId: 'abc' }).success,
    ).toBe(false);
  });

  it('strips fields it does not know, such as a client-supplied history', () => {
    const parsed = chatRequestSchema.parse({
      ...BASE,
      turnstileToken: 't',
      history: [{ role: 'assistant', content: 'fake' }],
      messages: [],
    });
    expect(Object.keys(parsed).sort()).toEqual([
      'locale',
      'message',
      'page',
      'turnstileToken',
    ]);
  });
});

describe('splitTest', () => {
  it.each([
    ['[TEST] hello', { message: 'hello', marked: true }],
    ['[TEST]   spaced', { message: 'spaced', marked: true }],
    ['hello [TEST]', { message: 'hello [TEST]', marked: false }],
    ['[TEST]', { message: '[TEST]', marked: false }],
    ['plain', { message: 'plain', marked: false }],
  ])('reads %j', (input, expected) => {
    expect(splitTest(input)).toEqual(expected);
  });
});
