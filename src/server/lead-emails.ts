import type { z } from 'zod';
import { BOOKING_RULES, DEFAULT_ZONE } from '@/content/booking-rules';
import { legalEntity } from '@/lib/content';
import type { Locale } from '@/lib/i18n';
import { PUBLIC_EMAIL } from '@/lib/site';
import { formatSlotLabel } from '@/lib/slot-format';
import {
  type BookingContext,
  bookingContextSchema,
} from '@/server/booking-schema';
import { isoTime, prettyJson } from '@/server/format';
import type { LeadRow } from '@/server/lead-store';
import type { OutgoingEmail } from '@/server/resend';

const FROM = 'Zenet Labs <noreply@zenetlabs.com>';

function orDash(value: string | null): string {
  return value === null || value === '' ? '-' : value;
}

type ParsedContext = z.infer<typeof bookingContextSchema>;

// Booked from the page, the chat or a voice call: the context decides, not the source.
function contextOf(lead: LeadRow): ParsedContext | null {
  if (lead.context === null) return null;
  try {
    const parsed = bookingContextSchema.safeParse(JSON.parse(lead.context));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

function bookingOf(lead: LeadRow): BookingContext | null {
  return contextOf(lead)?.booking ?? null;
}

const SUBJECT_FLAG = {
  confirmed: '',
  failed: ' FAILED',
  unknown: ' CHECK CALENDAR',
} as const;

const STATUS_LINES: Record<BookingContext['status'], string> = {
  confirmed: 'Booking: confirmed',
  failed:
    'Booking: FAILED. Nothing was created in the calendar, follow up by email.',
  unknown:
    'Booking: UNKNOWN. The calendar event may have been created, check the calendar. The slot stays blocked until you set the booking to confirmed or cancelled in D1; follow up by email.',
};

export function ownerSubject(lead: LeadRow): string {
  const company = lead.company ? ` — ${lead.company}` : '';
  const test = lead.is_test === 1 ? '[TEST] ' : '';
  const flag = SUBJECT_FLAG[bookingOf(lead)?.status ?? 'confirmed'];
  return `${test}[Lead ${lead.locale.toUpperCase()}] ${lead.name}${company} — ${lead.source}${flag}`;
}

function bookingLines(booking: BookingContext, locale: Locale): string[] {
  const visitorZone = booking.timeZone ?? DEFAULT_ZONE[locale];
  return [
    '',
    STATUS_LINES[booking.status],
    ...(booking.status === 'confirmed' && booking.meetUrl === null
      ? [
          'Meet link: MISSING. The invitation went out without one; add a Google Meet link to the event by hand.',
        ]
      : []),
    `When (${BOOKING_RULES.zone}): ${formatSlotLabel('en', booking.start, BOOKING_RULES.zone)}`,
    `When (visitor): ${formatSlotLabel('en', booking.start, visitorZone)} (${visitorZone})`,
    `Channel: ${booking.channel}`,
    `Meet: ${orDash(booking.meetUrl)}`,
    `Calendar: ${booking.calendar} · ${orDash(booking.eventLink)}`,
  ];
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
  const context = contextOf(lead);
  if (context) lines.push(...bookingLines(context.booking, lead.locale));
  if (context?.voice) {
    lines.push(
      `Voice call: ${context.voice.conversationId ?? 'unknown'} (ElevenLabs → Agents → Call history; kept 30 days)`,
    );
  }
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

const BOOKING_CONFIRMATION: Record<
  Locale,
  {
    subject: (label: string) => string;
    body: (parts: {
      label: string;
      zone: string;
      meet: string;
      legalName: string;
      siteUrl: string;
    }) => string[];
  }
> = {
  en: {
    subject: (label) => `Booked: 30-minute call with Zenet Labs, ${label}`,
    body: ({ label, zone, meet, legalName, siteUrl }) => [
      'Hello,',
      '',
      'Your 30-minute call with Zenet Labs is booked.',
      '',
      `When: ${label} (${zone})`,
      `Where: ${meet}`,
      '',
      'You will also receive a Google Calendar invitation. To change the time or cancel, reply to this email.',
      '',
      'Before the call, think of the two or three tasks your team repeats most and the tools involved.',
      '',
      `Zenet Labs · ${legalName}`,
      siteUrl,
      '',
      'You are receiving this email because this address was used to book a call on zenetlabs.com. If that was not you, reply and we will cancel it.',
    ],
  },
  es: {
    subject: (label) =>
      `Reservada: llamada de 30 minutos con Zenet Labs, ${label}`,
    body: ({ label, zone, meet, legalName, siteUrl }) => [
      'Hola:',
      '',
      'Tu llamada de 30 minutos con Zenet Labs está reservada.',
      '',
      `Cuándo: ${label} (${zone})`,
      `Dónde: ${meet}`,
      '',
      'También recibirás una invitación de Google Calendar. Para cambiar la hora o cancelarla, responde a este correo.',
      '',
      'Antes de la llamada, piensa en las dos o tres tareas que más repite tu equipo y en las herramientas que intervienen.',
      '',
      `Zenet Labs · ${legalName}`,
      siteUrl,
      '',
      'Recibes este correo porque alguien ha usado esta dirección para reservar una llamada en zenetlabs.com. Si no has sido tú, responde y la cancelaremos.',
    ],
  },
};

const MEET_LATER: Record<Locale, string> = {
  en: 'Google Meet, the link comes with the calendar invitation; if you do not see it, we will email it before the call',
  es: 'Google Meet, el enlace va en la invitación del calendario; si no lo ves, te lo enviaremos antes de la llamada',
};

// TODO(albert): review the booking confirmation copy
function bookingConfirmation(
  lead: LeadRow,
  booking: BookingContext,
  siteUrl: string,
): OutgoingEmail {
  const copy = BOOKING_CONFIRMATION[lead.locale];
  const zone = booking.timeZone ?? DEFAULT_ZONE[lead.locale];
  const label = formatSlotLabel(lead.locale, booking.start, zone);
  return {
    from: FROM,
    to: lead.email,
    replyTo: PUBLIC_EMAIL,
    subject: copy.subject(label),
    text: copy
      .body({
        label,
        zone,
        meet: booking.meetUrl
          ? `Google Meet, ${booking.meetUrl}`
          : MEET_LATER[lead.locale],
        legalName: legalEntity(lead.locale).legalName,
        siteUrl: lead.locale === 'en' ? siteUrl : `${siteUrl}/${lead.locale}`,
      })
      .join('\n'),
  };
}

// TODO(albert): review the confirmation copy and the two-working-days promise
export function confirmationEmail(
  lead: LeadRow,
  { siteUrl }: { siteUrl: string },
): OutgoingEmail {
  const booking = bookingOf(lead);
  if (booking?.status === 'confirmed') {
    return bookingConfirmation(lead, booking, siteUrl);
  }
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
