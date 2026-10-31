import { legalEntity } from '@/lib/content';
import type { Locale } from '@/lib/i18n';
import { PUBLIC_EMAIL } from '@/lib/site';
import { isoTime, prettyJson } from '@/server/format';
import type { LeadRow } from '@/server/lead-store';
import type { OutgoingEmail } from '@/server/resend';

const FROM = 'Zenet Labs <noreply@zenetlabs.com>';

function orDash(value: string | null): string {
  return value === null || value === '' ? '-' : value;
}

export function ownerSubject(lead: LeadRow): string {
  const company = lead.company ? ` — ${lead.company}` : '';
  const test = lead.is_test === 1 ? '[TEST] ' : '';
  return `${test}[Lead ${lead.locale.toUpperCase()}] ${lead.name}${company} — ${lead.source}`;
}

export function ownerEmail(
  lead: LeadRow,
  { notifyTo, siteUrl }: { notifyTo: string; siteUrl: string },
): OutgoingEmail {
  const link = `${siteUrl}/internal/leads/${lead.id}`;
  const lines = [
    `New lead (${lead.source}, ${lead.locale})`,
    '',
    `Name: ${lead.name}`,
    `Email: ${lead.email}`,
    `Company: ${orDash(lead.company)}`,
    '',
    'Message:',
    lead.message,
    '',
    `Landing page: ${orDash(lead.landing_page)}`,
    `Submitted from: ${orDash(lead.submit_page)}`,
    `Referrer: ${orDash(lead.referrer)}`,
    `UTM: source=${orDash(lead.utm_source)} · medium=${orDash(lead.utm_medium)} · campaign=${orDash(lead.utm_campaign)} · term=${orDash(lead.utm_term)} · content=${orDash(lead.utm_content)}`,
    `gclid: ${orDash(lead.gclid)}`,
    '',
    `Consent: ${lead.consent_version} at ${isoTime(lead.consent_at)}`,
    `Received: ${isoTime(lead.created_at)}`,
    `Test lead: ${lead.is_test === 1 ? 'yes' : 'no'}`,
    `Lead: ${link}`,
  ];
  if (lead.chat_session_id) lines.push(`Conversation: ${link}#conversation`);
  if (lead.context) lines.push('Context:', prettyJson(lead.context));
  return {
    from: FROM,
    to: notifyTo,
    replyTo: lead.email,
    subject: ownerSubject(lead),
    text: lines.join('\n'),
  };
}

const CONFIRMATION: Record<
  Locale,
  {
    subject: string;
    body: (parts: { legalName: string; siteUrl: string }) => string[];
  }
> = {
  en: {
    subject: 'We have your message | Zenet Labs',
    body: ({ legalName, siteUrl }) => [
      'Hello,',
      '',
      'Thank you for contacting Zenet Labs. We have received your message and will reply personally to this address, usually within two working days.',
      '',
      'Next step: we read every message ourselves. If your enquiry is a good fit, we will suggest a short call to agree the scope of an automation diagnostic. To add anything, just reply to this email.',
      '',
      `Zenet Labs · ${legalName}`,
      siteUrl,
      '',
      'You are receiving this email because this address was entered in the contact form on zenetlabs.com. If that was not you, ignore this email: we will not write again unless you reply.',
    ],
  },
  es: {
    subject: 'Hemos recibido tu mensaje | Zenet Labs',
    body: ({ legalName, siteUrl }) => [
      'Hola:',
      '',
      'Gracias por escribir a Zenet Labs. Hemos recibido tu mensaje y te responderemos personalmente a esta dirección, normalmente en un plazo de dos días laborables.',
      '',
      'Siguiente paso: leemos cada mensaje personalmente. Si tu consulta encaja, te propondremos una llamada breve para acordar el alcance de un diagnóstico de automatización. Si quieres añadir algo, responde a este correo.',
      '',
      `Zenet Labs · ${legalName}`,
      siteUrl,
      '',
      'Recibes este correo porque alguien ha escrito esta dirección en el formulario de contacto de zenetlabs.com. Si no has sido tú, ignóralo: no volveremos a escribirte salvo que respondas.',
    ],
  },
};

// TODO(albert): review the confirmation copy and the two-working-days promise
export function confirmationEmail(
  lead: LeadRow,
  { siteUrl }: { siteUrl: string },
): OutgoingEmail {
  const copy = CONFIRMATION[lead.locale];
  const localeUrl =
    lead.locale === 'en' ? siteUrl : `${siteUrl}/${lead.locale}`;
  return {
    from: FROM,
    to: lead.email,
    replyTo: PUBLIC_EMAIL,
    subject: copy.subject,
    text: copy
      .body({
        legalName: legalEntity(lead.locale).legalName,
        siteUrl: localeUrl,
      })
      .join('\n'),
  };
}
