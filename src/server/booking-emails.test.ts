import { describe, expect, it } from 'vitest';
import { cancelledEmail, verifyEmail } from '@/server/booking-emails';

const START = Date.UTC(2027, 0, 12, 9, 0);
const TOKEN = `0b3c5f4e-1111-4222-8333-444455556666.${'a'.repeat(6)}`;

function booking(locale: 'en' | 'es', origin = 'https://zenetlabs.com') {
  return {
    locale,
    email: 'ada@example.com',
    start: START,
    timeZone: 'Asia/Singapore',
    origin,
    expiresAt: Date.UTC(2027, 0, 4, 8, 30),
  };
}

describe('the verify email', () => {
  it('writes the English golden with the link to the request origin', () => {
    const mail = verifyEmail(booking('en'), TOKEN);
    expect(mail).toMatchObject({
      from: 'Zenet Labs <noreply@zenetlabs.com>',
      to: 'ada@example.com',
      replyTo: 'hello@zenetlabs.com',
      subject: 'Confirm your call with Zenet Labs: Tuesday 12 January, 5:00 pm',
    });
    expect(mail.text).toBe(
      [
        'Hello,',
        '',
        'To book your 30-minute call with Zenet Labs (Tuesday 12 January, 5:00 pm, Asia/Singapore), confirm it here before 4:30 pm:',
        `https://zenetlabs.com/book?confirm=${TOKEN}`,
        '',
        "Until then we keep the time for you. If you don't confirm, it is released and nothing else happens.",
        '',
        'Zenet Labs · Zenet Technology Pte. Ltd.',
        'https://zenetlabs.com',
        '',
        "You are receiving this email because this address was entered to book a call on zenetlabs.com. If that wasn't you, ignore it: no call is booked and we won't write again.",
      ].join('\n'),
    );
  });

  it('writes Spanish and points a preview alias at itself', () => {
    const preview = 'https://pr-5-prod-zenet-web.zenetlabs.workers.dev';
    const mail = verifyEmail(booking('es', preview), TOKEN);
    expect(mail.subject).toBe(
      'Confirma tu llamada con Zenet Labs: martes 12 de enero, 17:00',
    );
    expect(mail.text).toContain(`${preview}/es/reservar?confirm=${TOKEN}`);
    expect(mail.text).toContain(`${preview}/es`);
    expect(mail.text).toContain('Si no has sido tú, ignóralo');
    expect(mail.text).toContain('confírmala aquí antes de las 16:30:');
  });
});

describe('the cancelled email', () => {
  it.each([
    [
      'en',
      'Cancelled: your call with Zenet Labs, Tuesday 12 January, 5:00 pm',
      '/book',
    ],
    [
      'es',
      'Cancelada: tu llamada con Zenet Labs, martes 12 de enero, 17:00',
      '/es/reservar',
    ],
  ] as const)(
    'writes %s with a link to pick another time',
    (locale, subject, path) => {
      const mail = cancelledEmail(booking(locale));
      expect(mail.subject).toBe(subject);
      expect(mail.text).toContain(`https://zenetlabs.com${path}`);
      expect(mail.replyTo).toBe('hello@zenetlabs.com');
    },
  );
});

describe('visitor emails', () => {
  it('only ever carry fixed copy, the slot and our links', () => {
    for (const locale of ['en', 'es'] as const) {
      for (const mail of [
        verifyEmail(booking(locale), TOKEN),
        cancelledEmail(booking(locale)),
      ]) {
        const links = mail.text.match(/https?:\/\/\S+/g) ?? [];
        for (const link of links) {
          expect(new URL(link).origin).toBe('https://zenetlabs.com');
        }
        expect(mail.text).not.toMatch(/Ada|Analytical|inbox/);
      }
    }
  });
});
