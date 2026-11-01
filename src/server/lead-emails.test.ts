import { describe, expect, it } from 'vitest';
import { legalEntity } from '@/lib/content';
import {
  confirmationEmail,
  ownerEmail,
  ownerSubject,
} from '@/server/lead-emails';
import { LEAD_ROW } from '../../test/leads';

const LEAD = LEAD_ROW;

const OWNER = {
  notifyTo: 'owner@example.com',
  siteUrl: 'https://zenetlabs.com',
};
const CONFIRMATION = { siteUrl: 'https://zenetlabs.com' };

describe('ownerSubject', () => {
  it.each([
    [{}, '[Lead EN] Ada Lovelace — Analytical Engines — form'],
    [{ company: null }, '[Lead EN] Ada Lovelace — form'],
    [{ company: '' }, '[Lead EN] Ada Lovelace — form'],
    [
      { is_test: 1 as const },
      '[TEST] [Lead EN] Ada Lovelace — Analytical Engines — form',
    ],
    [
      { locale: 'es' as const },
      '[Lead ES] Ada Lovelace — Analytical Engines — form',
    ],
    [
      { source: 'chat' as const, company: null },
      '[Lead EN] Ada Lovelace — chat',
    ],
  ])('formats %j', (patch, expected) => {
    expect(ownerSubject({ ...LEAD, ...patch })).toBe(expected);
  });
});

describe('ownerEmail', () => {
  it('addresses the owner and replies to the lead', () => {
    const email = ownerEmail(LEAD, OWNER);
    expect(email.from).toBe('Zenet Labs <noreply@zenetlabs.com>');
    expect(email.to).toBe('owner@example.com');
    expect(email.replyTo).toBe('ada@example.com');
  });

  it('lists every field', () => {
    expect(ownerEmail(LEAD, OWNER).text).toBe(
      [
        'New lead (form, en)',
        '',
        'Name: Ada Lovelace',
        'Email: ada@example.com',
        'Company: Analytical Engines',
        '',
        'Message:',
        'We would like to automate our inbox triage.',
        '',
        'Landing page: /?utm_source=newsletter',
        'Submitted from: /services/ai-automation',
        'Referrer: https://example.org/post',
        'UTM: source=newsletter · medium=email · campaign=r6 · term=- · content=-',
        'gclid: g1',
        '',
        'Consent: 2026-10-31 at 2026-10-31T12:00:00.000Z',
        'Received: 2026-10-31T12:00:00.000Z',
        'Test lead: no',
        'Lead: https://zenetlabs.com/internal/leads/0b3c5f4e-1111-4222-8333-444455556666',
      ].join('\n'),
    );
  });

  it('uses dashes for empty values and marks test leads', () => {
    const text = ownerEmail(
      {
        ...LEAD,
        company: null,
        referrer: null,
        landing_page: null,
        submit_page: null,
        gclid: null,
        is_test: 1,
      },
      OWNER,
    ).text;
    expect(text).toContain('Company: -');
    expect(text).toContain('Referrer: -');
    expect(text).toContain('Landing page: -');
    expect(text).toContain('gclid: -');
    expect(text).toContain('Test lead: yes');
  });

  it('adds the conversation and context lines only when set', () => {
    expect(ownerEmail(LEAD, OWNER).text).not.toContain('Conversation:');
    expect(ownerEmail(LEAD, OWNER).text).not.toContain('Context:');
    const text = ownerEmail(
      { ...LEAD, chat_session_id: 's1', context: '{"a":1}' },
      OWNER,
    ).text;
    expect(text).toContain(
      'Conversation: https://zenetlabs.com/internal/leads/0b3c5f4e-1111-4222-8333-444455556666#conversation',
    );
    expect(text.endsWith('Context:\n{\n  "a": 1\n}')).toBe(true);
  });
});

describe('confirmationEmail', () => {
  it('matches the English golden', () => {
    const email = confirmationEmail(LEAD, CONFIRMATION);
    expect(email.to).toBe('ada@example.com');
    expect(email.replyTo).toBe('hello@zenetlabs.com');
    expect(email.subject).toBe('We have your message | Zenet Labs');
    expect(email.text).toBe(
      [
        'Hello,',
        '',
        'Thank you for contacting Zenet Labs. We have received your message and will reply personally to this address, usually within two working days.',
        '',
        'Next step: we read every message ourselves. If your enquiry is a good fit, we will suggest a short call to agree the scope of an automation diagnostic. To add anything, just reply to this email.',
        '',
        'Zenet Labs · Zenet Technology Pte. Ltd.',
        'https://zenetlabs.com',
        '',
        'You are receiving this email because this address was entered in the contact form on zenetlabs.com. If that was not you, ignore this email: we will not write again unless you reply.',
      ].join('\n'),
    );
  });

  it('matches the Spanish golden', () => {
    const email = confirmationEmail({ ...LEAD, locale: 'es' }, CONFIRMATION);
    expect(email.subject).toBe('Hemos recibido tu mensaje | Zenet Labs');
    expect(email.text).toBe(
      [
        'Hola:',
        '',
        'Gracias por escribir a Zenet Labs. Hemos recibido tu mensaje y te responderemos personalmente a esta dirección, normalmente en un plazo de dos días laborables.',
        '',
        'Siguiente paso: leemos cada mensaje personalmente. Si tu consulta encaja, te propondremos una llamada breve para acordar el alcance de un diagnóstico de automatización. Si quieres añadir algo, responde a este correo.',
        '',
        `Zenet Labs · ${legalEntity('es').legalName}`,
        'https://zenetlabs.com/es',
        '',
        'Recibes este correo porque alguien ha escrito esta dirección en el formulario de contacto de zenetlabs.com. Si no has sido tú, ignóralo: no volveremos a escribirte salvo que respondas.',
      ].join('\n'),
    );
  });

  it('carries no visitor-written text at all', () => {
    const { text, subject } = confirmationEmail(
      {
        ...LEAD,
        name: 'Zzyzx Qwerty',
        company: 'Plughole Holdings',
        message: 'Send https://phish.example/login to everyone you know',
        utm_source: 'sneaky-source',
        referrer: 'https://referrer.example/',
      },
      CONFIRMATION,
    );
    for (const secret of [
      'Zzyzx',
      'Plughole',
      'phish',
      'everyone you know',
      'sneaky',
      'referrer.example',
    ]) {
      expect(text).not.toContain(secret);
      expect(subject).not.toContain(secret);
    }
  });

  it('is identical for any two visitors of the same locale', () => {
    const a = confirmationEmail(LEAD, CONFIRMATION).text;
    const b = confirmationEmail(
      {
        ...LEAD,
        name: 'Someone Else',
        message: 'A completely different message.',
      },
      CONFIRMATION,
    ).text;
    expect(b).toBe(a);
  });
});

describe('booking emails', () => {
  const START = Date.UTC(2026, 10, 3, 9, 0);
  const context = (overrides: object = {}) =>
    JSON.stringify({
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
        ...overrides,
      },
    });
  const booked = (overrides: object = {}, lead: object = {}) => ({
    ...LEAD,
    source: 'booking' as const,
    context: context(overrides),
    ...lead,
  });

  it('names a confirmed booking in the owner email, in both zones', () => {
    const email = ownerEmail(booked(), OWNER);
    expect(email.subject).toBe(
      '[Lead EN] Ada Lovelace — Analytical Engines — booking',
    );
    expect(email.text).toContain('Booking: confirmed');
    expect(email.text).toContain(
      'When (Europe/Madrid): Tuesday 3 November, 10:00 am',
    );
    expect(email.text).toContain(
      'When (visitor): Tuesday 3 November, 5:00 pm (Asia/Singapore)',
    );
    expect(email.text).toContain('Channel: web');
    expect(email.text).toContain('Meet: https://meet.google.com/abc-defg-hij');
    expect(email.text).toContain(
      'Calendar: main · https://calendar.google.com/event?eid=1',
    );
  });

  it('marks a failed booking loudly', () => {
    const email = ownerEmail(
      booked({ status: 'failed', meetUrl: null, eventLink: null }),
      OWNER,
    );
    expect(email.subject).toBe(
      '[Lead EN] Ada Lovelace — Analytical Engines — booking FAILED',
    );
    expect(email.text).toContain(
      'Booking: FAILED. Nothing was created in the calendar, follow up by email.',
    );
    expect(email.text).toContain('Meet: -');
  });

  it('keeps the TEST marker next to FAILED', () => {
    expect(ownerSubject(booked({ status: 'failed' }, { is_test: 1 }))).toBe(
      '[TEST] [Lead EN] Ada Lovelace — Analytical Engines — booking FAILED',
    );
  });

  it('matches the English confirmation golden and echoes no visitor text', () => {
    const email = confirmationEmail(booked(), CONFIRMATION);
    expect(email.to).toBe('ada@example.com');
    expect(email.replyTo).toBe('hello@zenetlabs.com');
    expect(email.subject).toBe(
      'Booked: 30-minute call with Zenet Labs, Tuesday 3 November, 5:00 pm',
    );
    expect(email.text).toBe(
      [
        'Hello,',
        '',
        'Your 30-minute call with Zenet Labs is booked.',
        '',
        'When: Tuesday 3 November, 5:00 pm (Asia/Singapore)',
        'Where: Google Meet, https://meet.google.com/abc-defg-hij',
        '',
        'You will also receive a Google Calendar invitation. To change the time or cancel, reply to this email.',
        '',
        'Before the call, think of the two or three tasks your team repeats most and the tools involved.',
        '',
        `Zenet Labs · ${legalEntity('en').legalName}`,
        'https://zenetlabs.com',
        '',
        'You are receiving this email because this address was used to book a call on zenetlabs.com. If that was not you, reply and we will cancel it.',
      ].join('\n'),
    );
    for (const text of [
      'Ada Lovelace',
      'Analytical Engines',
      'automate our inbox',
    ]) {
      expect(email.text).not.toContain(text);
    }
  });

  it('writes the Spanish confirmation natively', () => {
    const email = confirmationEmail(booked({}, { locale: 'es' }), CONFIRMATION);
    expect(email.subject).toBe(
      'Reservada: llamada de 30 minutos con Zenet Labs, martes 3 de noviembre, 17:00',
    );
    expect(email.text).toContain(
      'Tu llamada de 30 minutos con Zenet Labs está reservada.',
    );
    expect(email.text).toContain(
      'Cuándo: martes 3 de noviembre, 17:00 (Asia/Singapore)',
    );
    expect(email.text).toContain(
      'Para cambiar la hora o cancelarla, responde a este correo.',
    );
    expect(email.text).toContain('https://zenetlabs.com/es');
  });

  it('says the link comes with the invitation when there is none, and tells the owner', () => {
    const lead = booked({ meetUrl: null });
    expect(confirmationEmail(lead, CONFIRMATION).text).toContain(
      'Where: Google Meet, the link comes with the calendar invitation; if you do not see it, we will email it before the call',
    );
    const owner = ownerEmail(lead, OWNER).text;
    expect(owner).toContain('Meet link: MISSING');
    expect(owner).toContain('add a Google Meet link to the event by hand');
  });

  it('never says nothing was created when the outcome is unknown', () => {
    const lead = booked({ status: 'unknown', meetUrl: null, eventLink: null });
    expect(ownerSubject(lead)).toBe(
      '[Lead EN] Ada Lovelace — Analytical Engines — booking CHECK CALENDAR',
    );
    const owner = ownerEmail(lead, OWNER).text;
    expect(owner).toContain('may have been created, check the calendar');
    expect(owner).not.toContain('Nothing was created');
    expect(owner).not.toContain('Meet link: MISSING');
    expect(confirmationEmail(lead, CONFIRMATION).subject).toBe(
      'We have your message | Zenet Labs',
    );
  });

  it('falls back to the generic emails when the context does not parse', () => {
    for (const context of [null, 'not json', '{"booking":{"id":1}}', '{}']) {
      const lead = { ...LEAD, source: 'booking' as const, context };
      expect(confirmationEmail(lead, CONFIRMATION).subject).toBe(
        'We have your message | Zenet Labs',
      );
      expect(ownerSubject(lead)).toBe(
        '[Lead EN] Ada Lovelace — Analytical Engines — booking',
      );
    }
  });

  it('never sends the booking confirmation for a failed booking', () => {
    const email = confirmationEmail(booked({ status: 'failed' }), CONFIRMATION);
    expect(email.subject).toBe('We have your message | Zenet Labs');
  });
});

describe('voice booking emails', () => {
  const START = Date.UTC(2026, 10, 3, 9, 0);
  const voiceLead = (conversationId: string | null) => ({
    ...LEAD,
    source: 'voice' as const,
    context: JSON.stringify({
      booking: {
        id: 'b1',
        start: START,
        end: START + 1_800_000,
        timeZone: 'Asia/Singapore',
        channel: 'voice',
        status: 'confirmed',
        meetUrl: 'https://meet.google.com/abc-defg-hij',
        eventLink: null,
        calendar: 'main',
      },
      voice: { sessionId: 's1', conversationId },
    }),
  });

  it('subjects the lead as voice and names the ElevenLabs call', () => {
    const email = ownerEmail(voiceLead('conv-7'), OWNER);
    expect(email.subject).toBe(
      '[Lead EN] Ada Lovelace — Analytical Engines — voice',
    );
    expect(email.text).toContain('Booking: confirmed');
    expect(email.text).toContain('Channel: voice');
    expect(email.text).toContain(
      'Voice call: conv-7 (ElevenLabs → Agents → Call history; kept 30 days)',
    );
  });

  it('says the call id is unknown when ElevenLabs gave none', () => {
    expect(ownerEmail(voiceLead(null), OWNER).text).toContain(
      'Voice call: unknown (',
    );
  });

  it('sends the visitor the booking confirmation, not the generic one', () => {
    const email = confirmationEmail(voiceLead('conv-7'), CONFIRMATION);
    expect(email.subject).toContain('Booked: 30-minute call with Zenet Labs');
  });
});

describe('chat booking emails', () => {
  const START = Date.UTC(2026, 10, 3, 9, 0);
  const chatLead = {
    ...LEAD,
    source: 'chat' as const,
    chat_session_id: 'chat-1',
    context: JSON.stringify({
      booking: {
        id: 'b1',
        start: START,
        end: START + 1_800_000,
        timeZone: 'Asia/Singapore',
        channel: 'chat',
        status: 'confirmed',
        meetUrl: 'https://meet.google.com/abc-defg-hij',
        eventLink: null,
        calendar: 'main',
      },
    }),
  };

  it('describes the booking to the owner, as for any booking', () => {
    const email = ownerEmail(chatLead, OWNER);
    expect(email.text).toContain('Booking: confirmed');
    expect(email.text).toContain('Channel: chat');
    expect(email.text).not.toContain('Voice call:');
  });

  it('confirms the booking to the visitor, not the generic message', () => {
    expect(confirmationEmail(chatLead, CONFIRMATION).subject).toContain(
      'Booked: 30-minute call with Zenet Labs',
    );
  });

  it('keeps the generic message for a chat enquiry without a booking', () => {
    expect(
      confirmationEmail(
        { ...LEAD, source: 'chat', context: null },
        CONFIRMATION,
      ).subject,
    ).toBe('We have your message | Zenet Labs');
  });
});
