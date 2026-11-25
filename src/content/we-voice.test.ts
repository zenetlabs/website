import { describe, expect, it } from 'vitest';
import { chatCopy as enChat } from '@/content/en/chat';
import { meet as enMeet } from '@/content/en/meet';
import { chatCopy as esChat } from '@/content/es/chat';
import { meet as esMeet } from '@/content/es/meet';
import en from '@/i18n/en.json';
import es from '@/i18n/es.json';
import { CONTENT } from '@/lib/content';
import { locales } from '@/lib/i18n';
import { buildLlmsFull } from '@/lib/llms';
import { cancelledEmail, verifyEmail } from '@/server/booking-emails';
import { staticPrompt } from '@/server/chat/prompt';
import { confirmationEmail, ownerEmail } from '@/server/lead-emails';
import voiceAgents from '../../elevenlabs/voice-agents.generated.json';
import { LEAD_ROW } from '../../test/leads';
import { SOLO_SIGNALS, soloHits } from '../../test/we-voice';

const modules = import.meta.glob<Record<string, unknown>>(
  ['./{en,es}/**/*.ts', '!./**/*.test.ts'],
  { eager: true },
);

function strings(value: unknown): string[] {
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value.flatMap(strings);
  if (value !== null && typeof value === 'object')
    return Object.values(value).flatMap(strings);
  return [];
}

const sources = [
  ...Object.entries(modules).map(([file, exports]) => ({
    file,
    texts: strings(exports),
  })),
  { file: 'i18n/en.json', texts: strings(en) },
  { file: 'i18n/es.json', texts: strings(es) },
];

describe('we-voice copy', () => {
  it('scans the home, about and faq modules of both locales', () => {
    const files = sources.filter(({ texts }) => texts.length > 0);
    for (const name of ['home', 'about', 'faq']) {
      for (const locale of locales) {
        expect(
          files.some(({ file }) => file === `./${locale}/${name}.ts`),
          `${locale}/${name}`,
        ).toBe(true);
      }
    }
  });

  it('catches a solo signal in a fixture', () => {
    for (const fixture of [
      'We reply personally.',
      'Te respondo personalmente.',
      'For companies of 10 to 100 people',
      'Para pymes de 10-100 personas',
      'a small studio',
      'works directly with every client',
    ]) {
      expect(soloHits('fixture', [fixture]), fixture).not.toEqual([]);
    }
    expect(SOLO_SIGNALS.length).toBeGreaterThan(0);
  });

  it('does not flag larger numbers that contain 10 and 100', () => {
    for (const fixture of ['110 to 1000 orders', 'de 10 a 1000 pedidos']) {
      expect(soloHits('fixture', [fixture]), fixture).toEqual([]);
    }
  });

  it('keeps the content sources free of solo signals', () => {
    expect(sources.flatMap(({ file, texts }) => soloHits(file, texts))).toEqual(
      [],
    );
  });

  it.each(locales)(
    'keeps the llms-full text free of them (%s)',
    async (locale) => {
      expect(soloHits('llms-full', [await buildLlmsFull(locale)])).toEqual([]);
    },
  );

  it.each(locales)('keeps the lead emails free of them (%s)', (locale) => {
    const START = Date.UTC(2026, 10, 3, 9, 0);
    const booked = {
      ...LEAD_ROW,
      locale,
      source: 'booking' as const,
      context: JSON.stringify({
        booking: {
          id: 'b1',
          start: START,
          end: START + 1_800_000,
          timeZone: 'Asia/Singapore',
          channel: 'web',
          status: 'confirmed',
          meetUrl: 'https://meet.google.com/abc-defg-hij',
          eventLink: 'https://calendar.google.com/event?eid=1',
          calendar: 'main',
        },
      }),
    };
    const siteUrl = 'https://zenetlabs.com';
    const owner = { notifyTo: 'owner@example.com', siteUrl };
    const texts = [
      confirmationEmail({ ...LEAD_ROW, locale }, { siteUrl }),
      confirmationEmail(booked, { siteUrl }),
      ownerEmail({ ...LEAD_ROW, locale }, owner),
      ownerEmail(booked, owner),
    ].flatMap((email) => [email.subject, email.text]);
    expect(texts.every((text) => text.length > 0)).toBe(true);
    expect(soloHits('lead email', texts)).toEqual([]);
  });

  it.each(locales)('keeps the booking emails free of them (%s)', (locale) => {
    const visitor = {
      locale,
      email: 'ada@example.com',
      start: Date.UTC(2026, 10, 3, 9, 0),
      timeZone: 'Asia/Singapore',
      origin: 'https://zenetlabs.com',
      expiresAt: Date.UTC(2026, 10, 3, 8, 0),
    };
    const texts = [
      verifyEmail(visitor, 'id.secret'),
      cancelledEmail(visitor),
    ].flatMap((email) => [email.subject, email.text]);
    expect(texts.every((text) => text.length > 0)).toBe(true);
    expect(soloHits('booking email', texts)).toEqual([]);
  });

  it.each(locales)('keeps the chat prompt free of them (%s)', (locale) => {
    for (const booking of [true, false]) {
      const prompt = staticPrompt(locale, [], '', { booking, estimate: true });
      expect(soloHits('chat prompt', [prompt])).toEqual([]);
    }
  });

  it('keeps the generated voice agents free of them', () => {
    expect(soloHits('voice agents', strings(voiceAgents))).toEqual([]);
  });

  it('names no person on the booking line and the chat hand-off', () => {
    for (const [line, locale] of [
      [enMeet, 'en'],
      [esMeet, 'es'],
      [enChat.person.text, 'en'],
      [esChat.person.text, 'es'],
    ] as const) {
      expect(line).not.toContain(CONTENT[locale].founder.name);
    }
  });
});
