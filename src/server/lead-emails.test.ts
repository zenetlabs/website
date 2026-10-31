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
